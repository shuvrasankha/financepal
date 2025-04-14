import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

export default function Home() {
  const router = useRouter();
  const user = auth.currentUser;
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [totals, setTotals] = useState({
    expenses: 0,
    lent: 0,
    borrowed: 0,
    pendingRepayments: 0,
    investments: 0,
  });

  const fetchSummaryData = async () => {
    try {
      if (!user) return;

      const year = new Date().getFullYear();
      const queries = {
        expenses: query(
          collection(db, 'transactions'),
          where('uid', '==', user.uid),
          where('type', '==', 'expense'),
          where('year', '==', year)
        ),
        lent: query(
          collection(db, 'transactions'),
          where('uid', '==', user.uid),
          where('type', '==', 'lent')
        ),
        borrowed: query(
          collection(db, 'transactions'),
          where('uid', '==', user.uid),
          where('type', '==', 'borrowed')
        ),
        repayments: query(
          collection(db, 'repayments'),
          where('uid', '==', user.uid),
          where('status', '==', 'pending')
        ),
        investments: query(
          collection(db, 'investments'),
          where('uid', '==', user.uid)
        ),
      };

      const results = await Promise.all(
        Object.values(queries).map(q => getDocs(q))
      );

      const sum = (snapshot) =>
        snapshot.docs.reduce((acc, doc) => acc + (doc.data().amount || 0), 0);

      setTotals({
        expenses: sum(results[0]),
        lent: sum(results[1]),
        borrowed: sum(results[2]),
        pendingRepayments: sum(results[3]),
        investments: sum(results[4]),
      });
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSummaryData();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        console.log('User is authenticated:', user.uid);
        setLoading(false); // Stop loading once authenticated
        fetchSummaryData();
      } else {
        console.log('No user is authenticated. Redirecting to login...');
        router.replace('/login'); // Redirect to login if not authenticated
      }
    });

    return () => unsubscribe(); // Cleanup the listener
  }, []);

  if (loading) {
    // Show a loading spinner while checking authentication
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  const formatINR = (amount) => `₹${amount.toLocaleString('en-IN')}`;

  const StatCard = ({ label, amount, full = false }) => (
    <View style={full ? styles.card : styles.cardSmall}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.amount, amount < 0 && styles.negative]}>
        {formatINR(amount)}
      </Text>
    </View>
  );

  return (
    <ScrollView 
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.header}>📊 Dashboard</Text>

      <StatCard label="Total Expenses (This Year)" amount={totals.expenses} full />

      <View style={styles.row}>
        <StatCard label="Lent" amount={totals.lent} />
        <StatCard label="Borrowed" amount={totals.borrowed} />
      </View>

      <StatCard label="Pending Repayments" amount={totals.pendingRepayments} full />
      <StatCard label="Investments" amount={totals.investments} full />

      <View style={styles.navSection}>
        <NavButton icon="wallet" label="Add Expense" onPress={() => router.push('/expense')} />
        <NavButton icon="swap-horizontal" label="Lend / Borrow" onPress={() => router.push('/lending')} />
        <NavButton icon="bar-chart" label="Investments" onPress={() => router.push('/investments')} />
        <NavButton icon="return-down-forward" label="Repayments" onPress={() => router.push('/repayments')} />
        <NavButton icon="settings" label="Settings" onPress={() => router.push('/settings')} />
      </View>
    </ScrollView>
  );
}

const NavButton = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.navButton} onPress={onPress}>
    <Ionicons name={icon} size={22} color="#007bff" />
    <Text style={styles.navLabel}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  container: {
    padding: 24,
    paddingBottom: 60,
    backgroundColor: '#f9f9f9',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardSmall: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 14,
    marginRight: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  label: {
    fontSize: 15,
    color: '#666',
  },
  amount: {
    fontSize: 22,
    fontWeight: '600',
    marginTop: 6,
    color: '#222',
  },
  navSection: {
    marginTop: 30,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
  },
  navLabel: {
    fontSize: 16,
    marginLeft: 12,
    color: '#007bff',
  },
  negative: {
    color: '#ff4d4f',
  },
});