import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import styles from '../styles/LendingStyles';
import BottomNavBar from './components/BottomNavBar';
import { db, auth } from '../firebase';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

function AddLoanForm({ onClose, onAdded }) {
  const [loanType, setLoanType] = useState('given');
  const [form, setForm] = useState({
    amount: '',
    lender: '', // changed from contact
    description: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!form.amount || !form.lender) {
      Alert.alert('Validation Error', 'Amount and Lender are required fields.');
      return;
    }
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'You must be logged in to save a loan.');
      return;
    }
    const loanData = { ...form, contact: form.lender, loanType };
    const success = await saveLoanToFirestore(loanData);
    if (success) {
      Alert.alert('Success', 'Loan details saved successfully!');
      setForm({
        amount: '',
        lender: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date().toISOString().split('T')[0],
      });
      onClose();
      if (onAdded) onAdded();
    }
  };

  // Contact selection function
  const selectContact = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === 'granted') {
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
          sort: Contacts.SortTypes.FirstName,
        });
        if (data.length > 0) {
          const contactOptions = data.map(contact => ({
            text: contact.name,
            onPress: () => handleChange('lender', contact.name)
          }));
          contactOptions.push({ text: 'Cancel', style: 'cancel' });
          Alert.alert('Select Lender', 'Choose a lender:', contactOptions);
        } else {
          Alert.alert('No Contacts', 'No contacts found on your device.');
        }
      } else {
        Alert.alert('Permission Denied', 'Please allow access to your contacts to use this feature.');
      }
    } catch (error) {
      console.error('Error accessing contacts:', error);
      Alert.alert('Error', 'Failed to access contacts.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', padding: 24 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 18, color: '#111' }}>Add Loan</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 24, gap: 12 }}>
        <TouchableOpacity
          style={{ flex: 1, borderRadius: 12, backgroundColor: loanType === 'given' ? '#6366f1' : '#F3F4F6', alignItems: 'center', padding: 12, flexDirection: 'row', justifyContent: 'center' }}
          onPress={() => setLoanType('given')}
          activeOpacity={0.85}
        >
          <Ionicons name="arrow-up-circle" size={22} color={loanType === 'given' ? '#fff' : '#6366f1'} style={{ marginRight: 8 }} />
          <Text style={{ color: loanType === 'given' ? '#fff' : '#6366f1', fontWeight: '700', fontSize: 16 }}>Money Given</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1, borderRadius: 12, backgroundColor: loanType === 'taken' ? '#ef4444' : '#F3F4F6', alignItems: 'center', padding: 12, flexDirection: 'row', justifyContent: 'center' }}
          onPress={() => setLoanType('taken')}
          activeOpacity={0.85}
        >
          <Ionicons name="arrow-down-circle" size={22} color={loanType === 'taken' ? '#fff' : '#ef4444'} style={{ marginRight: 8 }} />
          <Text style={{ color: loanType === 'taken' ? '#fff' : '#ef4444', fontWeight: '700', fontSize: 16 }}>Money Taken</Text>
        </TouchableOpacity>
      </View>
      <Text style={{ marginBottom: 8, fontSize: 18, color: '#6366f1', fontWeight: '600' }}>Amount (₹)</Text>
      <TextInput
        style={{ borderWidth: 1, borderColor: '#6366f1', borderRadius: 10, padding: 10, fontSize: 18, fontWeight: '600', color: '#222', backgroundColor: '#F8FAFF', marginBottom: 18 }}
        placeholder="Enter amount"
        keyboardType="numeric"
        value={form.amount}
        onChangeText={(text) => handleChange('amount', text)}
        placeholderTextColor="#b6c3e0"
      />
      <Text style={{ marginBottom: 8, fontSize: 18, color: '#6366f1', fontWeight: '600' }}>Lender</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
        <TextInput
          style={{ flex: 1, borderWidth: 1, borderColor: '#6366f1', borderRadius: 10, padding: 10, fontSize: 18, color: '#222', backgroundColor: '#F8FAFF' }}
          placeholder="Enter lender's name"
          value={form.lender}
          onChangeText={(text) => handleChange('lender', text)}
          placeholderTextColor="#b6c3e0"
        />
        <TouchableOpacity onPress={selectContact} style={{ marginLeft: 10 }}>
          <Ionicons name="person-circle-outline" size={28} color="#6366f1" />
        </TouchableOpacity>
      </View>
      <Text style={{ marginBottom: 8, fontSize: 18, color: '#6366f1', fontWeight: '600' }}>Description (Optional)</Text>
      <TextInput
        style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, fontSize: 16, color: '#444', backgroundColor: '#F8FAFF', marginBottom: 18 }}
        placeholder="Enter description"
        value={form.description}
        onChangeText={(text) => handleChange('description', text)}
        placeholderTextColor="#b6c3e0"
      />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, gap: 10 }}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: '#F8FAFF', borderColor: '#6366f1', borderWidth: 1, borderRadius: 10, alignItems: 'center', flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 10, marginRight: 8 }}
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="calendar-outline" size={20} color="#6366f1" style={{ marginRight: 6 }} />
          <Text style={{ color: '#222', fontWeight: '500', fontSize: 15 }}>{new Date(form.date).toLocaleDateString()}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: '#F8FAFF', borderColor: '#6366f1', borderWidth: 1, borderRadius: 10, alignItems: 'center', flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 10, marginLeft: 8 }}
          onPress={() => setShowDueDatePicker(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="calendar-outline" size={20} color="#6366f1" style={{ marginRight: 6 }} />
          <Text style={{ color: '#222', fontWeight: '500', fontSize: 15 }}>Due: {new Date(form.dueDate).toLocaleDateString()}</Text>
        </TouchableOpacity>
      </View>
      {showDatePicker && (
        <DateTimePicker
          value={new Date(form.date)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              handleChange('date', selectedDate.toISOString().split('T')[0]);
            }
          }}
        />
      )}
      {showDueDatePicker && (
        <DateTimePicker
          value={new Date(form.dueDate)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setShowDueDatePicker(false);
            if (selectedDate) {
              handleChange('dueDate', selectedDate.toISOString().split('T')[0]);
            }
          }}
        />
      )}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: '#6366f1', padding: 16, borderRadius: 8, alignItems: 'center', marginRight: 10, flexDirection: 'row', justifyContent: 'center' }} onPress={handleSubmit}>
          <Ionicons name="checkmark-circle-outline" size={22} color="#fff" style={{ marginRight: 8 }} />
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>Save</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose} style={{ flex: 1, backgroundColor: '#fee2e2', padding: 16, borderRadius: 8, alignItems: 'center', marginLeft: 10, flexDirection: 'row', justifyContent: 'center' }}>
          <Ionicons name="close-circle-outline" size={22} color="#ef4444" style={{ marginRight: 8 }} />
          <Text style={{ color: '#ef4444', fontWeight: 'bold', fontSize: 18 }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function Lending() {
  const [loanType, setLoanType] = useState('given'); // 'given' or 'taken'
  const [form, setForm] = useState({
    amount: '',
    lender: '', // changed from contact
    description: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
  });
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [loanSummary, setLoanSummary] = useState({});
  const [loansLoading, setLoansLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Contact selection function
  const selectContact = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === 'granted') {
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
          sort: Contacts.SortTypes.FirstName,
        });
        if (data.length > 0) {
          const contactOptions = data.map(contact => ({
            text: contact.name,
            onPress: () => handleChange('lender', contact.name)
          }));
          contactOptions.push({ text: 'Cancel', style: 'cancel' });
          Alert.alert('Select Lender', 'Choose a lender:', contactOptions);
        } else {
          Alert.alert('No Contacts', 'No contacts found on your device.');
        }
      } else {
        Alert.alert('Permission Denied', 'Please allow access to your contacts to use this feature.');
      }
    } catch (error) {
      console.error('Error accessing contacts:', error);
      Alert.alert('Error', 'Failed to access contacts.');
    }
  };

  // Save loan to Firestore
  const saveLoanToFirestore = async (loan) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'User not authenticated.');
        return false;
      }
      // Fetch or initialize pending amount for this contact
      let pendingAmount = 0;
      // Get all previous loans for this user and contact
      const q = query(collection(db, 'loans'), where('userId', '==', user.uid), where('contact', '==', loan.contact));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach(docSnap => {
        const data = docSnap.data();
        const amt = parseFloat(data.amount) || 0;
        if (data.loanType === 'given') {
          pendingAmount += amt;
        } else if (data.loanType === 'taken') {
          pendingAmount -= amt;
        }
      });
      // Update pendingAmount with this new loan
      const thisAmount = parseFloat(loan.amount) || 0;
      if (loan.loanType === 'given') {
        pendingAmount += thisAmount;
      } else if (loan.loanType === 'taken') {
        pendingAmount -= thisAmount;
      }
      await addDoc(collection(db, 'loans'), {
        ...loan,
        amount: thisAmount, // Store the original amount (not negative)
        userId: user.uid,
        createdAt: new Date().toISOString(),
        pendingAmount,
      });
      return true;
    } catch (error) {
      console.error('Error saving loan:', error);
      Alert.alert('Error', 'Failed to save loan.');
      return false;
    }
  };

  // Fetch loans for current user
  const fetchLoansFromFirestore = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'User not authenticated.');
        return [];
      }
      const q = query(collection(db, 'loans'), where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error fetching loans:', error);
      Alert.alert('Error', 'Failed to fetch loans.');
      return [];
    }
  };

  // Fetch and summarize loans by contact
  useEffect(() => {
    const fetchAndSummarizeLoans = async () => {
      setLoansLoading(true);
      const loans = await fetchLoansFromFirestore();
      // Group by contact, keep the latest (by createdAt) pendingAmount for each contact
      const summary = {};
      loans.forEach(loan => {
        const contact = loan.contact || 'Unknown';
        const createdAt = loan.createdAt || '';
        if (!summary[contact] || (createdAt > summary[contact].createdAt)) {
          summary[contact] = { pendingAmount: loan.pendingAmount || 0, createdAt };
        }
      });
      // Flatten for display
      const flatSummary = {};
      Object.entries(summary).forEach(([contact, val]) => {
        flatSummary[contact] = val.pendingAmount;
      });
      setLoanSummary(flatSummary);
      setLoansLoading(false);
    };
    fetchAndSummarizeLoans();
  }, []);

  // Calculate monthly pending amount for the last 12 months
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    return {
      key: `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`,
      label: d.toLocaleString('default', { month: 'short' })
    };
  });
  const monthlyPending = months.map(month => {
    // For each contact, get the latest loan for that month
    // (You may want to optimize this if you have a lot of data)
    // For now, just use the summary value for the latest month <= this month
    // This is a simple approximation
    let sum = 0;
    Object.entries(loanSummary).forEach(([contact, _]) => {
      // Find all loans for this contact in this month
      // (You may want to fetch all loans and process here for accuracy)
      sum += 0; // Placeholder, as loanSummary only has current pending
    });
    // Instead, sum all loans up to this month
    // (You may want to fetch all loans and process here for accuracy)
    return sum;
  });
  // If you have all loans, you can process them for accurate monthly pending
  // For now, just show the current total for all months as a placeholder
  const currentPending = Object.values(loanSummary).reduce((sum, amt) => sum + (amt || 0), 0);
  const monthlyPendingData = Array(12).fill(currentPending);

  const handleSubmit = async () => {
    console.log('Save Loan button pressed');
    if (!form.amount) {
      console.log('Validation failed: amount is empty');
      Alert.alert('Validation Error', 'Amount is a required field.');
      return;
    }
    if (!form.lender) {
      console.log('Validation failed: lender is empty');
      Alert.alert('Validation Error', 'Lender is a required field.');
      return;
    }
    const user = auth.currentUser;
    if (!user) {
      console.log('Validation failed: user not authenticated');
      Alert.alert('Error', 'You must be logged in to save a loan.');
      return;
    }
    const loanData = { ...form, contact: form.lender, loanType };
    console.log('Attempting to save loan:', loanData);
    const success = await saveLoanToFirestore(loanData);
    if (success) {
      Alert.alert('Success', 'Loan details saved successfully!');
      setForm({
        amount: '',
        lender: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date().toISOString().split('T')[0],
      });
    }
  };

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 80 }}>
        <Text style={[styles.title, { fontSize: 28, fontWeight: 'bold', color: '#111', marginBottom: 12, letterSpacing: 0.5 }]}>Lending</Text>
        {/* Total Pending Amount Card */}
        <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 20, marginBottom: 18, alignItems: 'center', shadowColor: '#6366f1', shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 }}>
          <Text style={{ fontSize: 16, color: '#6b7280', marginBottom: 6 }}>Total Pending Amount</Text>
          <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#6366f1' }}>₹{Object.values(loanSummary).reduce((sum, amt) => sum + (amt || 0), 0).toLocaleString('en-IN')}</Text>
        </View>
        {/* Loan summary section - moved up, styled as a card */}
        <View style={[styles.card, { marginBottom: 24, padding: 0, overflow: 'hidden', borderRadius: 18, shadowColor: '#6366f1', shadowOpacity: 0.10, shadowRadius: 12, elevation: 3 }]}> 
          <View style={{ backgroundColor: '#fff', paddingVertical: 18, paddingHorizontal: 20, borderTopLeftRadius: 18, borderTopRightRadius: 18 }}>
            <Text style={{ color: '#111', fontSize: 22, fontWeight: 'bold', letterSpacing: 0.5 }}>Loan Summary</Text>
          </View>
          {loansLoading ? (
            <View style={{ padding: 24, alignItems: 'center' }}><Text style={{ color: '#6366f1', fontWeight: '600' }}>Loading...</Text></View>
          ) : Object.keys(loanSummary).length === 0 ? (
            <View style={{ padding: 24, alignItems: 'center' }}><Text style={{ color: '#888' }}>No loans found.</Text></View>
          ) : (
            <View style={{ paddingHorizontal: 0, paddingBottom: 8 }}>
              {/* Table Header */}
              <View style={{ flexDirection: 'row', backgroundColor: '#f3f4f6', paddingVertical: 14, paddingHorizontal: 18, borderTopWidth: 0, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
                <Text style={{ flex: 2, fontWeight: '700', color: '#6366f1', fontSize: 16, letterSpacing: 0.2 }}>Contact</Text>
                <Text style={{ flex: 1, fontWeight: '700', color: '#6366f1', fontSize: 16, textAlign: 'right', letterSpacing: 0.2 }}>Pending</Text>
              </View>
              {/* Table Rows */}
              {Object.entries(loanSummary).map(([contact, pending], idx) => (
                <View key={contact + idx} style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', backgroundColor: idx % 2 === 0 ? '#fff' : '#f8faff', paddingVertical: 16, paddingHorizontal: 18 }}>
                  <Ionicons name="person-circle" size={28} color="#6366f1" style={{ marginRight: 10 }} />
                  <Text style={{ flex: 2, color: '#222', fontWeight: '600', fontSize: 15 }}>{contact}</Text>
                  <Text style={{ flex: 1, color: pending === 0 ? '#888' : (pending > 0 ? '#10b981' : '#ef4444'), fontWeight: '700', fontSize: 16, textAlign: 'right' }}>₹{pending.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
        {/* Line Graph: Pending Amount per Month */}
        <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 10, color: '#1f2937' }}>Pending Amount (Last 12 Months)</Text>
        <LineChart
          data={{
            labels: months.map(m => m.label),
            datasets: [
              {
                data: [0, ...monthlyPendingData],
                color: () => '#6366f1',
                strokeWidth: 2,
              },
            ],
          }}
          width={Dimensions.get('window').width - 40}
          height={200}
          yAxisLabel="₹"
          chartConfig={{
            backgroundColor: '#fff',
            backgroundGradientFrom: '#f9f9f9',
            backgroundGradientTo: '#f9f9f9',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(31, 41, 55, ${opacity})`,
            style: { borderRadius: 16 },
            propsForDots: {
              r: '5',
              strokeWidth: '2',
              stroke: '#6366f1',
            },
          }}
          bezier
          style={{ marginVertical: 12, borderRadius: 12 }}
        />
      </ScrollView>
      {/* Floating Add Button */}
      <TouchableOpacity
        style={{
          position: 'absolute',
          right: 24,
          bottom: 80,
          backgroundColor: '#6366f1',
          width: 60,
          height: 60,
          borderRadius: 30,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#6366f1',
          shadowOpacity: 0.18,
          shadowRadius: 8,
          elevation: 6,
        }}
        onPress={() => setShowAddModal(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
      {/* Add Loan Modal */}
      <Modal visible={showAddModal} animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <AddLoanForm onClose={() => setShowAddModal(false)} onAdded={fetchLoansFromFirestore} />
      </Modal>
      <BottomNavBar />
    </>
  );
}