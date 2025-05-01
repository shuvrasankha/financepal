import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl, 
  ActivityIndicator, 
  Modal,
  StatusBar,
  Image,
  Platform,
  useWindowDimensions,
  Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, Timestamp, getDoc, doc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import BottomNavBar from './components/BottomNavBar';
import WebNavBar from './components/WebNavBar';
import { LinearGradient } from 'expo-linear-gradient';
import Theme from '../constants/Theme';
import { useTheme } from '../contexts/ThemeContext';

export default function Home() {
  const router = useRouter();
  const user = auth.currentUser;
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [profilePic, setProfilePic] = useState(null);

  const [totals, setTotals] = useState({
    expenses: 0,
    lent: 0,
    pendingRepayments: 0,
    investments: 0
  });

  const [pendingLent, setPendingLent] = useState(0);
  const [investmentTotal, setInvestmentTotal] = useState(0);
  const [budgetTotal, setBudgetTotal] = useState(0);

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showYearPicker, setShowYearPicker] = useState(false);
  
  // Add state for recent transactions
  const [recentTransactions, setRecentTransactions] = useState([]);

  const { isDarkMode } = useTheme();
  // Get current theme colors
  const colors = isDarkMode ? Theme.dark.colors : Theme.light.colors;
  const shadows = isDarkMode ? Theme.shadowsDark : Theme.shadows;

  const fetchSummaryData = async (year = selectedYear) => {
    try {
      if (!user || !user.uid) {
        console.log('No authenticated user');
        return;
      }
      setLoading(true);

      console.log('Fetching expenses for:', user.uid, 'year:', year);

      // Simple query with just userId
      const expensesQuery = query(
        collection(db, 'expenses'),
        where('userId', '==', user.uid)
      );

      const expensesSnapshot = await getDocs(expensesQuery);
      console.log('All expenses docs found:', expensesSnapshot.size);
      
      // Filter by year in JavaScript
      const expensesTotal = expensesSnapshot.docs.reduce((acc, doc) => {
        const data = doc.data();
        const expenseDate = new Date(data.date);
        const expenseYear = expenseDate.getFullYear();
        
        // Only sum expenses for selected year
        if (expenseYear === year) {
          const amount = Number(data.amount) || 0;
          console.log('Adding expense:', { date: data.date, amount });
          return acc + amount;
        }
        return acc;
      }, 0);

      console.log('Total expenses for year:', expensesTotal);

      setTotals(prev => ({
        ...prev,
        expenses: expensesTotal
      }));

    } catch (err) {
      console.error('Error fetching expenses:', err);
      console.error('Error details:', err.message);
      setTotals(prev => ({
        ...prev,
        expenses: 0
      }));
    } finally {
      setLoading(false);
    }
  };

  // Fetch total pending lent amount
  const fetchPendingLent = async () => {
    try {
      if (!user || !user.uid) return;
      const q = query(collection(db, 'loans'), where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      // Sum all latest pendingAmount for each contact
      const latestByContact = {};
      querySnapshot.forEach(docSnap => {
        const data = docSnap.data();
        const contact = data.contact || 'Unknown';
        const createdAt = data.createdAt || '';
        if (!latestByContact[contact] || createdAt > latestByContact[contact].createdAt) {
          latestByContact[contact] = { pendingAmount: data.pendingAmount || 0, createdAt };
        }
      });
      let total = 0;
      Object.values(latestByContact).forEach(val => {
        if (val.pendingAmount > 0) total += val.pendingAmount;
      });
      setPendingLent(total);
    } catch (err) {
      setPendingLent(0);
    }
  };

  // Fetch total investment amount from Firestore
  const fetchInvestmentTotal = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const q = query(collection(db, 'investments'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      const total = snapshot.docs.reduce((sum, doc) => sum + (Number(doc.data().amount) || 0), 0);
      setInvestmentTotal(total);
    } catch (e) {
      setInvestmentTotal(0);
    }
  };

  // Fetch total budget amount for selected year
  const fetchBudgetTotal = async (year = selectedYear) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      // Query budgets for the selected year
      const q = query(
        collection(db, 'budgets'), 
        where('userId', '==', user.uid)
      );
      
      const snapshot = await getDocs(q);
      let total = 0;
      
      // Filter by year in JavaScript and sum the amounts
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const period = data.period || '';
        const budgetYear = parseInt(period.split('-')[0]);
        
        if (budgetYear === year) {
          total += (Number(data.amount) || 0);
        }
      });
      
      setBudgetTotal(total);
    } catch (e) {
      console.error('Error fetching budget total:', e);
      setBudgetTotal(0);
    }
  };

  // Fetch user's profile information from Firestore
  const fetchUserProfile = async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserName(userData.firstName || '');
        setProfilePic(userData.photoURL || null);
      } else {
        setUserName('');
        setProfilePic(null);
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setUserName('');
      setProfilePic(null);
    }
  };
  
  // Fetch recent transactions
  const fetchRecentTransactions = async () => {
    try {
      if (!user || !user.uid) return;
      
      const q = query(
        collection(db, 'expenses'),
        where('userId', '==', user.uid)
      );
      
      const snapshot = await getDocs(q);
      const transactions = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5); // Get only the 5 most recent transactions
        
      setRecentTransactions(transactions);
    } catch (err) {
      console.error('Error fetching recent transactions:', err);
      setRecentTransactions([]);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (user && user.uid) {
      await Promise.all([
        fetchSummaryData(selectedYear),
        fetchPendingLent(),
        fetchInvestmentTotal(),
        fetchRecentTransactions(),
        fetchBudgetTotal(selectedYear)
      ]);
    }
    setRefreshing(false);
  }, [selectedYear, user]);

  // Update the useEffect hook to fetch all necessary data
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        fetchUserProfile(currentUser.uid);
        fetchSummaryData(selectedYear);
        fetchPendingLent();
        fetchInvestmentTotal();
        fetchRecentTransactions();
        fetchBudgetTotal(selectedYear);
      } else {
        router.replace('/login');
      }
    });

    return () => unsubscribe();
  }, []);

  // This effect will run whenever selectedYear changes
  useEffect(() => {
    if (user) {
      fetchSummaryData(selectedYear);
      fetchBudgetTotal(selectedYear);
    }
  }, [selectedYear]);

  const formatINR = (amount) => `₹${amount.toLocaleString('en-IN')}`;
  
  // Generate default profile image with user's initials
  const generateInitialsImage = () => {
    const initial = userName.charAt(0) || '?';
    return `https://ui-avatars.com/api/?name=${initial}&size=150&background=8B5CF6&color=ffffff`;
  };

  // Year selector component
  const YearSelector = () => {
    const currentYear = new Date().getFullYear();
    const years = Array.from({length: 5}, (_, i) => currentYear - i);

    return (
      <Modal
        visible={showYearPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowYearPicker(false)}
      >
        <TouchableOpacity 
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
          }} 
          onPress={() => setShowYearPicker(false)}
          activeOpacity={1}
        >
          <View style={{
            backgroundColor: colors.card,
            borderRadius: Theme.borderRadius.lg,
            padding: Theme.spacing.lg,
            width: '80%',
            maxWidth: 300,
            ...shadows.lg
          }}>
            <Text style={{
              fontSize: Theme.typography.fontSizes.lg,
              fontWeight: Theme.typography.fontWeights.bold,
              color: colors.dark,
              marginBottom: Theme.spacing.md,
              textAlign: 'center'
            }}>
              Select Year
            </Text>
            {years.map(year => (
              <TouchableOpacity
                key={year}
                style={{
                  paddingVertical: Theme.spacing.md,
                  backgroundColor: selectedYear === year 
                    ? colors.primaryLight 
                    : colors.card,
                  borderRadius: Theme.borderRadius.md,
                  marginBottom: Theme.spacing.sm,
                  alignItems: 'center',
                  borderWidth: selectedYear === year ? 1 : 0,
                  borderColor: colors.primary,
                }}
                onPress={() => {
                  setSelectedYear(year);
                  setShowYearPicker(false);
                }}
              >
                <Text style={{
                  fontSize: Theme.typography.fontSizes.lg,
                  fontWeight: selectedYear === year 
                    ? Theme.typography.fontWeights.bold 
                    : Theme.typography.fontWeights.medium,
                  color: selectedYear === year 
                    ? colors.primary 
                    : colors.dark,
                }}>
                  {year}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };
  
  // Card colors configuration
  const cardConfigs = {
    expenses: {
      icon: "wallet-outline",
      color: colors.primary,
      bgColor: `${colors.primary}15`,
      title: "Expenses",
      route: "/expense"
    },
    budget: {
      icon: "calculator-outline",
      color: "#f59e0b", // Yellow color (Amber 600 from Tailwind)
      bgColor: "#f59e0b15", // Light yellow background
      title: "Budget",
      route: "/budget"
    },
    lent: {
      icon: "arrow-up-outline",
      color: colors.success,
      bgColor: `${colors.success}15`,
      title: "Lent Money",
      route: "/lending"
    },
    investments: {
      icon: "trending-up-outline",
      color: colors.info,
      bgColor: `${colors.info}15`,
      title: "Investments",
      route: "/investment"
    }
  };
  
  // Get category color for expense items
  const getCategoryColor = (category) => {
    const categoryColors = {
      Food: colors.success,
      Transport: colors.info,
      Shopping: colors.warning,
      Entertainment: '#8b5cf6',
      Bills: colors.error,
      Healthcare: '#06b6d4',
      Education: '#ec4899',
      Travel: '#f97316',
      Groceries: '#10b981',
      Others: colors.medium
    };
    
    return categoryColors[category] || colors.medium;
  };
  
  // Map categories to Ionicons icons
  const getCategoryIcon = (category) => {
    const categoryIcons = {
      Food: 'fast-food-outline',
      Transport: 'car-outline',
      Shopping: 'cart-outline',
      Entertainment: 'musical-notes-outline',
      Bills: 'document-text-outline',
      Healthcare: 'medkit-outline',
      Education: 'school-outline',
      Travel: 'airplane-outline',
      Groceries: 'basket-outline',
      Others: 'ellipsis-horizontal-circle-outline',
    };
    return categoryIcons[category] || 'card-outline';
  };

  // Format date to readable format
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Render a financial stat card
  const FinancialCard = ({ type, amount }) => {
    const config = cardConfigs[type];
    
    return (
      <TouchableOpacity 
        style={{
          width: '48%',
          backgroundColor: colors.card,
          borderRadius: Theme.borderRadius.lg,
          padding: Theme.spacing.md,
          marginBottom: Theme.spacing.md,
          ...shadows.md,
          elevation: 3,
          borderWidth: 1,
          borderColor: `${config.color}40`
        }}
        onPress={() => router.push(config.route)}
        activeOpacity={0.8}
      >
        <View style={{ 
          flexDirection: 'column',
          alignItems: 'flex-start',
          marginBottom: Theme.spacing.sm 
        }}>
          <View style={{
            backgroundColor: config.bgColor,
            borderRadius: Theme.borderRadius.md,
            width: 48,
            height: 48,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: Theme.spacing.sm
          }}>
            <Ionicons name={config.icon} size={24} color={config.color} />
          </View>
          
          <Text style={{
            fontSize: Theme.typography.fontSizes.md,
            fontWeight: Theme.typography.fontWeights.semiBold,
            color: colors.dark,
            marginTop: Theme.spacing.xs
          }}>
            {config.title}
          </Text>
          
          <Text style={{
            fontSize: Theme.typography.fontSizes.xl,
            fontWeight: Theme.typography.fontWeights.bold,
            color: config.color,
            marginTop: Theme.spacing.sm,
          }}>
            {formatINR(amount)}
          </Text>
        </View>
        
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: 'auto',
          paddingTop: Theme.spacing.sm,
          borderTopWidth: 1,
          borderTopColor: `${config.color}20`
        }}>
          <Text style={{
            fontSize: Theme.typography.fontSizes.sm,
            color: config.color,
            fontWeight: Theme.typography.fontWeights.semiBold,
          }}>
            View Details
          </Text>
          <Ionicons name="chevron-forward" size={14} color={config.color} style={{ marginLeft: 2 }} />
        </View>
      </TouchableOpacity>
    );
  };
  
  // Render a transaction item
  const TransactionItem = ({ transaction }) => {
    const categoryColor = getCategoryColor(transaction.category);
    const iconName = getCategoryIcon(transaction.category);
    return (
      <TouchableOpacity 
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.card,
          padding: Theme.spacing.md,
          borderRadius: Theme.borderRadius.md,
          marginBottom: Theme.spacing.sm,
          ...shadows.sm,
        }}
        onPress={() => router.push({ pathname: '/expense', params: { id: transaction.id } })}
        activeOpacity={0.7}
      >
        <View style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: `${categoryColor}20`,
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: Theme.spacing.md,
        }}>
          <Ionicons name={iconName} size={20} color={categoryColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: Theme.typography.fontSizes.md,
            fontWeight: Theme.typography.fontWeights.semiBold,
            color: colors.dark,
            marginBottom: 2,
          }}>
            {transaction.note || transaction.category}
          </Text>
          <Text style={{
            fontSize: Theme.typography.fontSizes.sm,
            color: colors.medium,
          }}>
            {formatDate(transaction.date)}
          </Text>
        </View>
        <Text style={{
          fontSize: Theme.typography.fontSizes.md,
          fontWeight: Theme.typography.fontWeights.bold,
          color: colors.error,
        }}>
          -₹{transaction.amount}
        </Text>
      </TouchableOpacity>
    );
  };

  const dimensions = useWindowDimensions();
  const isDesktop = dimensions.width >= 1024;
  const isTablet = dimensions.width >= 768 && dimensions.width < 1024;
  const isMobile = dimensions.width < 768;

  // Main render
  if (loading && !refreshing) {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
      }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      
      {/* WebNavBar for tablet and desktop */}
      {!isMobile && <WebNavBar />}
      
      <View style={{ 
        flex: 1, 
        backgroundColor: colors.background,
        paddingTop: !isMobile ? 54 : 0, // Add padding for the WebNavBar height
      }}>
        <ScrollView
          contentContainerStyle={{ 
            paddingBottom: isMobile ? 120 : 40,
            maxWidth: isDesktop ? 1200 : '100%',
            alignSelf: isDesktop ? 'center' : undefined,
            width: isDesktop ? '100%' : undefined,
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Header */}
          <View
            style={{
              backgroundColor: colors.background,
              paddingTop: isMobile ? 60 : 30,
              paddingBottom: 30,
              paddingHorizontal: Theme.spacing.lg,
            }}
          >
            <View style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: Theme.spacing.md,
            }}>
              <View>
                <Text style={{
                  fontSize: Theme.typography.fontSizes.md,
                  color: colors.medium,
                  marginBottom: 4,
                }}>
                  Welcome back
                </Text>
                <Text style={{
                  fontSize: isDesktop ? Theme.typography.fontSizes.xxl : Theme.typography.fontSizes.xl + 2,
                  fontWeight: Theme.typography.fontWeights.bold,
                  color: colors.dark,
                }}>
                  {userName || 'User'}
                </Text>
              </View>
              
              <TouchableOpacity
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 23,
                  overflow: 'hidden',
                  ...shadows.sm,
                }}
                onPress={() => router.push('/settings')}
              >
                <Image
                  source={{ uri: profilePic || generateInitialsImage() }}
                  style={{ width: '100%', height: '100%' }}
                />
              </TouchableOpacity>
            </View>
            
            {/* Year selector pill */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: colors.card,
                  paddingVertical: Theme.spacing.sm,
                  paddingHorizontal: Theme.spacing.md,
                  borderRadius: 20,
                  ...shadows.sm,
                }}
                onPress={() => setShowYearPicker(true)}
              >
                <Text style={{
                  color: colors.dark,
                  fontWeight: Theme.typography.fontWeights.medium,
                  fontSize: Theme.typography.fontSizes.md,
                  marginRight: Theme.spacing.xs,
                }}>
                  {selectedYear}
                </Text>
                <Ionicons name="chevron-down" size={16} color={colors.dark} />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={{
                  backgroundColor: colors.primary,
                  width: 46,
                  height: 46,
                  borderRadius: 23,
                  justifyContent: 'center',
                  alignItems: 'center',
                  ...shadows.sm,
                }}
                onPress={() => router.push('/expense')}
              >
                <Ionicons name="add" size={28} color={colors.white} />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Main content layout - adaptive for desktop/tablet */}
          <View style={{ 
            paddingHorizontal: Theme.spacing.lg,
          }}>
            {/* For desktop: 2-column layout */}
            {isDesktop ? (
              <View style={{ flexDirection: 'row', marginTop: Theme.spacing.md }}>
                {/* Left column: Financial cards */}
                <View style={{ flex: 1, marginRight: Theme.spacing.lg }}>
                  <Text style={{
                    fontSize: Theme.typography.fontSizes.lg,
                    fontWeight: Theme.typography.fontWeights.bold,
                    color: colors.dark,
                    marginBottom: Theme.spacing.md,
                  }}>
                    Financial Overview
                  </Text>
                  
                  <View style={{ 
                    flexDirection: 'row', 
                    flexWrap: 'wrap', 
                    justifyContent: 'space-between',
                    marginBottom: Theme.spacing.lg,
                  }}>
                    <FinancialCard type="expenses" amount={totals.expenses} />
                    <FinancialCard type="budget" amount={budgetTotal} />
                    <FinancialCard type="lent" amount={pendingLent} />
                    <FinancialCard type="investments" amount={investmentTotal} />
                  </View>
                  
                  {/* Financial Quote */}
                  <View style={{ 
                    marginVertical: Theme.spacing.md, 
                    backgroundColor: colors.card,
                    borderRadius: Theme.borderRadius.lg,
                    overflow: 'hidden',
                    shadowColor: Platform.OS === 'ios' ? '#00000033' : '#000',
                    shadowOffset: {width: 0, height: Platform.OS === 'ios' ? 2 : 1},
                    shadowOpacity: Platform.OS === 'ios' ? 0.25 : 0.05,
                    shadowRadius: Platform.OS === 'ios' ? 4 : 3,
                    elevation: 2,
                  }}>
                    <LinearGradient
                      colors={[`${colors.primary}15`, colors.card]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={{ padding: 20 }}
                    >
                      <View style={{ 
                        width: 40, 
                        height: 40, 
                        borderRadius: 20,
                        backgroundColor: colors.card,
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginBottom: 14,
                        shadowColor: Platform.OS === 'ios' ? '#00000040' : '#000',
                        shadowOffset: {width: 0, height: Platform.OS === 'ios' ? 2 : 1},
                        shadowOpacity: Platform.OS === 'ios' ? 0.2 : 0.1,
                        shadowRadius: Platform.OS === 'ios' ? 3 : 2,
                        elevation: 1,
                      }}>
                        <Ionicons name="bulb-outline" size={22} color={colors.primary} />
                      </View>
                      
                      <Text style={{ 
                        fontSize: 18,
                        lineHeight: 26,
                        color: colors.dark,
                        fontStyle: 'italic',
                        marginBottom: 12,
                        fontWeight: '500',
                        letterSpacing: 0.2,
                      }}>
                        "Wealth is not about having a lot of money; it's about having a lot of options."
                      </Text>
                      
                      <Text style={{
                        fontSize: 14,
                        color: colors.medium,
                        textAlign: 'right',
                        fontWeight: '600'
                      }}>
                        – Chris Rock
                      </Text>
                    </LinearGradient>
                  </View>
                </View>
                
                {/* Right column: Transactions */}
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: Theme.typography.fontSizes.lg,
                    fontWeight: Theme.typography.fontWeights.bold,
                    color: colors.dark,
                    marginBottom: Theme.spacing.md,
                  }}>
                    Recent Transactions
                  </Text>
                  
                  {recentTransactions.length > 0 ? (
                    recentTransactions.map((transaction, index) => (
                      <TransactionItem key={index} transaction={transaction} />
                    ))
                  ) : (
                    <View style={{
                      backgroundColor: colors.card,
                      padding: Theme.spacing.lg,
                      borderRadius: Theme.borderRadius.md,
                      alignItems: 'center',
                      ...shadows.sm,
                    }}>
                      <Ionicons name="receipt-outline" size={40} color={colors.light} />
                      <Text style={{
                        marginTop: Theme.spacing.md,
                        fontSize: Theme.typography.fontSizes.md,
                        color: colors.medium,
                        textAlign: 'center',
                      }}>
                        No recent transactions found
                      </Text>
                      <TouchableOpacity 
                        style={{
                          marginTop: Theme.spacing.md,
                          backgroundColor: colors.primary,
                          paddingVertical: Theme.spacing.sm,
                          paddingHorizontal: Theme.spacing.lg,
                          borderRadius: Theme.borderRadius.md,
                        }}
                        onPress={() => router.push('/expense')}
                      >
                        <Text style={{
                          color: colors.white,
                          fontWeight: Theme.typography.fontWeights.semiBold,
                        }}>
                          Add Transaction
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            ) : (
              // For mobile and tablet: original stacked layout
              <>
                {/* Cards Section */}
                <View style={{ marginTop: Theme.spacing.md }}>
                  <Text style={{
                    fontSize: Theme.typography.fontSizes.md,
                    fontWeight: Theme.typography.fontWeights.bold,
                    color: colors.dark,
                    marginBottom: Theme.spacing.md,
                  }}>
                    Financial Overview
                  </Text>
                  
                  <View style={{ 
                    flexDirection: 'row', 
                    flexWrap: 'wrap', 
                    justifyContent: 'space-between',
                  }}>
                    {/* For tablet layout with 2x2 grid */}
                    {isTablet ? (
                      <>
                        <View style={{ width: '48%' }}>
                          <FinancialCard type="expenses" amount={totals.expenses} />
                          <FinancialCard type="lent" amount={pendingLent} />
                        </View>
                        <View style={{ width: '48%' }}>
                          <FinancialCard type="budget" amount={budgetTotal} />
                          <FinancialCard type="investments" amount={investmentTotal} />
                        </View>
                      </>
                    ) : (
                      // Mobile 2x2 grid
                      <>
                        <FinancialCard type="expenses" amount={totals.expenses} />
                        <FinancialCard type="budget" amount={budgetTotal} />
                        <FinancialCard type="lent" amount={pendingLent} />
                        <FinancialCard type="investments" amount={investmentTotal} />
                      </>
                    )}
                  </View>
                </View>
                
                {/* Recent Transactions */}
                <View style={{ 
                  marginTop: Theme.spacing.lg,
                  marginBottom: Theme.spacing.xl,
                }}>
                  <View style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: Theme.spacing.md,
                  }}>
                    <Text style={{
                      fontSize: Theme.typography.fontSizes.md,
                      fontWeight: Theme.typography.fontWeights.bold,
                      color: colors.dark,
                    }}>
                      Recent Transactions
                    </Text>
                    
                    <TouchableOpacity onPress={() => router.push('/expense')}>
                      <Text style={{
                        fontSize: Theme.typography.fontSizes.sm,
                        color: colors.primary,
                        fontWeight: Theme.typography.fontWeights.semiBold,
                      }}>
                        View All
                      </Text>
                    </TouchableOpacity>
                  </View>
                  
                  {recentTransactions.length > 0 ? (
                    recentTransactions.map((transaction, index) => (
                      <TransactionItem key={index} transaction={transaction} />
                    ))
                  ) : (
                    <View style={{
                      backgroundColor: colors.card,
                      padding: Theme.spacing.lg,
                      borderRadius: Theme.borderRadius.md,
                      alignItems: 'center',
                      ...shadows.sm,
                    }}>
                      <Ionicons name="receipt-outline" size={40} color={colors.light} />
                      <Text style={{
                        marginTop: Theme.spacing.md,
                        fontSize: Theme.typography.fontSizes.md,
                        color: colors.medium,
                        textAlign: 'center',
                      }}>
                        No recent transactions found
                      </Text>
                      <TouchableOpacity 
                        style={{
                          marginTop: Theme.spacing.md,
                          backgroundColor: colors.primary,
                          paddingVertical: Theme.spacing.sm,
                          paddingHorizontal: Theme.spacing.lg,
                          borderRadius: Theme.borderRadius.md,
                        }}
                        onPress={() => router.push('/expense')}
                      >
                        <Text style={{
                          color: colors.white,
                          fontWeight: Theme.typography.fontWeights.semiBold,
                        }}>
                          Add Transaction
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
                
                {/* Financial Quote */}
                <View style={{ 
                  marginVertical: 10,
                  backgroundColor: colors.card,
                  borderRadius: 16,
                  overflow: 'hidden',
                  shadowColor: Platform.OS === 'ios' ? '#00000033' : '#000',
                  shadowOffset: {width: 0, height: Platform.OS === 'ios' ? 2 : 1},
                  shadowOpacity: Platform.OS === 'ios' ? 0.25 : 0.05,
                  shadowRadius: Platform.OS === 'ios' ? 4 : 3,
                  elevation: 2,
                }}>
                  <LinearGradient
                    colors={[`${colors.primary}15`, colors.card]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={{ padding: 20 }}
                  >
                    <View style={{ 
                      width: 40, 
                      height: 40, 
                      borderRadius: 20,
                      backgroundColor: colors.card,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginBottom: 14,
                      shadowColor: Platform.OS === 'ios' ? '#00000040' : '#000',
                      shadowOffset: {width: 0, height: Platform.OS === 'ios' ? 2 : 1},
                      shadowOpacity: Platform.OS === 'ios' ? 0.2 : 0.1,
                      shadowRadius: Platform.OS === 'ios' ? 3 : 2,
                      elevation: 1,
                    }}>
                      <Ionicons name="bulb-outline" size={22} color={colors.primary} />
                    </View>
                    
                    <Text style={{ 
                      fontSize: 18,
                      lineHeight: 26,
                      color: colors.dark,
                      fontStyle: 'italic',
                      marginBottom: 12,
                      fontWeight: '500',
                      letterSpacing: 0.2,
                    }}>
                      "Wealth is not about having a lot of money; it's about having a lot of options."
                    </Text>
                    
                    <Text style={{
                      fontSize: 14,
                      color: colors.medium,
                      textAlign: 'right',
                      fontWeight: '600'
                    }}>
                      – Chris Rock
                    </Text>
                  </LinearGradient>
                </View>
              </>
            )}
          </View>
        </ScrollView>
        
        <YearSelector />
        
        {/* Only show BottomNavBar on mobile */}
        {isMobile && <BottomNavBar />}
      </View>
    </>
  );
}