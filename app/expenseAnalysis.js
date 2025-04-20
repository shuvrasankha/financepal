import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacity, 
  Dimensions,
  SafeAreaView 
} from 'react-native';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Ionicons } from '@expo/vector-icons';
import BottomNavBar from './components/BottomNavBar';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const ExpenseAnalysis = () => {
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [viewMode, setViewMode] = useState('monthly');
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
      } catch (e) {
        console.error('Error fetching expenses:', e);
        resetData();
      } finally {
        setLoading(false);
      }
    };

    fetchExpenses();
  }, []);

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

  const renderCategoryList = (categories) => {
    const sortedCategories = Object.entries(categories)
      .sort(([, a], [, b]) => b - a)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: (amount / (viewMode === 'monthly' ? summaryData.monthly.total : summaryData.yearly.total) * 100)
      }));

    return sortedCategories.map((item, index) => (
      <View key={item.category} style={styles.categoryItem}>
        <View style={styles.categoryHeader}>
          <View style={[styles.categoryIcon, { backgroundColor: `${chartColors[index % chartColors.length]}22` }]}>
            <Ionicons 
              name={getCategoryIcon(item.category)} 
              size={20} 
              color={chartColors[index % chartColors.length]} 
            />
          </View>
          <View style={styles.categoryInfo}>
            <Text style={styles.categoryName}>{item.category}</Text>
            <Text style={styles.categoryAmount}>₹{new Intl.NumberFormat('en-IN').format(item.amount)}</Text>
          </View>
          <Text style={styles.categoryPercentage}>{item.percentage.toFixed(1)}%</Text>
        </View>
        <View style={styles.percentageBar}>
          <View style={[styles.percentageFill, { 
            width: `${item.percentage}%`,
            backgroundColor: chartColors[index % chartColors.length]
          }]} />
        </View>
      </View>
    ));
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

    return (
      <View style={styles.barChartContainer}>
        {data.map((value, index) => (
          <View key={index} style={styles.barColumn}>
            <View style={styles.barWrapper}>
              <View style={[
                styles.bar, 
                { 
                  height: maxValue > 0 ? `${(value / maxValue * 100)}%` : 0,
                  backgroundColor: '#6366f1'
                }
              ]} />
            </View>
            <Text style={styles.barLabel}>{labels[index]}</Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <>
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Expense Analysis</Text>
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleButton, viewMode === 'monthly' && styles.toggleButtonActive]}
              onPress={() => setViewMode('monthly')}
            >
              <Text style={[styles.toggleButtonText, viewMode === 'monthly' && styles.toggleButtonTextActive]}>
                Monthly
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, viewMode === 'yearly' && styles.toggleButtonActive]}
              onPress={() => setViewMode('yearly')}
            >
              <Text style={[styles.toggleButtonText, viewMode === 'yearly' && styles.toggleButtonTextActive]}>
                Yearly
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366f1" />
          </View>
        ) : (
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.cardLabel}>
                {viewMode === 'monthly' ? 'Total Expenses This Year' : 'Total Expenses (5 Years)'}
              </Text>
              <Text style={styles.totalAmount}>
                ₹{new Intl.NumberFormat('en-IN').format(
                  viewMode === 'monthly' 
                    ? summaryData.monthly.total 
                    : summaryData.yearly.total
                )}
              </Text>
              {summaryData.monthly.monthlyChange !== null && viewMode === 'monthly' && (
                <View style={[
                  styles.changeIndicator,
                  { backgroundColor: summaryData.monthly.monthlyChange > 0 ? '#fef2f2' : '#f0fdf4' }
                ]}>
                  <Ionicons 
                    name={summaryData.monthly.monthlyChange > 0 ? 'trending-up' : 'trending-down'} 
                    size={20} 
                    color={summaryData.monthly.monthlyChange > 0 ? '#ef4444' : '#22c55e'} 
                  />
                  <Text style={[
                    styles.changeText,
                    { color: summaryData.monthly.monthlyChange > 0 ? '#ef4444' : '#22c55e' }
                  ]}>
                    {Math.abs(summaryData.monthly.monthlyChange).toFixed(1)}% 
                    {summaryData.monthly.monthlyChange > 0 ? ' increase' : ' decrease'} from last month
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.chartCard}>
              <Text style={styles.cardLabel}>
                {viewMode === 'monthly' ? 'Monthly Spending Pattern' : 'Yearly Spending Trend'}
              </Text>
              {renderBarChart()}
            </View>

            <View style={styles.categoriesCard}>
              <Text style={styles.cardLabel}>Spending by Category</Text>
              <View style={styles.categoriesList}>
                {renderCategoryList(
                  viewMode === 'monthly' 
                    ? summaryData.monthly.categories 
                    : summaryData.yearly.categories
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
    <BottomNavBar />
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
    backgroundColor: '#f9fafb',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 0, // Reduced from 90 to match the nav bar height
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
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
    backgroundColor: '#6366f1',
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  toggleButtonTextActive: {
    color: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    margin: 16,
    padding: 20,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  chartCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    margin: 16,
    marginTop: 0,
    padding: 20,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  categoriesCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    margin: 16,
    marginTop: 0,
    padding: 20,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 32,
  },
  cardLabel: {
    fontSize: 15,
    color: '#6b7280',
    marginBottom: 12,
    fontWeight: '500',
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
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
    backgroundColor: '#6366f1',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  barLabel: {
    fontSize: 12,
    color: '#6b7280',
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
    color: '#374151',
  },
  categoryAmount: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  categoryPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  percentageBar: {
    height: 4,
    backgroundColor: '#f3f4f6',
    borderRadius: 2,
    overflow: 'hidden',
    marginLeft: 48,
  },
  percentageFill: {
    height: '100%',
    borderRadius: 2,
  }
});

export default ExpenseAnalysis;
