import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import styles from '../styles/LendingStyles';
import BottomNavBar from './components/BottomNavBar';
import { db, auth } from '../firebase';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';

export default function Lending() {
  const [loanType, setLoanType] = useState('given'); // 'given' or 'taken'
  const [form, setForm] = useState({
    amount: '',
    contact: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
  });
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [loanSummary, setLoanSummary] = useState({});
  const [loansLoading, setLoansLoading] = useState(true);

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
          // Show contact picker with phone numbers
          const contactOptions = data.flatMap(contact => {
            if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
              return contact.phoneNumbers.map(phone => ({
                text: `${contact.name} (${phone.number})`,
                onPress: () => handleChange('contact', `${contact.name} (${phone.number})`)
              }));
            } else {
              return [{
                text: `${contact.name} (No number)`,
                onPress: () => handleChange('contact', `${contact.name}`)
              }];
            }
          });
          contactOptions.push({ text: 'Cancel', style: 'cancel' });
          Alert.alert('Select Contact', 'Choose a contact:', contactOptions);
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

  const handleSubmit = async () => {
    console.log('Save Loan button pressed');
    if (!form.amount) {
      console.log('Validation failed: amount is empty');
      Alert.alert('Validation Error', 'Amount is a required field.');
      return;
    }
    if (!form.contact) {
      console.log('Validation failed: contact is empty');
      Alert.alert('Validation Error', 'Contact is a required field.');
      return;
    }
    const user = auth.currentUser;
    if (!user) {
      console.log('Validation failed: user not authenticated');
      Alert.alert('Error', 'You must be logged in to save a loan.');
      return;
    }
    const loanData = { ...form, loanType };
    console.log('Attempting to save loan:', loanData);
    const success = await saveLoanToFirestore(loanData);
    if (success) {
      Alert.alert('Success', 'Loan details saved successfully!');
      setForm({
        amount: '',
        contact: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date().toISOString().split('T')[0],
      });
    }
  };

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 80 }}>
        <Text style={[styles.title, { fontSize: 28, fontWeight: 'bold', color: '#3B66FF', marginBottom: 12, letterSpacing: 0.5 }]}>Add Loan</Text>
        <View style={[styles.card, { shadowColor: '#3B66FF', shadowOpacity: 0.08, shadowRadius: 12, elevation: 4, borderWidth: 0 }]}> 
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 24, gap: 12 }}>
            <TouchableOpacity
              style={[styles.toggleButton, loanType === 'given' && styles.toggleButtonActive, { flex: 1, borderRadius: 12, borderWidth: 0, backgroundColor: loanType === 'given' ? '#3B66FF' : '#F3F4F6', shadowColor: '#3B66FF', shadowOpacity: loanType === 'given' ? 0.12 : 0, shadowRadius: 6, elevation: loanType === 'given' ? 2 : 0 }]}
              onPress={() => setLoanType('given')}
              activeOpacity={0.85}
            >
              <Ionicons name="arrow-up-circle" size={22} color={loanType === 'given' ? '#fff' : '#3B66FF'} style={{ marginBottom: 2 }} />
              <Text style={[styles.toggleButtonText, loanType === 'given' && styles.toggleButtonTextActive, { fontWeight: '700', fontSize: 16 }]}>Money Given</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, loanType === 'taken' && styles.toggleButtonActive, { flex: 1, borderRadius: 12, borderWidth: 0, backgroundColor: loanType === 'taken' ? '#ef4444' : '#F3F4F6', shadowColor: '#ef4444', shadowOpacity: loanType === 'taken' ? 0.12 : 0, shadowRadius: 6, elevation: loanType === 'taken' ? 2 : 0 }]}
              onPress={() => setLoanType('taken')}
              activeOpacity={0.85}
            >
              <Ionicons name="arrow-down-circle" size={22} color={loanType === 'taken' ? '#fff' : '#ef4444'} style={{ marginBottom: 2 }} />
              <Text style={[styles.toggleButtonText, loanType === 'taken' && styles.toggleButtonTextActive, { fontWeight: '700', fontSize: 16 }]}>Money Taken</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.inputGroup, { marginBottom: 18 }]}> 
            <Text style={[styles.label, { fontSize: 15, color: '#3B66FF', fontWeight: '600' }]}>Amount (₹)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: '#F8FAFF', borderColor: '#3B66FF', borderWidth: 1, borderRadius: 10, fontSize: 18, fontWeight: '600', color: '#222' }]}
              placeholder="Enter amount"
              keyboardType="numeric"
              value={form.amount}
              onChangeText={(text) => handleChange('amount', text)}
              placeholderTextColor="#b6c3e0"
            />
          </View>

          <View style={[styles.inputGroup, { marginBottom: 18 }]}> 
            <Text style={[styles.label, { fontSize: 15, color: '#3B66FF', fontWeight: '600' }]}>Contact</Text>
            <TouchableOpacity style={[styles.contactPicker, { backgroundColor: '#F8FAFF', borderColor: '#3B66FF', borderWidth: 1, borderRadius: 10 }]} onPress={selectContact} activeOpacity={0.85}>
              <Ionicons name="person-outline" size={22} color="#3B66FF" style={{ marginRight: 8 }} />
              <Text style={form.contact ? [styles.contactPickerText, { color: '#222', fontWeight: '500' }] : [styles.contactPickerText, { color: '#b6c3e0' }] }>
                {form.contact ? form.contact : 'Choose a contact'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.inputGroup, { marginBottom: 18 }]}> 
            <Text style={[styles.label, { fontSize: 15, color: '#3B66FF', fontWeight: '600' }]}>Description (Optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: '#F8FAFF', borderColor: '#e5e7eb', borderWidth: 1, borderRadius: 10, fontSize: 16, color: '#444' }]}
              placeholder="Enter description"
              value={form.description}
              onChangeText={(text) => handleChange('description', text)}
              placeholderTextColor="#b6c3e0"
            />
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, gap: 10 }}>
            <TouchableOpacity
              style={[styles.datePicker, { flex: 1, backgroundColor: '#F8FAFF', borderColor: '#3B66FF', borderWidth: 1, borderRadius: 10, alignItems: 'center', flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 10 }]}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="calendar-outline" size={20} color="#3B66FF" style={{ marginRight: 6 }} />
              <Text style={{ color: '#222', fontWeight: '500', fontSize: 15 }}>{new Date(form.date).toLocaleDateString()}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.datePicker, { flex: 1, backgroundColor: '#F8FAFF', borderColor: '#3B66FF', borderWidth: 1, borderRadius: 10, alignItems: 'center', flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 10 }]}
              onPress={() => setShowDueDatePicker(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="calendar-outline" size={20} color="#3B66FF" style={{ marginRight: 6 }} />
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

          <TouchableOpacity style={[styles.saveButton, { backgroundColor: '#3B66FF', borderRadius: 14, marginTop: 8, shadowColor: '#3B66FF', shadowOpacity: 0.15, shadowRadius: 8, elevation: 2 }]} onPress={handleSubmit} activeOpacity={0.85}>
            <Text style={[styles.saveButtonText, { fontSize: 17, fontWeight: '700', letterSpacing: 0.2 }]}>Save Loan</Text>
          </TouchableOpacity>
        </View>
        {/* Loan summary section - moved inside ScrollView so it scrolls with content */}
        <View style={[styles.card, { marginTop: 24, padding: 0, overflow: 'hidden', borderRadius: 18, shadowColor: '#3B66FF', shadowOpacity: 0.10, shadowRadius: 12, elevation: 3 }]}> 
          <View style={{ backgroundColor: '#3B66FF', paddingVertical: 18, paddingHorizontal: 20, borderTopLeftRadius: 18, borderTopRightRadius: 18 }}>
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: 'bold', letterSpacing: 0.5 }}>Loan Summary by Contact</Text>
          </View>
          {loansLoading ? (
            <View style={{ padding: 24, alignItems: 'center' }}><Text style={{ color: '#3B66FF', fontWeight: '600' }}>Loading...</Text></View>
          ) : Object.keys(loanSummary).length === 0 ? (
            <View style={{ padding: 24, alignItems: 'center' }}><Text style={{ color: '#888' }}>No loans found.</Text></View>
          ) : (
            <View style={{ paddingHorizontal: 0, paddingBottom: 8 }}>
              {/* Table Header */}
              <View style={{ flexDirection: 'row', backgroundColor: '#f3f4f6', paddingVertical: 14, paddingHorizontal: 18, borderTopWidth: 0, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
                <Text style={{ flex: 2, fontWeight: '700', color: '#3B66FF', fontSize: 16, letterSpacing: 0.2 }}>Contact</Text>
                <Text style={{ flex: 1, fontWeight: '700', color: '#3B66FF', fontSize: 16, textAlign: 'right', letterSpacing: 0.2 }}>Pending</Text>
              </View>
              {/* Table Rows */}
              {Object.entries(loanSummary).map(([contact, pending], idx) => (
                <View key={contact + idx} style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', backgroundColor: idx % 2 === 0 ? '#fff' : '#f8faff', paddingVertical: 16, paddingHorizontal: 18 }}>
                  <Ionicons name="person-circle" size={28} color="#3B66FF" style={{ marginRight: 10 }} />
                  <Text style={{ flex: 2, color: '#222', fontWeight: '600', fontSize: 15 }}>{contact}</Text>
                  <Text style={{ flex: 1, color: pending === 0 ? '#888' : (pending > 0 ? '#10b981' : '#ef4444'), fontWeight: '700', fontSize: 16, textAlign: 'right' }}>₹{pending.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
      <BottomNavBar />
    </>
  );
}