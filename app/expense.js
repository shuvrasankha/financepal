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
  Modal,
  Platform,
  SafeAreaView
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebase';
import styles, { CATEGORY_COLORS } from '../styles/ExpenseStyles';
import BottomNavBar from './components/BottomNavBar';
import SwipeableRow from './components/SwipeableRow';
import LoadingState from './components/LoadingState';
import { useExpenses } from '../contexts/ExpenseContext';
import { useTheme } from '../contexts/ThemeContext';
import Theme from '../constants/Theme';

// Map categories to Ionicons icon names
const CATEGORY_ICONS = {
  Food: 'fast-food-outline',
  Transport: 'car-outline',
  Shopping: 'cart-outline',
  Bills: 'document-text-outline',
  Entertainment: 'musical-notes-outline',
  Health: 'medkit-outline',
  Education: 'school-outline',
  Others: 'apps-outline',
};

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
  // Get theme context
  const { isDarkMode } = useTheme();
  const colors = isDarkMode ? Theme.dark.colors : Theme.light.colors;
  
  // Get expenses context
  const { 
    expenses: allExpenses, 
    loading, 
    error,
    addExpense,
    updateExpense,
    deleteExpense,
    fetchExpenses
  } = useExpenses();

  // State for editing expense
  const [isEditing, setIsEditing] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  // UI state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMonthView, setShowMonthView] = useState(false);
  
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
  
  // Filtered expenses
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [categorySummary, setCategorySummary] = useState({});
  
  // Add state for input highlighting
  const [inputHighlight, setInputHighlight] = useState({ amount: false, category: false });

  // Pagination
  const [pageSize] = useState(10); // Number of items per page
  const [currentPage, setCurrentPage] = useState(1);
  const [paginatedExpenses, setPaginatedExpenses] = useState([]);
  const [hasMore, setHasMore] = useState(true);

  // Refresh expenses when component mounts
  useEffect(() => {
    fetchExpenses();
  }, []);

  // Filter expenses based on view mode (daily or monthly)
  useEffect(() => {
    if (allExpenses.length > 0) {
      // Always calculate monthly total for the selected month
      const startDate = new Date(viewYear, viewMonth, 1);
      const endDate = new Date(viewYear, viewMonth + 1, 0);
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      const monthlyExpenses = allExpenses.filter(expense => {
        const expenseDate = expense.date;
        return expenseDate >= startDateStr && expenseDate <= endDateStr;
      });
      const monthlyTotalCalc = monthlyExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
      setMonthlyTotal(monthlyTotalCalc);

      if (showMonthView) {
        // Monthly view filtering
        // Sort by date (newest first)
        monthlyExpenses.sort((a, b) => b.date.localeCompare(a.date));
        setFilteredExpenses(monthlyExpenses);
        // Calculate category summary
        const summary = {};
        monthlyExpenses.forEach(expense => {
          const cat = expense.category || 'Uncategorized';
          if (!summary[cat]) {
            summary[cat] = 0;
          }
          summary[cat] += Number(expense.amount);
        });
        setCategorySummary(summary);
      } else {
        // Daily view filtering
        const selectedDateStr = viewDate.toISOString().split('T')[0];
        const dailyExpenses = allExpenses.filter(expense => 
          expense.date === selectedDateStr
        );
        setFilteredExpenses(dailyExpenses);
      }
      // Reset pagination when filters change
      setCurrentPage(1);
    } else {
      setFilteredExpenses([]);
      setCategorySummary({});
      setMonthlyTotal(0);
    }
  }, [allExpenses, showMonthView, viewDate, viewMonth, viewYear]);

  // Update paginated expenses when current page changes
  useEffect(() => {
    updatePaginatedExpenses();
  }, [currentPage, filteredExpenses]);

  const updatePaginatedExpenses = () => {
    const startIndex = 0;
    const endIndex = currentPage * pageSize;
    const paginatedData = filteredExpenses.slice(startIndex, endIndex);
    setPaginatedExpenses(paginatedData);
    setHasMore(endIndex < filteredExpenses.length);
  };

  const loadMore = () => {
    setCurrentPage(prev => prev + 1);
  };

  const handleAddExpense = async () => {
    if (!auth.currentUser) {
      Alert.alert('Error', 'User is not authenticated.');
      return;
    }

    let hasError = false;
    const newHighlight = { amount: false, category: false };
    if (!amount) {
      newHighlight.amount = true;
      hasError = true;
    }
    if (!category) {
      newHighlight.category = true;
      hasError = true;
    }
    setInputHighlight(newHighlight);
    if (hasError) {
      Alert.alert('Error', 'Amount and category are required.');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Error', 'Please enter a valid amount.');
      return;
    }

    try {
      const expenseDateStr = expenseDate.toISOString().split('T')[0];
      
      // If we're editing an existing expense
      if (isEditing && editingExpense) {
        const updatedExpense = {
          amount: amountNum,
          category,
          note,
          date: expenseDateStr,
        };
        
        await updateExpense(editingExpense.id, updatedExpense);
        Alert.alert('Success', 'Expense updated successfully!');
      } else {
        // Adding a new expense
        const newExpense = {
          amount: amountNum,
          category,
          note,
          date: expenseDateStr,
        };
        
        await addExpense(newExpense);
        Alert.alert('Success', 'Expense added successfully!');
      }
      
      // Reset form and close modal
      resetForm();
      setShowAddModal(false);
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
    setExpenseDate(new Date());
  };

  const handleDeleteExpense = (id) => {
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteExpense(id);
              Alert.alert('Success', 'Expense deleted successfully');
            } catch (err) {
              console.error('Delete error:', err);
              Alert.alert('Error', 'Failed to delete expense. Please try again.');
            }
          }
        }
      ]
    );
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
    setShowAddModal(true); // Open the modal for editing
  };

  const onExpenseDateChange = (event, selectedDate) => {
    setShowExpenseDatePicker(false);
    if (selectedDate) {
      setExpenseDate(selectedDate);
    }
  };

  const onViewDateChange = (event, selectedDate) => {
    setShowViewDatePicker(false);
    if (selectedDate) {
      setViewDate(selectedDate);
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
    return Object.entries(categorySummary).map(([category, amount], idx) => (
      <View key={category + idx} style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        borderBottomWidth: 1, 
        borderBottomColor: colors.light, 
        backgroundColor: idx % 2 === 0 ? colors.card : `${colors.card}80`, 
        paddingVertical: 16, 
        paddingHorizontal: 18 
      }}>
        <Ionicons name={CATEGORY_ICONS[category] || 'pricetag'} size={24} color={CATEGORY_COLORS[category] || colors.primary} style={{ marginRight: 10 }} />
        <Text style={{ flex: 2, color: colors.dark, fontWeight: '600', fontSize: 15 }}>{category}</Text>
        <Text style={{ flex: 1, color: colors.primary, fontWeight: '700', fontSize: 16, textAlign: 'right' }}>₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
      </View>
    ));
  };

  // Render expense item with swipe actions
  const renderExpenseItem = ({ item }) => {
    // Define right swipe actions (edit, delete)
    const rightActions = [
      {
        text: 'Edit',
        icon: 'pencil',
        color: colors.primary,
        onPress: () => handleUpdate(item)
      },
      {
        text: 'Delete',
        icon: 'trash',
        color: colors.error,
        onPress: () => handleDeleteExpense(item.id)
      }
    ];

    return (
      <SwipeableRow rightActions={rightActions}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.card,
          borderRadius: 16,
          padding: 16,
          marginBottom: 14,
          ...Theme.shadows.sm,
          marginHorizontal: 16,
        }}>
          {/* Category Icon */}
          <View style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: CATEGORY_COLORS[item.category] || colors.light,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 14,
          }}>
            <Ionicons name={CATEGORY_ICONS[item.category]} size={22} color="#fff" />
          </View>
          {/* Main Info */}
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.dark }}>₹{item.amount.toFixed(2)}</Text>
              {showMonthView && (
                <Text style={{ fontSize: 12, color: colors.medium }}>{new Date(item.date).toLocaleDateString()}</Text>
              )}
            </View>
            {item.note ? (
              <Text style={{ fontSize: 12, color: colors.medium, marginTop: 2 }} numberOfLines={1}>{item.note}</Text>
            ) : null}
          </View>
        </View>
      </SwipeableRow>
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <LoadingState type="skeleton" />
        <BottomNavBar />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <LoadingState 
          type="error" 
          errorMessage={error}
          retryAction={fetchExpenses}
        />
        <BottomNavBar />
      </View>
    );
  }

  return (
    <>
      <SafeAreaView style={[styles.container, { flex: 1, backgroundColor: colors.background }]}>
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginHorizontal: 16, 
          marginBottom: 12,
          paddingTop: 20
        }}>
          <Text style={[styles.title, { 
            fontSize: 28, 
            fontWeight: 'bold', 
            color: colors.dark, 
            letterSpacing: 0.5, 
          }]}>Expenses</Text>
          
          {/* Add Button */}
          <TouchableOpacity
            style={{
              backgroundColor: colors.primary,
              width: 42,
              height: 42,
              borderRadius: 21,
              justifyContent: 'center',
              alignItems: 'center',
              ...Theme.shadows.sm,
            }}
            onPress={() => {
              resetForm();
              setShowAddModal(true);
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>
        
        {/* Total Expense Card */}
        <View style={{ 
          backgroundColor: colors.card, 
          borderRadius: 14, 
          padding: 20, 
          marginBottom: 18,
          marginHorizontal: 16, 
          alignItems: 'center', 
          ...Theme.shadows.sm 
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', width: '100%' }}>
            {/* Monthly Total */}
            <View style={{ 
              alignItems: 'center', 
              flex: 1, 
              borderRightWidth: 1, 
              borderRightColor: colors.light 
            }}>
              <Text style={{ fontSize: 16, color: colors.medium, marginBottom: 6 }}>
                {`${getMonthName(viewMonth)} Total`}
              </Text>
              <Text style={{ fontSize: 28, fontWeight: 'bold', color: colors.primary }}>
                ₹{monthlyTotal.toLocaleString('en-IN')}
              </Text>
            </View>
            {/* Daily Total */}
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: 16, color: colors.medium, marginBottom: 6 }}>
                {viewDate.toDateString() === new Date().toDateString() ? "Today's Total" : "Daily Total"}
              </Text>
              <Text style={{ fontSize: 28, fontWeight: 'bold', color: colors.primary }}>
                ₹{!showMonthView && filteredExpenses ? filteredExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0).toLocaleString('en-IN') : '0'}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.viewToggleContainer, { backgroundColor: colors.card }]}>
          <TouchableOpacity 
            style={[
              styles.viewToggleButton, 
              !showMonthView && { backgroundColor: colors.primary }
            ]} 
            onPress={() => setShowMonthView(false)}
          >
            <Text style={[
              styles.viewToggleText, 
              { color: !showMonthView ? colors.white : colors.dark }
            ]}>
              Daily View
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.viewToggleButton, 
              showMonthView && { backgroundColor: colors.primary }
            ]} 
            onPress={() => setShowMonthView(true)}
          >
            <Text style={[
              styles.viewToggleText, 
              { color: showMonthView ? colors.white : colors.dark }
            ]}>
              Monthly View
            </Text>
          </TouchableOpacity>
        </View>

        {!showMonthView ? (
          // Daily View
          <>
            <View style={styles.expenseListHeader}>
              <View style={styles.viewDateContainer}>
                {Platform.OS !== 'web' ? (
                  <>
                    <TouchableOpacity 
                      style={[styles.viewDateButton, { backgroundColor: colors.card }]}
                      onPress={() => setShowViewDatePicker(true)}
                    >
                      <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                      <Text style={[styles.viewDateText, { color: colors.dark }]}>
                        {viewDate.toLocaleDateString()}
                      </Text>
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
                    style={[styles.viewDateButton, { backgroundColor: colors.card }]}
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
                    <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                    <Text style={[styles.viewDateText, { color: colors.dark }]}>
                      {viewDate.toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <Text style={[styles.expensesTitle, { color: colors.dark }]}>
              {viewDate.toDateString() === new Date().toDateString()
                ? "Today's Expenses"
                : `Expenses for ${viewDate.toLocaleDateString()}`}
            </Text>
            
            {paginatedExpenses.length === 0 ? (
              <LoadingState 
                type="empty"
                emptyMessage="No expenses found for this date."
                emptyIcon="receipt-outline"
              />
            ) : (
              <FlatList
                data={paginatedExpenses}
                keyExtractor={(item) => item.id}
                renderItem={renderExpenseItem}
                scrollEnabled={true}
                style={[styles.expensesList, { flex: 1 }]}
                contentContainerStyle={{ paddingBottom: 120 }}
                ListFooterComponent={() => hasMore && (
                  <TouchableOpacity
                    style={{
                      backgroundColor: `${colors.primary}10`,
                      padding: 12,
                      borderRadius: 8,
                      alignItems: 'center',
                      marginVertical: 16,
                      flexDirection: 'row',
                      justifyContent: 'center',
                      marginHorizontal: 16
                    }}
                    onPress={loadMore}
                  >
                    <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600', marginRight: 8 }}>
                      Load More
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={colors.primary} />
                  </TouchableOpacity>
                )}
              />
            )}
          </>
        ) : (
          // Monthly View
          <>
            <View style={[styles.monthSelectorContainer, { backgroundColor: colors.card }]}>
              <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthNavigationButton}>
                <Ionicons name="chevron-back" size={24} color={colors.primary} />
              </TouchableOpacity>
              
              <Text style={[styles.currentMonth, { color: colors.dark }]}>
                {getMonthName(viewMonth)} {viewYear}
              </Text>
              
              <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthNavigationButton}>
                <Ionicons name="chevron-forward" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <FlatList
              ListHeaderComponent={() => (
                <>
                  <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
                    <Text style={[styles.summaryTitle, { color: colors.dark }]}>Monthly Summary</Text>
                    <View style={[styles.divider, { backgroundColor: colors.light }]} />
                    <Text style={[styles.categorySummaryTitle, { color: colors.dark }]}>
                      Expenses by Category
                    </Text>
                    {Object.keys(categorySummary).length > 0 ? (
                      <View style={styles.categorySummaryContainer}>
                        {renderCategorySummary()}
                      </View>
                    ) : (
                      <Text style={[styles.noExpensesText, { color: colors.medium }]}>
                        No data available
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.expensesTitle, { color: colors.dark }]}>
                    All Expenses This Month
                  </Text>
                </>
              )}
              data={paginatedExpenses}
              keyExtractor={(item) => item.id}
              renderItem={renderExpenseItem}
              scrollEnabled={true}
              style={[styles.expensesList, { flex: 1 }]}
              contentContainerStyle={{ paddingBottom: 120 }}
              ListEmptyComponent={() => (
                <LoadingState 
                  type="empty"
                  emptyMessage="No expenses found for this month."
                  emptyIcon="receipt-outline"
                />
              )}
              ListFooterComponent={() => hasMore && (
                <TouchableOpacity
                  style={{
                    backgroundColor: `${colors.primary}10`,
                    padding: 12,
                    borderRadius: 8,
                    alignItems: 'center',
                    marginVertical: 16,
                    flexDirection: 'row',
                    justifyContent: 'center',
                    marginHorizontal: 16
                  }}
                  onPress={loadMore}
                >
                  <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600', marginRight: 8 }}>
                    Load More
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={colors.primary} />
                </TouchableOpacity>
              )}
            />
          </>
        )}

        {/* Add Expense Modal */}
        <Modal visible={showAddModal} animationType="slide" onRequestClose={() => setShowAddModal(false)}>
          <ScrollView style={{ flex: 1, backgroundColor: colors.background, padding: 10 }}>
            <View style={{ flex: 1, backgroundColor: colors.background, padding: 24 }}>
              {/* Header with Title and Close Button */}
              <View style={{ 
                flexDirection: 'row', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: 24,
                marginTop: 46
              }}>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.dark }}>
                  {isEditing ? 'Edit Expense' : 'Add Expense'}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowAddModal(false)}
                  style={{
                    padding: 8,
                    borderRadius: 8,
                    backgroundColor: `${colors.error}20`
                  }}
                >
                  <Ionicons name="close-circle-outline" size={24} color={colors.error} />
                </TouchableOpacity>
              </View>

              {/* Amount Field */}
              <Text style={{ marginBottom: 8, fontSize: 18, color: colors.dark }}>Amount (₹)</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                <TextInput
                  style={{ 
                    borderWidth: 1, 
                    borderColor: inputHighlight.amount ? colors.error : colors.light, 
                    borderRadius: 8, 
                    padding: 10, 
                    flex: 1, 
                    fontSize: 18, 
                    color: colors.dark,
                    backgroundColor: colors.card
                  }}
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={(text) => {
                    // Allow only numbers and a single decimal point
                    const numericValue = text.replace(/[^0-9.]/g, '');
                    if (/^\d*\.?\d*$/.test(numericValue)) {
                      setAmount(numericValue);
                    }
                    if (inputHighlight.amount) setInputHighlight((prev) => ({ ...prev, amount: false }));
                  }}
                  placeholder="Enter amount"
                  placeholderTextColor={colors.medium}
                />
              </View>

              {/* Category Selector */}
              <Text style={{ marginBottom: 8, fontSize: 18, color: colors.dark }}>Category</Text>
              <View style={{ 
                flexDirection: 'row', 
                flexWrap: 'wrap', 
                justifyContent: 'space-between',
                marginBottom: 20,
                borderWidth: inputHighlight.category ? 2 : 0,
                borderColor: inputHighlight.category ? colors.error : 'transparent',
                borderRadius: 8,
                padding: inputHighlight.category ? 8 : 0
              }}>
                {CATEGORIES.map((item, idx) => (
                  <TouchableOpacity
                    key={item}
                    style={{
                      width: '23%', 
                      aspectRatio: 1,
                      marginBottom: 12,
                      borderRadius: 16,
                      backgroundColor: category === item ? (CATEGORY_COLORS[item] || colors.primary) : `${colors.card}80`,
                      borderWidth: 1,
                      borderColor: category === item ? (CATEGORY_COLORS[item] || colors.primary) : colors.light,
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 8,
                    }}
                    onPress={() => {
                      setCategory(item);
                      if (inputHighlight.category) setInputHighlight((prev) => ({ ...prev, category: false }));
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={CATEGORY_ICONS[item]}
                      size={24}
                      color={category === item ? colors.white : (CATEGORY_COLORS[item] || colors.primary)}
                    />
                    <Text style={{ 
                      color: category === item ? colors.white : colors.dark, 
                      fontSize: 12, 
                      marginTop: 4,
                      textAlign: 'center'
                    }}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Date Field */}
              <Text style={{ marginBottom: 8, fontSize: 18, color: colors.dark }}>Expense Date</Text>
              <TouchableOpacity
                style={{ 
                  borderWidth: 1, 
                  borderColor: colors.light, 
                  borderRadius: 8, 
                  padding: 14, 
                  marginBottom: 20,
                  backgroundColor: colors.card
                }}
                onPress={() => setShowExpenseDatePicker(true)}
              >
                <Text style={{ color: colors.dark, fontSize: 18 }}>
                  {expenseDate.toISOString().split('T')[0]}
                </Text>
              </TouchableOpacity>
              {showExpenseDatePicker && (
                <DateTimePicker
                  value={expenseDate}
                  mode="date"
                  display="default"
                  maximumDate={new Date()}
                  onChange={(event, selectedDate) => {
                    setShowExpenseDatePicker(false);
                    if (selectedDate) {
                      setExpenseDate(selectedDate);
                    }
                  }}
                />
              )}

              {/* Note Field */}
              <Text style={{ marginBottom: 8, fontSize: 18, color: colors.dark }}>Note (Optional)</Text>
              <TextInput
                style={{ 
                  borderWidth: 1, 
                  borderColor: colors.light, 
                  borderRadius: 8, 
                  padding: 10, 
                  marginBottom: 28, 
                  fontSize: 18,
                  color: colors.dark,
                  backgroundColor: colors.card
                }}
                value={note}
                onChangeText={setNote}
                placeholder="Any note..."
                placeholderTextColor={colors.medium}
              />

              {/* Save Button */}
              <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8 }}>
                <TouchableOpacity 
                  style={{ 
                    flex: 1, 
                    backgroundColor: colors.primary, 
                    padding: 16, 
                    borderRadius: 8, 
                    alignItems: 'center', 
                    flexDirection: 'row', 
                    justifyContent: 'center' 
                  }} 
                  onPress={handleAddExpense}
                >
                  <Ionicons name="checkmark-circle-outline" size={22} color={colors.white} style={{ marginRight: 8 }} />
                  <Text style={{ color: colors.white, fontWeight: 'bold', fontSize: 18 }}>
                    {isEditing ? 'Update' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              {/* Cancel Editing Button (when editing) */}
              {isEditing && (
                <TouchableOpacity 
                  style={{ 
                    marginTop: 16,
                    backgroundColor: `${colors.error}10`,
                    padding: 16,
                    borderRadius: 8,
                    alignItems: 'center'
                  }} 
                  onPress={resetForm}
                >
                  <Text style={{ color: colors.error, fontWeight: '600', fontSize: 16 }}>
                    Cancel Editing
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </Modal>
      </SafeAreaView>
      <BottomNavBar />
    </>
  );
};

export default Expense;