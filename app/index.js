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
  Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, Timestamp, getDoc, doc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import BottomNavBar from './components/BottomNavBar';
import { LinearGradient } from 'expo-linear-gradient';
import Theme from '../constants/Theme';

const { width } = Dimensions.get('window');

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
    borrowed: 0,
    pendingRepayments: 0,
    investments: 0
  });

  const [pendingLent, setPendingLent] = useState(0);
  const [investmentTotal, setInvestmentTotal] = useState(0);

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showYearPicker, setShowYearPicker] = useState(false);
  
  // Add state for recent transactions
  const [recentTransactions, setRecentTransactions] = useState([]);

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
        fetchRecentTransactions()
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
    }
  }, [selectedYear]);

  const formatINR = (amount) => `₹${amount.toLocaleString('en-IN')}`;
  
  // Generate default profile image with user's initials
  const generateInitialsImage = () => {
    const initial = userName.charAt(0) || '?';
    return `https://ui-avatars.com/api/?name=${initial}&size=150&background=${Theme.colors.primary.replace('#','')}&color=ffffff`;
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
            backgroundColor: Theme.colors.white,
            borderRadius: Theme.borderRadius.lg,
            padding: Theme.spacing.lg,
            width: '80%',
            maxWidth: 300,
            ...Theme.shadows.lg
          }}>
            <Text style={{
              fontSize: Theme.typography.fontSizes.lg,
              fontWeight: Theme.typography.fontWeights.bold,
              color: Theme.colors.dark,
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
                    ? Theme.colors.primaryLight 
                    : Theme.colors.white,
                  borderRadius: Theme.borderRadius.md,
                  marginBottom: Theme.spacing.sm,
                  alignItems: 'center',
                  borderWidth: selectedYear === year ? 1 : 0,
                  borderColor: Theme.colors.primary,
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
                    ? Theme.colors.primary 
                    : Theme.colors.dark,
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
      color: Theme.colors.primary,
      bgColor: `${Theme.colors.primary}15`,
      title: "Expenses",
      route: "/expense"
    },
    lent: {
      icon: "arrow-up-outline",
      color: Theme.colors.success,
      bgColor: `${Theme.colors.success}15`,
      title: "Lent Money",
      route: "/lending"
    },
    borrowed: {
      icon: "arrow-down-outline",
      color: Theme.colors.error, 
      bgColor: `${Theme.colors.error}15`,
      title: "Borrowed",
      route: "/borrowing"
    },
    investments: {
      icon: "trending-up-outline",
      color: Theme.colors.info,
      bgColor: `${Theme.colors.info}15`,
      title: "Investments",
      route: "/investment"
    }
  };
  
  // Get category color for expense items
  const getCategoryColor = (category) => {
    const categoryColors = {
      Food: Theme.colors.success,
      Transport: Theme.colors.info,
      Shopping: Theme.colors.warning,
      Entertainment: '#8b5cf6',
      Bills: Theme.colors.error,
      Healthcare: '#06b6d4',
      Education: '#ec4899',
      Travel: '#f97316',
      Groceries: '#10b981',
      Others: Theme.colors.medium
    };
    
    return categoryColors[category] || Theme.colors.medium;
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
          backgroundColor: Theme.colors.white,
          borderRadius: Theme.borderRadius.lg,
          padding: Theme.spacing.md,
          marginBottom: Theme.spacing.md,
          ...Theme.shadows.md,
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
            color: Theme.colors.dark,
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
    
    return (
      <TouchableOpacity 
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: Theme.colors.white,
          padding: Theme.spacing.md,
          borderRadius: Theme.borderRadius.md,
          marginBottom: Theme.spacing.sm,
          ...Theme.shadows.sm,
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
          <Ionicons name="card-outline" size={20} color={categoryColor} />
        </View>
        
        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: Theme.typography.fontSizes.md,
            fontWeight: Theme.typography.fontWeights.semiBold,
            color: Theme.colors.dark,
            marginBottom: 2,
          }}>
            {transaction.note || transaction.category}
          </Text>
          <Text style={{
            fontSize: Theme.typography.fontSizes.sm,
            color: Theme.colors.medium,
          }}>
            {formatDate(transaction.date)}
          </Text>
        </View>
        
        <Text style={{
          fontSize: Theme.typography.fontSizes.md,
          fontWeight: Theme.typography.fontWeights.bold,
          color: Theme.colors.error,
        }}>
          -₹{transaction.amount}
        </Text>
      </TouchableOpacity>
    );
  };

  // Main render
  if (loading && !refreshing) {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Theme.colors.background,
      }}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={Theme.colors.background} />
      <View style={{ flex: 1, backgroundColor: Theme.colors.white }}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 90 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Header */}
          <View
            style={{
              backgroundColor: Theme.colors.white,
              paddingTop: 60,
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
                  color: Theme.colors.medium,
                  marginBottom: 4,
                }}>
                  Welcome back
                </Text>
                <Text style={{
                  fontSize: Theme.typography.fontSizes.xl + 2,
                  fontWeight: Theme.typography.fontWeights.bold,
                  color: Theme.colors.dark,
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
                  ...Theme.shadows.sm,
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
                  backgroundColor: Theme.colors.white,
                  paddingVertical: Theme.spacing.sm,
                  paddingHorizontal: Theme.spacing.md,
                  borderRadius: 20,
                  ...Theme.shadows.sm,
                }}
                onPress={() => setShowYearPicker(true)}
              >
                <Text style={{
                  color: Theme.colors.dark,
                  fontWeight: Theme.typography.fontWeights.medium,
                  fontSize: Theme.typography.fontSizes.md,
                  marginRight: Theme.spacing.xs,
                }}>
                  {selectedYear}
                </Text>
                <Ionicons name="chevron-down" size={16} color={Theme.colors.dark} />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={{
                  backgroundColor: Theme.colors.primary,
                  width: 46,
                  height: 46,
                  borderRadius: 23,
                  justifyContent: 'center',
                  alignItems: 'center',
                  ...Theme.shadows.sm,
                }}
                onPress={() => router.push('/expense')}
              >
                <Ionicons name="add" size={28} color={Theme.colors.white} />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Cards Section */}
          <View style={{ 
            paddingHorizontal: Theme.spacing.lg,
            marginTop: Theme.spacing.md,
          }}>
            <Text style={{
              fontSize: Theme.typography.fontSizes.md,
              fontWeight: Theme.typography.fontWeights.bold,
              color: Theme.colors.dark,
              marginBottom: Theme.spacing.md,
            }}>
              Financial Overview
            </Text>
            
            <View style={{ 
              flexDirection: 'row', 
              flexWrap: 'wrap', 
              justifyContent: 'space-between',
            }}>
              <FinancialCard type="expenses" amount={totals.expenses} />
              <FinancialCard type="lent" amount={pendingLent} />
              <FinancialCard type="borrowed" amount={totals.borrowed} />
              <FinancialCard type="investments" amount={investmentTotal} />
            </View>
          </View>
          
          {/* Recent Transactions */}
          <View style={{ 
            paddingHorizontal: Theme.spacing.lg,
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
                color: Theme.colors.dark,
              }}>
                Recent Transactions
              </Text>
              
              <TouchableOpacity onPress={() => router.push('/expense')}>
                <Text style={{
                  fontSize: Theme.typography.fontSizes.sm,
                  color: Theme.colors.primary,
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
                backgroundColor: Theme.colors.white,
                padding: Theme.spacing.lg,
                borderRadius: Theme.borderRadius.md,
                alignItems: 'center',
                ...Theme.shadows.sm,
              }}>
                <Ionicons name="receipt-outline" size={40} color={Theme.colors.light} />
                <Text style={{
                  marginTop: Theme.spacing.md,
                  fontSize: Theme.typography.fontSizes.md,
                  color: Theme.colors.medium,
                  textAlign: 'center',
                }}>
                  No recent transactions found
                </Text>
                <TouchableOpacity 
                  style={{
                    marginTop: Theme.spacing.md,
                    backgroundColor: Theme.colors.primary,
                    paddingVertical: Theme.spacing.sm,
                    paddingHorizontal: Theme.spacing.lg,
                    borderRadius: Theme.borderRadius.md,
                  }}
                  onPress={() => router.push('/expense')}
                >
                  <Text style={{
                    color: Theme.colors.white,
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
            marginHorizontal: 20, 
            marginVertical: 10,
            backgroundColor: Theme.colors.white,
            borderRadius: 16,
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: {width: 0, height: 1},
            shadowOpacity: 0.05,
            shadowRadius: 3,
            elevation: 2,
          }}>
            <LinearGradient
              colors={[`${Theme.colors.primary}15`, Theme.colors.white]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 0.6 }}
              style={{ padding: 20 }}
            >
              <View style={{ 
                width: 40, 
                height: 40, 
                borderRadius: 20,
                backgroundColor: Theme.colors.white,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 14,
                shadowColor: '#000',
                shadowOffset: {width: 0, height: 1},
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 1,
              }}>
                <Ionicons name="bulb-outline" size={22} color={Theme.colors.primary} />
              </View>
              
              <Text style={{ 
                fontSize: 18,
                lineHeight: 26,
                color: Theme.colors.dark,
                fontStyle: 'italic',
                marginBottom: 12,
                fontWeight: '500',
              }}>
                "Wealth is not about having a lot of money; it's about having a lot of options."
              </Text>
              
              <Text style={{
                fontSize: 14,
                color: Theme.colors.medium,
                textAlign: 'right',
                fontWeight: '600'
              }}>
                – Chris Rock
              </Text>
            </LinearGradient>
          </View>
        </ScrollView>
        
        <YearSelector />
        <BottomNavBar />
      </View>
    </>
  );
}