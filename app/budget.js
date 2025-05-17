// Budget.js
import React, { useState, useEffect, useCallback } from 'react';
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
  SafeAreaView,
  Animated,
  KeyboardAvoidingView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebase';
import { collection, getDocs, query, where, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import BottomNavBar from './components/BottomNavBar';
import SwipeableRow from './components/SwipeableRow';
import LoadingState from './components/LoadingState';
import { useExpenses } from '../contexts/ExpenseContext';
import { useTheme } from '../contexts/ThemeContext';
import Theme from '../constants/Theme';

// Map categories to Ionicons icon names (same as in expense.js)
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

const Budget = () => {
  // Get theme context
  const { isDarkMode } = useTheme();
  const colors = isDarkMode ? Theme.dark.colors : Theme.light.colors;
  
  // Get expenses context to access user's expenses
  const { expenses } = useExpenses();

  // State for budgets
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // UI state
  const [showAddModal, setShowAddModal] = useState(false);
  const [isPeriodSelectorOpen, setIsPeriodSelectorOpen] = useState(false);
  
  // Budget data state
  const [currentBudget, setCurrentBudget] = useState(null);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  
  // Date handling state
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Progress animation values
  const progressAnimations = {};
  CATEGORIES.forEach(cat => {
    progressAnimations[cat] = new Animated.Value(0);
  });

  // Add state for input highlighting
  const [inputHighlight, setInputHighlight] = useState({ amount: false, category: false });

  // Fetch budgets on component mount
  useEffect(() => {
    fetchBudgets();
  }, []);

  // Calculate spending against budgets when budgets or expenses change
  useEffect(() => {
    if (budgets.length > 0 && expenses.length > 0) {
      calculateSpendingProgress();
    }
  }, [budgets, expenses, selectedMonth, selectedYear]);

  // Fetch all budgets for the current user
  const fetchBudgets = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = auth.currentUser;
      if (!user) {
        setBudgets([]);
        setError('User not authenticated');
        setLoading(false);
        return;
      }

      // Check if 'budgets' collection exists first to handle first-time usage
      try {
        const budgetsRef = collection(db, 'budgets');
        const q = query(
          budgetsRef,
          where('userId', '==', user.uid)
        );

        const querySnapshot = await getDocs(q);
        const budgetsList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        setBudgets(budgetsList);
      } catch (dbError) {
        console.error('Error in Firestore query:', dbError);
        // If the error is because collection doesn't exist, just return empty array
        // rather than showing an error to the user
        if (dbError.code === 'permission-denied' || 
            dbError.code === 'resource-exhausted' || 
            dbError.message.includes('Missing or insufficient permissions')) {
          // This could be a permissions issue or the collection doesn't exist yet
          console.log('Firebase collection might not exist yet or permissions issue');
          setBudgets([]);
        } else {
          // For other errors, show the error message
          setError(`Failed to load budgets: ${dbError.message}`);
        }
      }
    } catch (err) {
      console.error('Error fetching budgets:', err);
      setError('Failed to load budgets. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Add a new budget
  const addBudget = async () => {
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
      const periodKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
      
      // Check if budget for this category and period already exists
      const existingBudget = budgets.find(b => 
        b.category === category && b.period === periodKey && !isEditing
      );
      
      if (existingBudget) {
        Alert.alert('Budget Exists', 'A budget for this category already exists for the selected month. Would you like to update it instead?', [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Update',
            onPress: () => {
              setIsEditing(true);
              setEditingBudget(existingBudget);
              // Continue to update flow...
              updateBudget(existingBudget.id);
            }
          }
        ]);
        return;
      }
      
      // If we're editing an existing budget
      if (isEditing && editingBudget) {
        await updateBudget(editingBudget.id);
      } else {
        // Adding a new budget
        const now = new Date();
        const newBudget = {
          userId: auth.currentUser.uid,
          amount: amountNum,
          category,
          note,
          period: periodKey,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
        };
        
        const docRef = await addDoc(collection(db, 'budgets'), newBudget);
        
        // Update local state
        setBudgets(prev => [
          { id: docRef.id, ...newBudget },
          ...prev
        ]);
        
        Alert.alert('Success', 'Budget added successfully!');
      }
      
      // Reset form and close modal
      resetForm();
      setShowAddModal(false);
    } catch (error) {
      console.error('Error with budget operation:', error);
      Alert.alert('Error', `Failed to ${isEditing ? 'update' : 'add'} budget. Please try again.`);
    }
  };

  // Update an existing budget
  const updateBudget = async (id) => {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Error', 'Please enter a valid amount.');
      return;
    }

    const now = new Date();
    const periodKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
    
    const updatedBudget = {
      amount: amountNum,
      category,
      note,
      period: periodKey,
      updatedAt: now.toISOString()
    };

    try {
      const budgetRef = doc(db, 'budgets', id);
      await updateDoc(budgetRef, updatedBudget);
      
      // Update local state
      setBudgets(prev => 
        prev.map(budget => 
          budget.id === id 
            ? { ...budget, ...updatedBudget } 
            : budget
        )
      );
      
      Alert.alert('Success', 'Budget updated successfully!');
    } catch (err) {
      console.error('Error updating budget:', err);
      Alert.alert('Error', 'Failed to update budget. Please try again.');
      throw err;
    }
  };

  // Delete a budget
  const deleteBudget = (id) => {
    Alert.alert(
      'Delete Budget',
      'Are you sure you want to delete this budget?',
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
              const budgetRef = doc(db, 'budgets', id);
              await deleteDoc(budgetRef);
              
              // Update local state
              setBudgets(prev => prev.filter(budget => budget.id !== id));
              Alert.alert('Success', 'Budget deleted successfully');
            } catch (err) {
              console.error('Delete error:', err);
              Alert.alert('Error', 'Failed to delete budget. Please try again.');
            }
          }
        }
      ]
    );
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditingBudget(null);
    setAmount('');
    setCategory('');
    setNote('');
  };

  const handleEditBudget = (item) => {
    setIsEditing(true);
    setEditingBudget(item);
    setAmount(item.amount.toString());
    setCategory(item.category);
    setNote(item.note || '');
    
    // Set the month and year from the period
    if (item.period) {
      const [year, month] = item.period.split('-').map(Number);
      setSelectedYear(year);
      setSelectedMonth(month - 1); // Convert back to 0-indexed month
    }
    
    setShowAddModal(true);
  };

  const calculateSpendingProgress = () => {
    const periodKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
    
    // Filter expenses for the selected month
    const startDate = new Date(selectedYear, selectedMonth, 1);
    const endDate = new Date(selectedYear, selectedMonth + 1, 0);
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    const monthlyExpenses = expenses.filter(expense => {
      const expenseDate = expense.date;
      return expenseDate >= startDateStr && expenseDate <= endDateStr;
    });
    
    // Calculate spending by category
    const spendingByCategory = {};
    monthlyExpenses.forEach(expense => {
      const cat = expense.category || 'Others';
      if (!spendingByCategory[cat]) {
        spendingByCategory[cat] = 0;
      }
      spendingByCategory[cat] += Number(expense.amount);
    });
    
    // Find budgets for this period
    const periodBudgets = budgets.filter(budget => budget.period === periodKey);
    
    // Calculate progress and animate
    periodBudgets.forEach(budget => {
      const spent = spendingByCategory[budget.category] || 0;
      const percentage = Math.min(100, (spent / budget.amount) * 100);
      
      if (progressAnimations[budget.category]) {
        Animated.timing(progressAnimations[budget.category], {
          toValue: percentage,
          duration: 800,
          useNativeDriver: false
        }).start();
      }
    });
  };

  const getMonthName = (monthNum) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthNum];
  };

  const changeMonth = (change) => {
    let newMonth = selectedMonth + change;
    let newYear = selectedYear;
    
    if (newMonth > 11) {
      newMonth = 0;
      newYear += 1;
    } else if (newMonth < 0) {
      newMonth = 11;
      newYear -= 1;
    }
    
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
  };

  // Render budget item with progress bar
  const renderBudgetItem = ({ item }) => {
    const periodKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
    
    // Only show budgets for the selected month
    if (item.period !== periodKey) {
      return null;
    }
    
    // Calculate current spending for this budget
    const startDate = new Date(selectedYear, selectedMonth, 1);
    const endDate = new Date(selectedYear, selectedMonth + 1, 0);
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    const categoryExpenses = expenses.filter(expense => 
      expense.category === item.category && 
      expense.date >= startDateStr && 
      expense.date <= endDateStr
    );
    
    const spent = categoryExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
    const percentage = Math.min(100, (spent / item.amount) * 100);
    const remaining = item.amount - spent;
    
    // Set progress bar color based on percentage
    let progressColor = colors.primary;
    if (percentage >= 90) {
      progressColor = colors.error;
    } else if (percentage >= 70) {
      progressColor = '#FF9500'; // warning color
    }

    // Define right swipe actions (edit, delete)
    const rightActions = [
      {
        text: 'Edit',
        icon: 'pencil',
        color: colors.primary,
        onPress: () => handleEditBudget(item)
      },
      {
        text: 'Delete',
        icon: 'trash',
        color: colors.error,
        onPress: () => deleteBudget(item.id)
      }
    ];

    return (
      <SwipeableRow rightActions={rightActions}>
        <View style={{
          backgroundColor: colors.card,
          borderRadius: 16,
          padding: 18,
          marginBottom: 16,
          ...Theme.shadows.sm,
          marginHorizontal: 16,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <View style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: percentage >= 90 ? `${colors.error}20` : percentage >= 70 ? '#FFF5E680' : `${colors.primary}20`,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 14,
            }}>
              <Ionicons 
                name={CATEGORY_ICONS[item.category] || 'pricetag'} 
                size={24} 
                color={percentage >= 90 ? colors.error : percentage >= 70 ? '#FF9500' : colors.primary} 
              />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.dark }}>{item.category}</Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.dark }}>
                    ₹{spent.toLocaleString('en-IN', { maximumFractionDigits: 0 })} / ₹{item.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </Text>
                  <Text style={{ 
                    fontSize: 13, 
                    color: percentage >= 90 ? colors.error : colors.medium,
                    fontWeight: percentage >= 90 ? 'bold' : 'normal'
                  }}>
                    {percentage >= 100 
                      ? 'Budget Exceeded!' 
                      : percentage >= 90 
                        ? `₹${remaining.toLocaleString('en-IN', { maximumFractionDigits: 0 })} left!` 
                        : `₹${remaining.toLocaleString('en-IN', { maximumFractionDigits: 0 })} remaining`}
                  </Text>
                </View>
              </View>
            </View>
          </View>
          
          {/* Progress bar */}
          <View style={{ 
            height: 8, 
            backgroundColor: `${colors.primary}20`, 
            borderRadius: 4, 
            overflow: 'hidden',
            marginTop: 8
          }}>
            <Animated.View 
              style={{ 
                height: '100%', 
                width: progressAnimations[item.category] ? progressAnimations[item.category].interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%']
                }) : `${percentage}%`,
                backgroundColor: progressColor,
                borderRadius: 4
              }} 
            />
          </View>
          
          {/* Budget Note (if any) */}
          {item.note ? (
            <Text style={{ 
              fontSize: 14, 
              color: colors.medium, 
              marginTop: 12,
              fontStyle: 'italic'
            }}>
              Note: {item.note}
            </Text>
          ) : null}
        </View>
      </SwipeableRow>
    );
  };

  // Calculate total budget and spending for the current month
  const calculateMonthTotals = () => {
    const periodKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
    const monthBudgets = budgets.filter(budget => budget.period === periodKey);
    
    // Total budget for month
    const totalBudget = monthBudgets.reduce((sum, budget) => sum + Number(budget.amount), 0);
    
    // Total spending for month
    const startDate = new Date(selectedYear, selectedMonth, 1);
    const endDate = new Date(selectedYear, selectedMonth + 1, 0);
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    const monthlyExpenses = expenses.filter(expense => {
      const expenseDate = expense.date;
      return expenseDate >= startDateStr && expenseDate <= endDateStr;
    });
    
    const totalSpent = monthlyExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
    
    return { totalBudget, totalSpent };
  };

  const { totalBudget, totalSpent } = calculateMonthTotals();
  const overallPercentage = totalBudget > 0 ? Math.min(100, (totalSpent / totalBudget) * 100) : 0;

  // Get unbudgeted spending by category
  const getUnbudgetedCategories = () => {
    const periodKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
    const budgetedCategories = budgets
      .filter(budget => budget.period === periodKey)
      .map(budget => budget.category);
    
    // Get spending for categories without a budget
    const startDate = new Date(selectedYear, selectedMonth, 1);
    const endDate = new Date(selectedYear, selectedMonth + 1, 0);
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    const monthlyExpenses = expenses.filter(expense => {
      const expenseDate = expense.date;
      return expenseDate >= startDateStr && expenseDate <= endDateStr;
    });
    
    const unbudgetedSpending = {};
    
    monthlyExpenses.forEach(expense => {
      if (!budgetedCategories.includes(expense.category)) {
        const cat = expense.category || 'Others';
        if (!unbudgetedSpending[cat]) {
          unbudgetedSpending[cat] = 0;
        }
        unbudgetedSpending[cat] += Number(expense.amount);
      }
    });
    
    return Object.entries(unbudgetedSpending)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount); // Sort by amount, highest first
  };

  const unbudgetedCategories = getUnbudgetedCategories();

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
          retryAction={fetchBudgets}
        />
        <BottomNavBar />
      </View>
    );
  }

  return (
    <>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginHorizontal: 16, 
          marginBottom: 16,
          paddingTop: 60
        }}>
          <Text style={{ 
            fontSize: 28, 
            fontWeight: 'bold', 
            color: colors.dark, 
            letterSpacing: 0.5, 
          }}>Budget</Text>
          
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
        
        {/* Month Selector */}
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: colors.card,
          borderRadius: 12,
          paddingVertical: 12,
          marginHorizontal: 16,
          marginBottom: 18,
          ...Theme.shadows.sm
        }}>
          <TouchableOpacity onPress={() => changeMonth(-1)} style={{ padding: 8 }}>
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          
          <Text style={{ 
            fontSize: 18, 
            fontWeight: 'bold', 
            color: colors.dark,
            marginHorizontal: 16
          }}>
            {getMonthName(selectedMonth)} {selectedYear}
          </Text>
          
          <TouchableOpacity onPress={() => changeMonth(1)} style={{ padding: 8 }}>
            <Ionicons name="chevron-forward" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
        
        {/* Total Budget Overview Card */}
        <View style={{ 
          backgroundColor: colors.card, 
          borderRadius: 14, 
          padding: 20, 
          marginBottom: 18,
          marginHorizontal: 16, 
          ...Theme.shadows.sm 
        }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.dark, marginBottom: 12 }}>
            Monthly Overview
          </Text>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
            <View>
              <Text style={{ fontSize: 14, color: colors.medium }}>Total Budget</Text>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.primary }}>
                ₹{totalBudget.toLocaleString('en-IN')}
              </Text>
            </View>
            <View>
              <Text style={{ fontSize: 14, color: colors.medium }}>Total Spent</Text>
              <Text style={{ 
                fontSize: 24, 
                fontWeight: 'bold', 
                color: totalSpent > totalBudget ? colors.error : colors.dark 
              }}>
                ₹{totalSpent.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
          
          {/* Overall Progress Bar */}
          <View style={{ 
            height: 10, 
            backgroundColor: `${colors.primary}20`, 
            borderRadius: 5, 
            overflow: 'hidden',
            marginBottom: 8
          }}>
            <Animated.View 
              style={{ 
                height: '100%', 
                width: `${overallPercentage}%`,
                backgroundColor: overallPercentage >= 90 ? colors.error : overallPercentage >= 70 ? '#FF9500' : colors.primary,
                borderRadius: 5
              }} 
            />
          </View>
          
          <Text style={{ 
            textAlign: 'right', 
            fontSize: 14, 
            fontWeight: '600',
            color: overallPercentage >= 90 ? colors.error : overallPercentage >= 70 ? '#FF9500' : colors.dark 
          }}>
            {overallPercentage.toFixed(0)}% of budget used
          </Text>
        </View>

        <ScrollView style={{ flex: 1 }}>
          {/* Category Budgets Section */}
          <View style={{ paddingBottom: 100 }}>
            <Text style={{ 
              fontSize: 18, 
              fontWeight: 'bold', 
              color: colors.dark, 
              marginHorizontal: 16,
              marginBottom: 12
            }}>
              Category Budgets
            </Text>
            
            {/* List of budgets */}
            <FlatList
              data={budgets}
              keyExtractor={(item) => item.id}
              renderItem={renderBudgetItem}
              scrollEnabled={false}
              ListEmptyComponent={() => (
                <View style={{ 
                  padding: 40,
                  alignItems: 'center',
                  marginHorizontal: 16,
                  backgroundColor: `${colors.primary}10`,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: `${colors.primary}20`,
                  borderStyle: 'dashed'
                }}>
                  <Ionicons name="wallet-outline" size={48} color={colors.primary} style={{ marginBottom: 16 }} />
                  <Text style={{ textAlign: 'center', color: colors.dark, fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>
                    No budgets set for this month
                  </Text>
                  <Text style={{ textAlign: 'center', color: colors.medium, fontSize: 14, marginBottom: 16 }}>
                    Set up budgets to track your spending against your goals
                  </Text>
                  <TouchableOpacity
                    style={{
                      backgroundColor: colors.primary,
                      paddingVertical: 12,
                      paddingHorizontal: 20,
                      borderRadius: 8,
                      alignItems: 'center'
                    }}
                    onPress={() => {
                      resetForm();
                      setShowAddModal(true);
                    }}
                  >
                    <Text style={{ color: colors.white, fontWeight: 'bold', fontSize: 16 }}>
                      Create Your First Budget
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            />
            
            {/* Unbudgeted Categories Section */}
            {unbudgetedCategories.length > 0 && (
              <View style={{ marginTop: 24 }}>
                <Text style={{ 
                  fontSize: 18, 
                  fontWeight: 'bold', 
                  color: colors.dark, 
                  marginHorizontal: 16,
                  marginBottom: 12
                }}>
                  Unbudgeted Spending
                </Text>
                
                {unbudgetedCategories.map((item, index) => (
                  <View key={`${item.category}-${index}`} style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: colors.card,
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 12,
                    ...Theme.shadows.sm,
                    marginHorizontal: 16,
                  }}>
                    <View style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      backgroundColor: `${colors.error}20`,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 14,
                    }}>
                      <Ionicons name={CATEGORY_ICONS[item.category] || 'alert-circle-outline'} size={22} color={colors.error} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.dark }}>{item.category}</Text>
                      <Text style={{ fontSize: 13, color: colors.medium }}>No budget set</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.error }}>
                        ₹{item.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </Text>
                      <TouchableOpacity
                        style={{ marginTop: 4, backgroundColor: `${colors.primary}20`, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}
                        onPress={() => {
                          resetForm();
                          setCategory(item.category);
                          setShowAddModal(true);
                        }}
                      >
                        <Text style={{ color: colors.primary, fontSize: 12, fontWeight: 'bold' }}>Create Budget</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
            
            {/* Budget Tips Section */}
            <View style={{ 
              backgroundColor: `${colors.primary}10`,
              borderRadius: 16,
              padding: 16,
              marginHorizontal: 16,
              marginTop: 24,
              borderWidth: 1,
              borderColor: `${colors.primary}20`,
            }}>
              <Text style={{ 
                fontSize: 18, 
                fontWeight: 'bold', 
                color: colors.dark, 
                marginBottom: 10 
              }}>
                Budget Tips
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name="bulb-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={{ color: colors.medium, flex: 1 }}>Try the 50/30/20 rule: 50% for needs, 30% for wants, and 20% for savings.</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name="bulb-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={{ color: colors.medium, flex: 1 }}>Review your spending habits monthly and adjust budgets accordingly.</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="bulb-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={{ color: colors.medium, flex: 1 }}>Create budgets for all categories to get a complete view of your finances.</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Add Budget Modal */}
        <Modal visible={showAddModal} animationType="slide" onRequestClose={() => setShowAddModal(false)}>
          <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
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
                  {isEditing ? 'Edit Budget' : 'Add Budget'}
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

              {/* Month Selection */}
              <Text style={{ marginBottom: 8, fontSize: 18, color: colors.dark }}>Month</Text>
              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                backgroundColor: colors.card,
                borderRadius: 8,
                padding: 12,
                marginBottom: 20,
                borderWidth: 1,
                borderColor: colors.light
              }}>
                <TouchableOpacity onPress={() => changeMonth(-1)} style={{ padding: 8 }}>
                  <Ionicons name="chevron-back" size={20} color={colors.primary} />
                </TouchableOpacity>
                
                <Text style={{ fontSize: 18, color: colors.dark }}>
                  {getMonthName(selectedMonth)} {selectedYear}
                </Text>
                
                <TouchableOpacity onPress={() => changeMonth(1)} style={{ padding: 8 }}>
                  <Ionicons name="chevron-forward" size={20} color={colors.primary} />
                </TouchableOpacity>
              </View>

              {/* Amount Field */}
              <Text style={{ marginBottom: 8, fontSize: 18, color: colors.dark }}>Budget Amount (₹)</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                <TextInput
                  style={{ 
                    borderWidth: 1, 
                    borderColor: inputHighlight.amount ? colors.error : colors.light, 
                    borderRadius: 8, 
                    padding: 12, 
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
                  placeholder="Enter budget amount"
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
                      backgroundColor: category === item ? (CATEGORY_ICONS[item] ? `${colors.primary}` : colors.primary) : `${colors.card}80`,
                      borderWidth: 1,
                      borderColor: category === item ? (CATEGORY_ICONS[item] ? `${colors.primary}` : colors.primary) : colors.light,
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
                      color={category === item ? colors.white : colors.primary}
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

              {/* Note Field */}
              <Text style={{ marginBottom: 8, fontSize: 18, color: colors.dark }}>Note (Optional)</Text>
              <TextInput
                style={{ 
                  borderWidth: 1, 
                  borderColor: colors.light, 
                  borderRadius: 8, 
                  padding: 12, 
                  marginBottom: 28, 
                  fontSize: 18,
                  color: colors.dark,
                  backgroundColor: colors.card
                }}
                value={note}
                onChangeText={setNote}
                placeholder="Add a note about this budget"
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
                  onPress={addBudget}
                >
                  <Ionicons name="checkmark-circle-outline" size={22} color={colors.white} style={{ marginRight: 8 }} />
                  <Text style={{ color: colors.white, fontWeight: 'bold', fontSize: 18 }}>
                    {isEditing ? 'Update Budget' : 'Save Budget'}
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

export default Budget;