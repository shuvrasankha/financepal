// Expense.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  FlatList, 
  Alert, 
  ActivityIndicator, 
  Modal,
  Platform
} from 'react-native';
import { getFirestore, collection, addDoc, getDocs, query, where, deleteDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { auth, db } from '../firebase';
import styles from '../styles/ExpenseStyles';

const CATEGORIES = [
  'Food',
  'Transport',
  'Shopping',
  'Bills',
  'Entertainment',
  'Health',
  'Education',
  'Others',
];

const Expense = () => {
  // State for editing expense
  const [isEditing, setIsEditing] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  // UI state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showMonthView, setShowMonthView] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Expense data state
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  
  // Date handling state
  const [expenseDate, setExpenseDate] = useState(new Date());
  const [viewDate, setViewDate] = useState(new Date());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [showExpenseDatePicker, setShowExpenseDatePicker] = useState(false);
  const [showViewDatePicker, setShowViewDatePicker] = useState(false);
  
  // Expenses data
  const [expenses, setExpenses] = useState([]);
  const [monthlyExpenses, setMonthlyExpenses] = useState([]);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [categorySummary, setCategorySummary] = useState({});
  
  // User state
  const [userId, setUserId] = useState(null);
  
  const navigation = useNavigation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log('Authenticated user:', user.uid);
        setUserId(user.uid);
        fetchExpenses();
      } else {
        console.log('No user is signed in. Redirecting to login...');
        navigation.replace('Login');
        setUserId(null);
        setExpenses([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (userId) {
      if (showMonthView) {
        fetchMonthlyExpenses();
      } else {
        fetchExpenses();
      }
    }
  }, [viewDate, userId, showMonthView, viewMonth, viewYear]);

  const fetchExpenses = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.error('User is not authenticated. Cannot fetch expenses.');
        return;
      }

      const selectedDateStr = viewDate.toISOString().split('T')[0];
      console.log('Fetching expenses for date:', selectedDateStr);

      const expensesRef = collection(db, 'expenses');
      const q = query(
        expensesRef,
        where('userId', '==', currentUser.uid),
        where('date', '==', selectedDateStr)
      );

      const querySnapshot = await getDocs(q);
      const expenseData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      console.log('Fetched expenses:', expenseData);
      setExpenses(expenseData);
    } catch (error) {
      console.error('Error fetching expenses:', error.message);
      Alert.alert('Error', 'Failed to fetch expenses. Please try again.');
    }
  };

  const fetchMonthlyExpenses = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.error('User is not authenticated. Cannot fetch expenses.');
        return;
      }

      // Create date range for the selected month
      const startDate = new Date(viewYear, viewMonth, 1);
      const endDate = new Date(viewYear, viewMonth + 1, 0);
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      console.log(`Fetching expenses for month: ${viewMonth + 1}/${viewYear} (${startDateStr} to ${endDateStr})`);

      const expensesRef = collection(db, 'expenses');
      const q = query(
        expensesRef,
        where('userId', '==', currentUser.uid)
      );

      const querySnapshot = await getDocs(q);
      const allExpenses = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      // Filter expenses for the selected month
      const monthlyExpenseData = allExpenses.filter(expense => {
        const expenseDate = expense.date;
        return expenseDate >= startDateStr && expenseDate <= endDateStr;
      });

      // Sort by date (newest first)
      monthlyExpenseData.sort((a, b) => b.date.localeCompare(a.date));
      
      console.log('Fetched monthly expenses:', monthlyExpenseData);
      setMonthlyExpenses(monthlyExpenseData);
      
      // Calculate total
      const total = monthlyExpenseData.reduce((sum, expense) => sum + expense.amount, 0);
      setMonthlyTotal(total);
      
      // Calculate category summary
      const summary = {};
      monthlyExpenseData.forEach(expense => {
        const cat = expense.category || 'Uncategorized';
        if (!summary[cat]) {
          summary[cat] = 0;
        }
        summary[cat] += expense.amount;
      });
      
      setCategorySummary(summary);
      
    } catch (error) {
      console.error('Error fetching monthly expenses:', error.message);
      Alert.alert('Error', 'Failed to fetch monthly expenses. Please try again.');
    }
  };

  const addExpense = async () => {
    if (!userId) {
      Alert.alert('Error', 'User is not authenticated.');
      return;
    }

    if (!amount || !category) {
      Alert.alert('Error', 'Amount and category are required.');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Error', 'Please enter a valid amount.');
      return;
    }

    try {
      // If we're editing an existing expense
      if (isEditing && editingExpense) {
        const expenseDateStr = expenseDate.toISOString().split('T')[0];
        
        // Update the document in Firestore
        await updateDoc(doc(db, 'expenses', editingExpense.id), {
          amount: amountNum,
          category,
          note,
          date: expenseDateStr,
        });

        console.log('Document updated with ID:', editingExpense.id);
        
        // Reset form and refresh data
        resetForm();
        
        if (showMonthView) {
          fetchMonthlyExpenses();
        } else {
          fetchExpenses();
        }
        
        Alert.alert('Success', 'Expense updated successfully!');
      } else {
        // Adding a new expense
        const expenseDateStr = expenseDate.toISOString().split('T')[0];
        
        const docRef = await addDoc(collection(db, 'expenses'), {
          amount: amountNum,
          category,
          note,
          userId,
          date: expenseDateStr,
        });

        console.log('Document written with ID:', docRef.id);
        
        // Reset form and refresh data
        resetForm();
        
        if (showMonthView) {
          fetchMonthlyExpenses();
        } else {
          fetchExpenses();
        }
        
        Alert.alert('Success', 'Expense added successfully!');
      }
    } catch (error) {
      console.error('Error with expense operation:', error);
      Alert.alert('Error', `Failed to ${isEditing ? 'update' : 'add'} expense. Please try again.`);
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditingExpense(null);
    setAmount('');
    setCategory('');
    setNote('');
  };

  // Separate function to handle the confirmation dialog
  const confirmDelete = async (id) => {
      console.log('Deleting expense with ID:', id);
      try {
        await deleteDoc(doc(db, 'expenses', id));
        setExpenses((prev) => prev.filter((exp) => exp.id !== id));
        Alert.alert('Deleted successfully');
      } catch (err) {
        console.error('Delete error:', err);
      }
    };

  // Separate function to handle the actual deletion logic
  const deleteExpense = async (id) => {
    console.log('Deleting expense with ID:', id);
    try {
      // Simple direct deletion like in the old code
      await deleteDoc(doc(db, 'expenses', id));
      
      // Update UI state for whichever view is active
      if (showMonthView) {
        setMonthlyExpenses((prev) => prev.filter((exp) => exp.id !== id));
      } else {
        setExpenses((prev) => prev.filter((exp) => exp.id !== id));
      }
      
      Alert.alert('Success', 'Expense deleted successfully');
      
      // Optionally refresh data after state update
      if (showMonthView) {
        fetchMonthlyExpenses();
      } else {
        fetchExpenses();
      }
    } catch (err) {
      console.error('Delete error:', err);
      Alert.alert('Error', 'Failed to delete expense. Please try again.');
    }
  };

  const onViewDateChange = (event, selectedDate) => {
    setShowViewDatePicker(false);
    if (selectedDate) {
      setViewDate(selectedDate);
    }
  };

  const handleUpdate = (item) => {
    setIsEditing(true);
    setEditingExpense(item);
    setAmount(item.amount.toString());
    setCategory(item.category);
    setNote(item.note || '');
    
    // Set the expense date from the item's date
    const itemDate = new Date(item.date);
    if (!isNaN(itemDate.getTime())) {
      setExpenseDate(itemDate);
    }
    
    // Scroll to the top of the form
    if (typeof window !== 'undefined') {
      window.scrollTo && window.scrollTo(0, 0);
    }
  };

  const changeMonth = (change) => {
    let newMonth = viewMonth + change;
    let newYear = viewYear;
    
    if (newMonth > 11) {
      newMonth = 0;
      newYear += 1;
    } else if (newMonth < 0) {
      newMonth = 11;
      newYear -= 1;
    }
    
    setViewMonth(newMonth);
    setViewYear(newYear);
  };

  const getMonthName = (monthNum) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthNum];
  };

  const renderCategorySummary = () => {
    return Object.entries(categorySummary).map(([category, amount], index) => (
      <View key={index} style={styles.categorySummaryItem}>
        <Text style={styles.categorySummaryName}>{category}</Text>
        <Text style={styles.categorySummaryAmount}>₹{amount.toFixed(2)}</Text>
      </View>
    ));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{isEditing ? 'Edit Expense' : 'Add New Expense'}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.inputGroup}>
          <View style={styles.labelContainer}>
            <Ionicons name="wallet-outline" size={18} color="#6366f1" />
            <Text style={styles.label}>Amount</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Enter amount in ₹"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            maxLength={10}
            placeholderTextColor="#9ca3af"
          />
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelContainer}>
            <Ionicons name="pricetag-outline" size={18} color="#6366f1" />
            <Text style={styles.label}>Category</Text>
          </View>
          <TouchableOpacity
            style={styles.input}
            onPress={() => setShowCategoryModal(true)}
          >
            <Text style={[styles.inputText, !category && styles.placeholderText]}>
              {category || 'Select a category'}
            </Text>
          </TouchableOpacity>

          <Modal
            visible={showCategoryModal}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowCategoryModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Category</Text>
                  <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                    <Ionicons name="close" size={24} color="#6366f1" />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.categoryList}>
                  {CATEGORIES.map((item) => (
                    <TouchableOpacity
                      key={item}
                      style={[
                        styles.categoryItem,
                        category === item && styles.selectedCategory,
                      ]}
                      onPress={() => {
                        setCategory(item);
                        setShowCategoryModal(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.categoryItemText,
                          category === item && styles.selectedCategoryText,
                        ]}
                      >
                        {item}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelContainer}>
            <Ionicons name="calendar-outline" size={18} color="#6366f1" />
            <Text style={styles.label}>Expense Date</Text>
          </View>
          {Platform.OS !== 'web' ? (
            <>
              <TouchableOpacity 
                style={styles.input}
                onPress={() => setShowExpenseDatePicker(true)}
              >
                <Text style={styles.inputText}>{expenseDate.toLocaleDateString()}</Text>
              </TouchableOpacity>
              {showExpenseDatePicker && (
                <DateTimePicker
                  value={expenseDate}
                  mode="date"
                  display="default"
                  onChange={onExpenseDateChange}
                />
              )}
            </>
          ) : (
            <TouchableOpacity
              style={styles.input}
              onPress={() => {
                const newDate = prompt(
                  'Enter expense date (YYYY-MM-DD):',
                  expenseDate.toISOString().split('T')[0]
                );
                if (newDate) {
                  const parsedDate = new Date(newDate);
                  if (!isNaN(parsedDate)) {
                    setExpenseDate(parsedDate);
                  } else {
                    Alert.alert(
                      'Invalid Date',
                      'Please enter a valid date in YYYY-MM-DD format.'
                    );
                  }
                }
              }}
            >
              <Text style={styles.inputText}>{expenseDate.toLocaleDateString()}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelContainer}>
            <Ionicons name="create-outline" size={18} color="#6366f1" />
            <Text style={styles.label}>Note</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Optional note"
            value={note}
            onChangeText={setNote}
            placeholderTextColor="#9ca3af"
          />
        </View>

        <TouchableOpacity 
          style={[styles.button, isEditing ? styles.updateButton : styles.saveButton]} 
          onPress={addExpense}
        >
          <Text style={styles.buttonText}>
            {isEditing ? 'Update Expense' : 'Save Expense'}
          </Text>
        </TouchableOpacity>
        
        {isEditing && (
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={resetForm}
          >
            <Text style={styles.cancelButtonText}>Cancel Editing</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.viewToggleContainer}>
        <TouchableOpacity 
          style={[styles.viewToggleButton, !showMonthView && styles.activeViewToggleButton]} 
          onPress={() => setShowMonthView(false)}
        >
          <Text style={[styles.viewToggleText, !showMonthView && styles.activeViewToggleText]}>
            Daily View
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.viewToggleButton, showMonthView && styles.activeViewToggleButton]} 
          onPress={() => setShowMonthView(true)}
        >
          <Text style={[styles.viewToggleText, showMonthView && styles.activeViewToggleText]}>
            Monthly View
          </Text>
        </TouchableOpacity>
      </View>

      {!showMonthView ? (
        // Daily View
        <>
          <View style={styles.expenseListHeader}>
            <Text style={styles.subTitle}>View Expenses By Date</Text>
            
            <View style={styles.viewDateContainer}>
              {Platform.OS !== 'web' ? (
                <>
                  <TouchableOpacity 
                    style={styles.viewDateButton}
                    onPress={() => setShowViewDatePicker(true)}
                  >
                    <Ionicons name="calendar-outline" size={18} color="#6366f1" />
                    <Text style={styles.viewDateText}>{viewDate.toLocaleDateString()}</Text>
                  </TouchableOpacity>
                  {showViewDatePicker && (
                    <DateTimePicker
                      value={viewDate}
                      mode="date"
                      display="default"
                      onChange={onViewDateChange}
                    />
                  )}
                </>
              ) : (
                <TouchableOpacity
                  style={styles.viewDateButton}
                  onPress={() => {
                    const newDate = prompt(
                      'Enter date to view expenses (YYYY-MM-DD):',
                      viewDate.toISOString().split('T')[0]
                    );
                    if (newDate) {
                      const parsedDate = new Date(newDate);
                      if (!isNaN(parsedDate)) {
                        setViewDate(parsedDate);
                      } else {
                        Alert.alert(
                          'Invalid Date',
                          'Please enter a valid date in YYYY-MM-DD format.'
                        );
                      }
                    }
                  }}
                >
                  <Ionicons name="calendar-outline" size={18} color="#6366f1" />
                  <Text style={styles.viewDateText}>{viewDate.toLocaleDateString()}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <Text style={styles.expensesTitle}>
            {viewDate.toDateString() === new Date().toDateString()
              ? "Today's Expenses"
              : `Expenses for ${viewDate.toLocaleDateString()}`}
          </Text>
          
          {expenses.length === 0 ? (
            <View style={styles.noExpensesContainer}>
              <Ionicons name="receipt-outline" size={48} color="#d1d5db" />
              <Text style={styles.noExpensesText}>No expenses found for this date.</Text>
            </View>
          ) : (
            <FlatList
              data={expenses}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.expenseContainer}>
                  <View style={styles.expenseInfo}>
                    <View style={styles.expenseHeader}>
                      <Text style={styles.expenseAmount}>₹{item.amount.toFixed(2)}</Text>
                      {item.category && (
                        <View style={styles.categoryBadge}>
                          <Text style={styles.categoryBadgeText}>{item.category}</Text>
                        </View>
                      )}
                    </View>
                    {item.note && <Text style={styles.noteText}>{item.note}</Text>}
                  </View>

                  <View style={styles.buttonGroup}>
                    <TouchableOpacity
                      style={styles.editBtn}
                      onPress={() => handleUpdate(item)}
                      accessible={true}
                      accessibilityLabel="Edit expense"
                    >
                      <Ionicons name="pencil-outline" size={18} color="#fff" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => confirmDelete(item.id)}
                      accessible={true}
                      accessibilityLabel="Delete expense"
                    >
                      <Ionicons name="trash-outline" size={18} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              scrollEnabled={false}
              style={styles.expensesList}
            />
          )}
        </>
      ) : (
        // Monthly View
        <>
          <View style={styles.monthSelectorContainer}>
            <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthNavigationButton}>
              <Ionicons name="chevron-back" size={24} color="#6366f1" />
            </TouchableOpacity>
            
            <Text style={styles.currentMonth}>
              {getMonthName(viewMonth)} {viewYear}
            </Text>
            
            <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthNavigationButton}>
              <Ionicons name="chevron-forward" size={24} color="#6366f1" />
            </TouchableOpacity>
          </View>

          {/* Monthly Summary Card */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Monthly Summary</Text>
            <Text style={styles.summaryTotal}>Total: ₹{monthlyTotal.toFixed(2)}</Text>
            
            <View style={styles.divider} />
            
            <Text style={styles.categorySummaryTitle}>Expenses by Category</Text>
            {Object.keys(categorySummary).length > 0 ? (
              <View style={styles.categorySummaryContainer}>
                {renderCategorySummary()}
              </View>
            ) : (
              <Text style={styles.noExpensesText}>No data available</Text>
            )}
          </View>
          
          <Text style={styles.expensesTitle}>All Expenses This Month</Text>
          
          {monthlyExpenses.length === 0 ? (
            <View style={styles.noExpensesContainer}>
              <Ionicons name="receipt-outline" size={48} color="#d1d5db" />
              <Text style={styles.noExpensesText}>No expenses found for this month.</Text>
            </View>
          ) : (
            <FlatList
              data={monthlyExpenses}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const expDate = new Date(item.date);
                return (
                  <View style={styles.expenseContainer}>
                    <View style={styles.expenseInfo}>
                      <View style={styles.expenseHeader}>
                        <Text style={styles.expenseAmount}>₹{item.amount.toFixed(2)}</Text>
                        <View style={styles.expenseHeaderRight}>
                          {item.category && (
                            <View style={styles.categoryBadge}>
                              <Text style={styles.categoryBadgeText}>{item.category}</Text>
                            </View>
                          )}
                          <Text style={styles.expenseDate}>{expDate.toLocaleDateString()}</Text>
                        </View>
                      </View>
                      {item.note && <Text style={styles.noteText}>{item.note}</Text>}
                    </View>

                    <View style={styles.buttonGroup}>
                      <TouchableOpacity
                        style={styles.editBtn}
                        onPress={() => handleUpdate(item)}
                        accessible={true}
                        accessibilityLabel="Edit expense"
                      >
                        <Ionicons name="pencil-outline" size={18} color="#fff" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => confirmDelete(item.id)}
                        accessible={true}
                        accessibilityLabel="Delete expense"
                      >
                        <Ionicons name="trash-outline" size={18} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }}
              scrollEnabled={false}
              style={styles.expensesList}
            />
          )}
        </>
      )}
    </ScrollView>
  );
};

export default Expense;