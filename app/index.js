import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import styles from '../styles/HomeStyles';
import BottomNavBar from './components/BottomNavBar';

export default function Home() {
  const router = useRouter();
  const user = auth.currentUser;
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');

  const [totals, setTotals] = useState({
    expenses: 0,
    lent: 0,        // Keep these for structure, but won't fetch
    borrowed: 0,    // Keep these for structure, but won't fetch
    pendingRepayments: 0,  // Keep these for structure, but won't fetch
    investments: 0   // Keep these for structure, but won't fetch
  });

  const [pendingLent, setPendingLent] = useState(0);

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showYearPicker, setShowYearPicker] = useState(false);

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

  // Update the fetchUserData function
  const fetchUserData = async (userId) => {
    try {
      // Get reference to users collection
      const usersRef = collection(db, 'users');
      // Create query looking for document with matching userId
      const q = query(usersRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // Get the first matching document
        const userData = querySnapshot.docs[0].data();
        console.log('Found user data:', userData); // Debug log
        setUserName(userData.firstName || '');
      } else {
        console.log('No user document found'); // Debug log
        setUserName('');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setUserName('');
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSummaryData(selectedYear);
    setRefreshing(false);
  }, [selectedYear]);

  // Update the useEffect hook that checks authentication
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        console.log('User authenticated:', user.uid);
        // Fetch user data immediately after authentication
        await fetchUserData(user.uid);
        // Then fetch other data
        fetchSummaryData(selectedYear);
      } else {
        console.log('No user, redirecting to login');
        router.replace('/login');
      }
    });

    return () => unsubscribe();
  }, []);

  // This effect will run whenever selectedYear changes
  useEffect(() => {
    if (user) {
      fetchSummaryData(selectedYear);
      fetchPendingLent();
    }
  }, [selectedYear]);

  const checkAuthStatus = () => {
    const currentUser = auth.currentUser;
    console.log('Current user:', currentUser?.uid);
    console.log('Auth state:', auth.currentUser ? 'Authenticated' : 'Not authenticated');
  };

  const formatINR = (amount) => `₹${amount.toLocaleString('en-IN')}`;

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
          style={styles.modalOverlay} 
          onPress={() => setShowYearPicker(false)}
          activeOpacity={1}
        >
          <View style={styles.yearPickerContainer}>
            {years.map(year => (
              <TouchableOpacity
                key={year}
                style={[
                  styles.yearOption,
                  selectedYear === year && styles.selectedYearOption
                ]}
                onPress={() => {
                  setSelectedYear(year);
                  setShowYearPicker(false);
                }}
              >
                <Text style={[
                  styles.yearOptionText,
                  selectedYear === year && styles.selectedYearOptionText
                ]}>
                  {year}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  const getCardDetails = (label) => {
    switch (label) {
      case "Total Expenses":
        return {
          icon: "wallet-outline",
          color: "#6366f1",
          description: "Your total spending"
        };
      case "Lent":
        return {
          icon: "arrow-up-outline",
          color: "#10b981",
          description: "Money you've lent"
        };
      case "Borrowed":
        return {
          icon: "arrow-down-outline",
          color: "#ef4444", 
          description: "Money you've borrowed"
        };
      case "Pending Repayments":
        return {
          icon: "time-outline",
          color: "#f59e0b",
          description: "Awaiting repayments"
        };
      case "Investments":
        return {
          icon: "trending-up-outline",
          color: "#3b82f6",
          description: "Your investments"
        };
      default:
        return {
          icon: "help-outline",
          color: "#6b7280",
          description: "Other"
        };
    }
  };

  const StatCard = ({ label, amount }) => {
    const cardDetails = getCardDetails(label);
    const router = useRouter();

    // Make the entire Investments card clickable and route to /investment dashboard
    if (label === "Investments") {
      return (
        <TouchableOpacity onPress={() => router.push('/investment')} activeOpacity={0.85} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleSection}>
              <View style={[styles.cardIcon, { backgroundColor: cardDetails.color + '15' }]}> 
                <Ionicons name={cardDetails.icon} size={24} color={cardDetails.color} />
              </View>
              <View>
                <Text style={styles.cardLabel}>{label}</Text>
                <Text style={styles.cardDescription}>{cardDetails.description}</Text>
              </View>
            </View>
          </View>
          <Text style={[styles.cardAmount, amount < 0 && styles.negative]}>
            {formatINR(amount)}
          </Text>
          <View style={styles.cardActions}>
            <View style={styles.addButton}>
              <Ionicons name="add-circle-outline" size={20} color="#3b82f6" />
              <Text style={styles.addButtonText}>Add Investment</Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleSection}>
            <View style={[styles.cardIcon, { backgroundColor: cardDetails.color + '15' }]}>
              <Ionicons name={cardDetails.icon} size={24} color={cardDetails.color} />
            </View>
            <View>
              <Text style={styles.cardLabel}>{label}</Text>
              <Text style={styles.cardDescription}>{cardDetails.description}</Text>
            </View>
          </View>
        </View>
        <Text style={[styles.cardAmount, amount < 0 && styles.negative]}>
          {formatINR(amount)}
        </Text>
  
        {/* Add button for specific cards */}
        {label === "Total Expenses" && (
          <View style={styles.cardActions}>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => router.push('/expense')}
            >
              <Ionicons name="add-circle-outline" size={20} color="#6366f1" />
              <Text style={styles.addButtonText}>Add Expense</Text>
            </TouchableOpacity>
          </View>
        )}

        {label === "Lent" && (
          <View style={styles.cardActions}>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => router.push('/lending')}
            >
              <Ionicons name="add-circle-outline" size={20} color="#10b981" />
              <Text style={styles.addButtonText}>Add Lending</Text>
            </TouchableOpacity>
          </View>
        )}

        {label === "Borrowed" && (
          <View style={styles.cardActions}>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => router.push('/borrowing')}
            >
              <Ionicons name="add-circle-outline" size={20} color="#ef4444" />
              <Text style={styles.addButtonText}>Add Borrowing</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const NavButton = ({ icon, label, onPress }) => (
    <TouchableOpacity style={styles.navButton} onPress={onPress}>
      <Ionicons name={icon} size={24} color="#007bff" />
      <Text style={styles.navLabel}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.welcomeSection}>
          <View style={styles.headerContainer}>
            <Text style={styles.welcomeText}>
              Hi {userName ? `${userName}!` : 'there!'} 
            </Text>
            <TouchableOpacity 
              style={styles.settingsButton}
              onPress={() => router.push('/settings')}
            >
              <Ionicons name="settings-outline" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          <View style={styles.yearSelectorRow}>
            <Text style={styles.yearSelectorLabel}>Showing data for</Text>
            <TouchableOpacity 
              style={styles.yearSelectorButton}
              onPress={() => setShowYearPicker(true)}
            >
              <Text style={styles.yearSelectorText}>{selectedYear}</Text>
              <Ionicons name="chevron-down" size={16} color="#6366f1" />
            </TouchableOpacity>
          </View>
        </View>

        <StatCard label="Total Expenses" amount={totals.expenses} />
        <StatCard label="Lent" amount={pendingLent} />
        <StatCard label="Borrowed" amount={totals.borrowed} />
        <StatCard label="Investments" amount={totals.investments} />

        {/* <View style={styles.navSection}>
          <NavButton icon="wallet" label="Add Expense" onPress={() => router.push('/expense')} />
          <NavButton icon="swap-horizontal" label="Lend / Borrow" onPress={() => router.push('/lending')} />
          <NavButton icon="bar-chart" label="Investments" onPress={() => router.push('/investments')} />
          <NavButton icon="return-down-forward" label="Repayments" onPress={() => router.push('/repayments')} />
          <NavButton icon="settings" label="Settings" onPress={() => router.push('/settings')} />
        </View> */}

        <YearSelector />
      </ScrollView>
      <BottomNavBar />
    </>
  );
}