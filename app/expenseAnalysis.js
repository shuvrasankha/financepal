import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacity, 
  Dimensions,
  SafeAreaView,
  Alert
} from 'react-native';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Ionicons } from '@expo/vector-icons';
import BottomNavBar from './components/BottomNavBar';
import LoadingState from './components/LoadingState';
import { useTheme } from '../contexts/ThemeContext';
import { useError } from '../contexts/ErrorContext';
import { useBudgets } from '../contexts/BudgetContext';
import Theme from '../constants/Theme';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const ExpenseAnalysis = () => {
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [viewMode, setViewMode] = useState('monthly');
  const [exporting, setExporting] = useState(false);
  const [summaryData, setSummaryData] = useState({
    monthly: {
      data: [],
      total: 0,
      categories: {},
      monthlyChange: null
    },
    yearly: {
      data: [],
      total: 0,
      categories: {}
    }
  });
  const { isDarkMode } = useTheme();
  const colors = isDarkMode ? Theme.dark.colors : Theme.light.colors;
  const { setError } = useError();
  const { budgets, getMonthlyBudgets, getBudgetForCategory, getTotalBudgetForMonth } = useBudgets();
  const [budgetInsights, setBudgetInsights] = useState({
    totalBudget: 0,
    budgetPerformance: 0,
    categoriesComparison: [],
    overBudgetCategories: [],
    underBudgetCategories: []
  });

  useEffect(() => {
    const fetchExpenses = async () => {
      setLoading(true);
      try {
        const user = auth.currentUser;
        if (!user) {
          setExpenses([]);
          setLoading(false);
          return;
        }

        const q = query(collection(db, 'expenses'), where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          amount: Number(doc.data().amount) || 0,
          date: new Date(doc.data().date)
        })).filter(exp => exp.amount > 0 && !isNaN(exp.date));

        // Sort by date
        data.sort((a, b) => b.date - a.date);
        setExpenses(data);

        // Process data for both views
        processData(data);
        
        // Process budget insights
        processBudgetInsights(data);
      } catch (e) {
        console.error('Error fetching expenses:', e);
        setError('Failed to load expense analysis. Please try again later.');
        resetData();
      } finally {
        setLoading(false);
      }
    };

    fetchExpenses();
  }, [setError]);

  const resetData = () => {
    setSummaryData({
      monthly: {
        data: Array(12).fill(0),
        total: 0,
        categories: {},
        monthlyChange: null
      },
      yearly: {
        data: [],
        total: 0,
        categories: {}
      }
    });
  };

  const processData = (data) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Monthly processing
    const monthlyData = Array(12).fill(0);
    const monthlyCategories = {};
    let monthlyTotal = 0;

    // Yearly processing
    const yearlyMap = new Map();
    const yearlyCategories = {};
    let yearlyTotal = 0;

    // Initialize last 5 years
    for (let i = currentYear - 4; i <= currentYear; i++) {
      yearlyMap.set(i, 0);
    }

    data.forEach(exp => {
      const expYear = exp.date.getFullYear();
      const expMonth = exp.date.getMonth();

      // Process monthly data
      if (expYear === currentYear) {
        if (expMonth <= currentMonth) {
          monthlyData[expMonth] += exp.amount;
          monthlyTotal += exp.amount;

          if (exp.category) {
            monthlyCategories[exp.category] = (monthlyCategories[exp.category] || 0) + exp.amount;
          }
        }
      }

      // Process yearly data
      if (yearlyMap.has(expYear)) {
        yearlyMap.set(expYear, yearlyMap.get(expYear) + exp.amount);
        yearlyTotal += exp.amount;

        if (exp.category) {
          yearlyCategories[exp.category] = (yearlyCategories[exp.category] || 0) + exp.amount;
        }
      }
    });

    // Calculate monthly change
    let monthlyChange = null;
    if (currentMonth > 0) {
      const thisMonth = monthlyData[currentMonth];
      const lastMonth = monthlyData[currentMonth - 1];
      if (lastMonth > 0) {
        monthlyChange = ((thisMonth - lastMonth) / lastMonth) * 100;
      }
    }

    // Convert yearly map to array
    const yearlyData = Array.from(yearlyMap).map(([year, total]) => ({
      year,
      total: Math.round(total * 100) / 100
    }));

    setSummaryData({
      monthly: {
        data: monthlyData,
        total: monthlyTotal,
        categories: monthlyCategories,
        monthlyChange
      },
      yearly: {
        data: yearlyData,
        total: yearlyTotal,
        categories: yearlyCategories
      }
    });
  };

  const processBudgetInsights = (expenses) => {
    // Get current date info
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // Adding 1 because getMonth() is 0-indexed
    
    // Get monthly budgets
    const monthlyBudgets = getMonthlyBudgets(currentYear, currentMonth);
    
    // Calculate total budget
    const totalBudget = getTotalBudgetForMonth(currentYear, currentMonth);
    
    // Get expenses for current month
    const monthStart = new Date(currentYear, currentMonth - 1, 1); // Month is 0-indexed in Date constructor
    const monthEnd = new Date(currentYear, currentMonth, 0);
    
    const currentMonthExpenses = expenses.filter(exp => 
      exp.date >= monthStart && exp.date <= monthEnd
    );
    
    // Calculate total expenses for the month
    const totalExpenses = currentMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    // Calculate budget performance (percentage of budget used)
    const budgetPerformance = totalBudget > 0 ? (totalExpenses / totalBudget) * 100 : 0;
    
    // Analyze by category
    const expensesByCategory = {};
    currentMonthExpenses.forEach(exp => {
      if (exp.category) {
        if (!expensesByCategory[exp.category]) {
          expensesByCategory[exp.category] = 0;
        }
        expensesByCategory[exp.category] += exp.amount;
      }
    });
    
    // Compare expenses against budget by category
    const categoriesComparison = [];
    const overBudgetCategories = [];
    const underBudgetCategories = [];
    
    Object.entries(expensesByCategory).forEach(([category, amount]) => {
      const budget = getBudgetForCategory(category, currentYear, currentMonth);
      
      if (budget) {
        const budgetAmount = Number(budget.amount);
        const percentUsed = (amount / budgetAmount) * 100;
        const comparison = {
          category,
          budgetAmount,
          actualAmount: amount,
          percentUsed,
          remaining: budgetAmount - amount,
          status: percentUsed > 100 ? 'over' : percentUsed > 80 ? 'warning' : 'good'
        };
        
        categoriesComparison.push(comparison);
        
        if (percentUsed > 100) {
          overBudgetCategories.push(comparison);
        } else {
          underBudgetCategories.push(comparison);
        }
      } else {
        // Category without a budget
        categoriesComparison.push({
          category,
          budgetAmount: 0,
          actualAmount: amount,
          percentUsed: Infinity,
          remaining: -amount,
          status: 'noBudget'
        });
        
        overBudgetCategories.push({
          category,
          budgetAmount: 0,
          actualAmount: amount,
          percentUsed: Infinity,
          remaining: -amount,
          status: 'noBudget'
        });
      }
    });
    
    // Sort by percentage used (highest first)
    categoriesComparison.sort((a, b) => b.percentUsed - a.percentUsed);
    overBudgetCategories.sort((a, b) => b.percentUsed - a.percentUsed);
    underBudgetCategories.sort((a, b) => b.percentUsed - a.percentUsed);
    
    setBudgetInsights({
      totalBudget,
      budgetPerformance,
      categoriesComparison,
      overBudgetCategories,
      underBudgetCategories
    });
  };

  // Add export functionality
  const exportExpensesToCSV = async () => {
    try {
      setExporting(true);
      
      // Check if sharing is available
      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (!isSharingAvailable) {
        Alert.alert('Error', 'Sharing is not available on this device');
        setExporting(false);
        return;
      }
      
      // Create CSV header
      let csvContent = 'Date,Category,Amount,Description\n';
      
      // Add expense data rows
      expenses.forEach(expense => {
        const date = expense.date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
        const category = expense.category || 'Uncategorized';
        const amount = expense.amount;
        // Escape description to handle commas, quotes, etc.
        const description = expense.description 
          ? `"${expense.description.replace(/"/g, '""')}"` 
          : '';
        
        csvContent += `${date},${category},${amount},${description}\n`;
      });
      
      // Generate a filename with current date
      const fileName = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      // Write the file
      await FileSystem.writeAsStringAsync(fileUri, csvContent);
      
      // Share the file
      await Sharing.shareAsync(fileUri);
      
      setExporting(false);
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Export Failed', 'There was an error exporting your expenses');
      setExporting(false);
    }
  };

  const renderCategoryList = (categories) => {
    const sortedCategories = Object.entries(categories)
      .sort(([, a], [, b]) => b - a)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: (amount / (viewMode === 'monthly' ? summaryData.monthly.total : summaryData.yearly.total) * 100)
      }));

    return sortedCategories.map((item, index) => {
      // Enhance color opacity in dark mode for better visibility
      const iconBgOpacity = isDarkMode ? '33' : '22';
      const color = chartColors[index % chartColors.length];
      
      return (
        <View key={item.category} style={styles.categoryItem}>
          <View style={styles.categoryHeader}>
            <View style={[styles.categoryIcon, { backgroundColor: `${color}${iconBgOpacity}` }]}>
              <Ionicons 
                name={getCategoryIcon(item.category)} 
                size={20} 
                color={color} 
              />
            </View>
            <View style={styles.categoryInfo}>
              <Text style={[styles.categoryName, { 
                color: colors.dark,
                fontWeight: isDarkMode ? '600' : '500' // Bolder in dark mode for better visibility
              }]}>{item.category}</Text>
              <Text style={[styles.categoryAmount, { 
                color: isDarkMode ? colors.white : colors.medium 
              }]}>₹{new Intl.NumberFormat('en-IN').format(item.amount)}</Text>
            </View>
            <Text style={[styles.categoryPercentage, { 
              color: isDarkMode ? '#e0e0e0' : colors.dark 
            }]}>{item.percentage.toFixed(1)}%</Text>
          </View>
          <View style={[styles.percentageBar, { 
            backgroundColor: isDarkMode ? colors.borderDark : colors.light
          }]}>
            <View style={[styles.percentageFill, { 
              width: `${item.percentage}%`,
              backgroundColor: color,
              // Add minimum width for very small percentages
              minWidth: 4
            }]} />
          </View>
        </View>
      );
    });
  };

  const getCategoryIcon = (category) => {
    const icons = {
      Food: 'fast-food-outline',
      Transport: 'car-outline',
      Shopping: 'cart-outline',
      Bills: 'document-text-outline',
      Entertainment: 'game-controller-outline',
      Healthcare: 'medical-outline',
      Education: 'school-outline',
      Travel: 'airplane-outline',
      Others: 'apps-outline'
    };
    return icons[category] || 'pricetag-outline';
  };

  const renderBarChart = () => {
    const data = viewMode === 'monthly' 
      ? summaryData.monthly.data 
      : summaryData.yearly.data.map(item => item.total);
    
    const labels = viewMode === 'monthly'
      ? months
      : summaryData.yearly.data.map(item => item.year);

    const maxValue = Math.max(...data);
    // Set a higher contrast color for the bars in dark mode
    const barColor = isDarkMode ? '#8a84ff' : colors.primary;

    return (
      <View style={styles.barChartContainer}>
        {data.map((value, index) => (
          <View key={index} style={styles.barColumn}>
            <View style={styles.barWrapper}>
              <View style={[
                styles.bar, 
                { 
                  height: maxValue > 0 ? `${Math.max((value / maxValue * 100), 2)}%` : 2, // Minimum height of 2% for visibility
                  backgroundColor: barColor,
                  // Add a border in dark mode for better visibility
                  borderWidth: isDarkMode ? 1 : 0,
                  borderColor: isDarkMode ? '#a9a9ff' : 'transparent',
                }
              ]} />
            </View>
            <Text style={[styles.barLabel, { 
              color: isDarkMode ? '#e0e0e0' : colors.medium,
              fontWeight: isDarkMode ? '500' : '400'
            }]}>{labels[index]}</Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <>
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.dark }]}>Expense Analysis</Text>
          <View style={[styles.toggleContainer, { backgroundColor: colors.light }]}>
            <TouchableOpacity
              style={[
                styles.toggleButton, 
                viewMode === 'monthly' && [styles.toggleButtonActive, { backgroundColor: colors.primary }]
              ]}
              onPress={() => setViewMode('monthly')}
            >
              <Text style={[
                styles.toggleButtonText, 
                { color: colors.medium },
                viewMode === 'monthly' && [styles.toggleButtonTextActive, { color: colors.white }]
              ]}>
                Monthly
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton, 
                viewMode === 'yearly' && [styles.toggleButtonActive, { backgroundColor: colors.primary }]
              ]}
              onPress={() => setViewMode('yearly')}
            >
              <Text style={[
                styles.toggleButtonText, 
                { color: colors.medium },
                viewMode === 'yearly' && [styles.toggleButtonTextActive, { color: colors.white }]
              ]}>
                Yearly
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <LoadingState type="skeleton" />
        ) : (
          <>
            <View style={[styles.summaryCard, { backgroundColor: colors.card, shadowColor: colors.primary }]}>
              <Text style={[styles.cardLabel, { color: colors.medium }]}>
                {viewMode === 'monthly' ? 'Total Expenses This Year' : 'Total Expenses (5 Years)'}
              </Text>
              <Text style={[styles.totalAmount, { color: colors.dark }]}>
                ₹{new Intl.NumberFormat('en-IN').format(
                  viewMode === 'monthly' 
                    ? summaryData.monthly.total 
                    : summaryData.yearly.total
                )}
              </Text>
              {summaryData.monthly.monthlyChange !== null && viewMode === 'monthly' && (
                <View style={[
                  styles.changeIndicator,
                  { 
                    backgroundColor: isDarkMode
                      ? (summaryData.monthly.monthlyChange > 0 ? `${colors.error}20` : `${colors.success}20`)
                      : (summaryData.monthly.monthlyChange > 0 ? '#fef2f2' : '#f0fdf4')
                  }
                ]}>
                  <Ionicons 
                    name={summaryData.monthly.monthlyChange > 0 ? 'trending-up' : 'trending-down'} 
                    size={20} 
                    color={summaryData.monthly.monthlyChange > 0 ? colors.error : colors.success} 
                  />
                  <Text style={[
                    styles.changeText,
                    { color: summaryData.monthly.monthlyChange > 0 ? colors.error : colors.success }
                  ]}>
                    {Math.abs(summaryData.monthly.monthlyChange).toFixed(1)}% 
                    {summaryData.monthly.monthlyChange > 0 ? ' increase' : ' decrease'} from last month
                  </Text>
                </View>
              )}
            </View>

            <View style={[styles.chartCard, { backgroundColor: colors.card, shadowColor: colors.primary }]}>
              <Text style={[styles.cardLabel, { color: colors.medium }]}>
                {viewMode === 'monthly' ? 'Monthly Spending Pattern' : 'Yearly Spending Trend'}
              </Text>
              {renderBarChart()}
            </View>

            <View style={[styles.categoriesCard, { backgroundColor: colors.card, shadowColor: colors.primary }]}>
              <Text style={[styles.cardLabel, { color: colors.medium }]}>Spending by Category</Text>
              <View style={styles.categoriesList}>
                {renderCategoryList(
                  viewMode === 'monthly' 
                    ? summaryData.monthly.categories 
                    : summaryData.yearly.categories
                )}
              </View>
            </View>
            
            {/* Budget Insights Section - Only show for monthly view */}
            {viewMode === 'monthly' && (
              <View style={[styles.budgetInsightsCard, { backgroundColor: colors.card, shadowColor: colors.primary }]}>
                <Text style={[styles.cardLabel, { color: colors.medium }]}>Budget Insights</Text>
                
                {budgetInsights.totalBudget > 0 ? (
                  <>
                    <View style={styles.budgetOverview}>
                      <View style={styles.budgetInfoColumn}>
                        <Text style={[styles.budgetLabel, { color: colors.medium }]}>Monthly Budget</Text>
                        <Text style={[styles.budgetAmount, { color: colors.primary }]}>
                          ₹{new Intl.NumberFormat('en-IN').format(budgetInsights.totalBudget)}
                        </Text>
                      </View>
                      <View style={styles.budgetInfoColumn}>
                        <Text style={[styles.budgetLabel, { color: colors.medium }]}>Used</Text>
                        <Text style={[styles.budgetAmount, { 
                          color: budgetInsights.budgetPerformance > 100 ? colors.error : 
                                 budgetInsights.budgetPerformance > 80 ? '#f59e0b' : colors.success 
                        }]}>
                          {budgetInsights.budgetPerformance.toFixed(0)}%
                        </Text>
                      </View>
                    </View>
                    
                    {/* Budget progress bar */}
                    <View style={[styles.budgetProgressContainer, { backgroundColor: `${colors.primary}15` }]}>
                      <View 
                        style={[
                          styles.budgetProgressFill, 
                          { 
                            width: `${Math.min(budgetInsights.budgetPerformance, 100)}%`,
                            backgroundColor: budgetInsights.budgetPerformance > 100 ? colors.error : 
                                            budgetInsights.budgetPerformance > 80 ? '#f59e0b' : colors.success
                          }
                        ]} 
                      />
                    </View>
                    
                    {/* Categories over budget */}
                    {budgetInsights.overBudgetCategories.length > 0 && (
                      <View style={styles.budgetCategoriesSection}>
                        <Text style={[styles.budgetCategoryTitle, { color: colors.error }]}>
                          Categories Over Budget
                        </Text>
                        
                        {budgetInsights.overBudgetCategories.map((item, index) => (
                          <View key={`over-${item.category}`} style={styles.budgetCategoryItem}>
                            <View style={styles.budgetCategoryHeader}>
                              <View style={[styles.categoryIcon, { 
                                backgroundColor: `${colors.error}20`,
                                marginRight: 10
                              }]}>
                                <Ionicons name={getCategoryIcon(item.category)} size={18} color={colors.error} />
                              </View>
                              <View style={styles.budgetCategoryInfo}>
                                <Text style={[styles.budgetCategoryName, { color: colors.dark }]}>
                                  {item.category}
                                </Text>
                                <View style={styles.budgetAmountsRow}>
                                  <Text style={[styles.budgetCategoryAmount, { color: colors.medium }]}>
                                    ₹{new Intl.NumberFormat('en-IN').format(item.actualAmount)} / 
                                    {item.budgetAmount === 0 ? ' No Budget' : 
                                      ` ₹${new Intl.NumberFormat('en-IN').format(item.budgetAmount)}`}
                                  </Text>
                                  <Text style={[styles.budgetCategoryOverage, { color: colors.error }]}>
                                    {item.budgetAmount === 0 ? '' : 
                                      `+${(item.percentUsed - 100).toFixed(0)}%`}
                                  </Text>
                                </View>
                              </View>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                    
                    {/* Categories under budget */}
                    {budgetInsights.underBudgetCategories.length > 0 && (
                      <View style={styles.budgetCategoriesSection}>
                        <Text style={[styles.budgetCategoryTitle, { color: colors.success }]}>
                          Categories Within Budget
                        </Text>
                        
                        {budgetInsights.underBudgetCategories.map((item, index) => (
                          <View key={`under-${item.category}`} style={styles.budgetCategoryItem}>
                            <View style={styles.budgetCategoryHeader}>
                              <View style={[styles.categoryIcon, { 
                                backgroundColor: `${colors.success}20`,
                                marginRight: 10
                              }]}>
                                <Ionicons name={getCategoryIcon(item.category)} size={18} color={colors.success} />
                              </View>
                              <View style={styles.budgetCategoryInfo}>
                                <Text style={[styles.budgetCategoryName, { color: colors.dark }]}>
                                  {item.category}
                                </Text>
                                <View style={styles.budgetAmountsRow}>
                                  <Text style={[styles.budgetCategoryAmount, { color: colors.medium }]}>
                                    ₹{new Intl.NumberFormat('en-IN').format(item.actualAmount)} / 
                                    ₹{new Intl.NumberFormat('en-IN').format(item.budgetAmount)}
                                  </Text>
                                  <Text style={[styles.budgetCategoryRemaining, { color: colors.success }]}>
                                    ₹{new Intl.NumberFormat('en-IN').format(item.remaining)} left
                                  </Text>
                                </View>
                              </View>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </>
                ) : (
                  <View style={styles.noBudgetContainer}>
                    <Ionicons name="wallet-outline" size={48} color={colors.primary} style={styles.noBudgetIcon} />
                    <Text style={[styles.noBudgetTitle, { color: colors.dark }]}>No budgets set</Text>
                    <Text style={[styles.noBudgetDescription, { color: colors.medium }]}>
                      Create budgets in the Budget section to see how your spending compares to your financial goals.
                    </Text>
                  </View>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
    <BottomNavBar />
    {/* Export FAB Button */}
    <TouchableOpacity 
      style={[
        styles.exportFAB, 
        { backgroundColor: colors.primary },
        exporting && { opacity: 0.7 }
      ]}
      onPress={exportExpensesToCSV}
      disabled={exporting || expenses.length === 0}
    >
      {exporting ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <Ionicons name="download-outline" size={24} color="#fff" />
      )}
    </TouchableOpacity>
    {/* Add some empty space at the bottom for better scroll padding */}
    <View style={{ height: 80 }} />
    </>
  );
};

const chartColors = [
  '#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', 
  '#06b6d4', '#ec4899', '#f97316', '#10b981', '#6b7280'
];

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 0, // Reduced from 90 to match the nav bar height
  },
  header: {
    padding: 20,
    paddingTop: 60, // Updated to match other pages in the app
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    alignSelf: 'flex-start',
  },
  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  toggleButtonActive: {
    // Color will be applied dynamically
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  toggleButtonTextActive: {
    // Color will be applied dynamically
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  summaryCard: {
    borderRadius: 16,
    margin: 16,
    padding: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  chartCard: {
    borderRadius: 16,
    margin: 16,
    marginTop: 0,
    padding: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  categoriesCard: {
    borderRadius: 16,
    margin: 16,
    marginTop: 0,
    padding: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 32,
  },
  cardLabel: {
    fontSize: 15,
    marginBottom: 12,
    fontWeight: '500',
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: '700',
  },
  changeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  changeText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  barChartContainer: {
    flexDirection: 'row',
    height: 200,
    alignItems: 'flex-end',
    paddingTop: 20,
    paddingBottom: 20,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
  },
  barWrapper: {
    width: '60%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  barLabel: {
    fontSize: 12,
    marginTop: 8,
  },
  categoriesList: {
    marginTop: 8,
  },
  categoryItem: {
    marginBottom: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
  },
  categoryAmount: {
    fontSize: 13,
    marginTop: 2,
  },
  categoryPercentage: {
    fontSize: 14,
    fontWeight: '600',
  },
  percentageBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginLeft: 48,
  },
  percentageFill: {
    height: '100%',
    borderRadius: 2,
  },
  budgetInsightsCard: {
    borderRadius: 16,
    margin: 16,
    marginTop: 0,
    padding: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 32,
  },
  budgetOverview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  budgetInfoColumn: {
    flex: 1,
    alignItems: 'center',
  },
  budgetLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  budgetAmount: {
    fontSize: 24,
    fontWeight: '700',
  },
  budgetProgressContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  budgetProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  budgetCategoriesSection: {
    marginBottom: 16,
  },
  budgetCategoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  budgetCategoryItem: {
    marginBottom: 12,
  },
  budgetCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  budgetCategoryInfo: {
    flex: 1,
  },
  budgetCategoryName: {
    fontSize: 14,
    fontWeight: '500',
  },
  budgetAmountsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetCategoryAmount: {
    fontSize: 13,
  },
  budgetCategoryOverage: {
    fontSize: 13,
    fontWeight: '600',
  },
  budgetCategoryRemaining: {
    fontSize: 13,
    fontWeight: '600',
  },
  noBudgetContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noBudgetIcon: {
    marginBottom: 12,
  },
  noBudgetTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  noBudgetDescription: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  exportFAB: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});

export default ExpenseAnalysis;
