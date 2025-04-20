import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, Timestamp, getDoc, doc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import styles from '../styles/HomeStyles';
import BottomNavBar from './components/BottomNavBar';
import { LinearGradient } from 'expo-linear-gradient';

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
  const [investmentTotal, setInvestmentTotal] = useState(0);

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

  // Fetch user's first name from Firestore
  const fetchUserName = async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        setUserName(userDoc.data().firstName || '');
      } else {
        setUserName('');
      }
    } catch (err) {
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
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        console.log('User authenticated:', user.uid);
        fetchUserName(user.uid); // Fetch first name
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
      fetchInvestmentTotal();
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
          description: "Total invested amount",
          heading: "Investment"
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

    // Special design for Total Expenses card
    if (label === "Total Expenses") {
      return (
        <View style={[styles.card, { backgroundColor: '#f5f7ff', borderColor: '#6366f1', borderWidth: 1.5, minHeight: 170 }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <View style={{ backgroundColor: '#6366f1', borderRadius: 12, width: 44, height: 44, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
              <Ionicons name="wallet-outline" size={24} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardLabel, { color: '#6366f1', fontSize: 15, fontWeight: 'bold', lineHeight: 20 }]} numberOfLines={2}>
                Total Expenses
              </Text>
              <Text style={[styles.cardDescription, { color: '#6b7280', fontSize: 12 }]}>Total spent in {selectedYear}</Text>
            </View>
          </View>
          <Text style={[styles.cardAmount, { color: '#6b7280', fontSize: 26, marginBottom: 8 }]} numberOfLines={1}>
            ₹{amount.toLocaleString('en-IN')}
          </Text>
          <View style={styles.cardActions}>
            <TouchableOpacity 
              style={[styles.addButton, { backgroundColor: '#6366f1' }]}
              onPress={() => router.push('/expense')}
            >
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={[styles.addButtonText, { color: '#fff' }]}>Add Expense</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // Reference Total Expenses card for other cards
    return (
      <View style={[styles.card, {
        backgroundColor: label === 'Lent' ? '#f0fdf4' : label === 'Borrowed' ? '#fef2f2' : label === 'Investments' ? '#f0f7ff' : '#fff',
        borderColor: cardDetails.color,
        borderWidth: 1.5,
        minHeight: 170,
        shadowColor: cardDetails.color,
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
      }]}> 
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <View style={{ backgroundColor: cardDetails.color, borderRadius: 12, width: 44, height: 44, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
            <Ionicons name={cardDetails.icon} size={24} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardLabel, { color: cardDetails.color, fontSize: 15, fontWeight: 'bold', lineHeight: 20 }]} numberOfLines={2}>
              {cardDetails.heading || label}
            </Text>
            <Text style={[styles.cardDescription, { color: '#6b7280', fontSize: 12 }]} numberOfLines={2}>
              {cardDetails.description}
            </Text>
          </View>
        </View>
        <Text style={[styles.cardAmount, { color: cardDetails.color, fontSize: 24, marginBottom: 8 }]} numberOfLines={1}>
          {formatINR(amount)}
        </Text>
        {/* Add button for specific cards */}
        {label === "Lent" && (
          <View style={styles.cardActions}>
            <TouchableOpacity 
              style={[styles.addButton, { backgroundColor: cardDetails.color, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16, minHeight: 38 }]}
              onPress={() => router.push('/lending')}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle-outline" size={20} color="#fff" style={{ marginRight: 6 }} />
              <Text style={[styles.addButtonText, { color: '#fff', fontWeight: '700', fontSize: 14 }]}>Add Lending</Text>
            </TouchableOpacity>
          </View>
        )}
        {label === "Borrowed" && (
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[
                styles.addButton,
                {
                  backgroundColor: cardDetails.color,
                  borderRadius: 8,
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  minHeight: 38,
                  alignSelf: 'flex-start',
                  width: 'auto',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: 4,
                },
              ]}
              onPress={() => router.push('/borrowing')}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle-outline" size={20} color="#fff" style={{ marginRight: 6 }} />
              <Text style={[styles.addButtonText, { color: '#fff', fontWeight: '700', fontSize: 14 }]}>Add Borrowing</Text>
            </TouchableOpacity>
          </View>
        )}
        {label === "Investments" && (
          <View style={styles.cardActions}>
            <TouchableOpacity 
              style={[styles.addButton, { backgroundColor: cardDetails.color, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16, minHeight: 38 }]}
              onPress={() => router.push('/investment')}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle-outline" size={20} color="#fff" style={{ marginRight: 6 }} />
              <Text style={[styles.addButtonText, { color: '#fff', fontWeight: '700', fontSize: 14 }]}>Add Investment</Text>
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
      <LinearGradient
        colors={["#e0e7ff", "#f0fdf4"]}
        style={{ flex: 1 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <ScrollView style={{ paddingHorizontal: 16, paddingTop: 46, paddingBottom: 16 }} contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, marginTop: 16 }}>
              <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#1e3a8a', flex: 1, flexWrap: 'wrap' }}>
                {userName ? `Hi, ${userName}!` : 'Hi there!'}
              </Text>
            </View>
        </ScrollView>

        <ScrollView
          contentContainerStyle={{ paddingBottom: 20, flexGrow: 1 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }>
          <View style={{ paddingHorizontal: 20, paddingTop: 46, paddingBottom: 12 }}>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 16 }}>
              <TouchableOpacity 
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#eef2ff', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 }}
                onPress={() => setShowYearPicker(true)}
              >
                <Text style={{ color: '#6366f1', fontWeight: '600', fontSize: 16, marginRight: 4 }}>{selectedYear}</Text>
                <Ionicons name="chevron-down" size={16} color="#6366f1" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 0, marginBottom: 16, paddingHorizontal: 8 }}>
            <View style={{ width: '48%' }}>
              <StatCard label="Total Expenses" amount={totals.expenses} />
            </View>
            <View style={{ width: '48%' }}>
              <StatCard label="Lent" amount={pendingLent} />
            </View>
            <View style={{ width: '48%', marginTop: 16 }}>
              <StatCard label="Borrowed" amount={totals.borrowed} />
            </View>
            <View style={{ width: '48%', marginTop: 16 }}>
              <StatCard label="Investments" amount={investmentTotal} />
            </View>
          </View>
          <YearSelector />
          <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 }}>
            <Text style={{ color: '#6366f1', fontSize: 16, fontWeight: '600', marginBottom: 10, opacity: 0.5,alignContent: 'center', textAlign: 'center' }}>
                "Wealth is not about having a lot of money; it's about having a lot of options."                          – Chris Rock
              </Text>
            </View>
        </ScrollView>
            
        <BottomNavBar />
      </LinearGradient>
    </>
  );
}