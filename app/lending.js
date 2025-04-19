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
          const contactOptions = data.slice(0, 5).flatMap(contact => {
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
      await addDoc(collection(db, 'loans'), {
        ...loan,
        userId: user.uid,
        createdAt: new Date().toISOString(),
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
      // Group and sum by contact
      const summary = {};
      loans.forEach(loan => {
        const contact = loan.contact || 'Unknown';
        const amount = parseFloat(loan.amount) || 0;
        if (!summary[contact]) summary[contact] = 0;
        summary[contact] += amount;
      });
      setLoanSummary(summary);
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
        <View style={styles.card}>
          <Text style={styles.title}>Add Loan</Text>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 }}>
            <TouchableOpacity
              style={[styles.toggleButton, loanType === 'given' && styles.toggleButtonActive]}
              onPress={() => setLoanType('given')}
            >
              <Text style={[styles.toggleButtonText, loanType === 'given' && styles.toggleButtonTextActive]}>Money Given</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, loanType === 'taken' && styles.toggleButtonActive]}
              onPress={() => setLoanType('taken')}
            >
              <Text style={[styles.toggleButtonText, loanType === 'taken' && styles.toggleButtonTextActive]}>Money Taken</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Amount (₹)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter amount"
              keyboardType="numeric"
              value={form.amount}
              onChangeText={(text) => handleChange('amount', text)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contact</Text>
            <TouchableOpacity style={styles.contactPicker} onPress={selectContact}>
              <Ionicons name="person-outline" size={22} color="#888" style={{ marginRight: 8 }} />
              <Text style={form.contact ? styles.contactPickerText : [styles.contactPickerText, { color: '#bbb' }] }>
                {form.contact ? form.contact : 'Choose a contact'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter description"
              value={form.description}
              onChangeText={(text) => handleChange('description', text)}
            />
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 }}>
            <TouchableOpacity
              style={[styles.datePicker, { flex: 1, marginRight: 8 }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color="#888" style={{ marginRight: 6 }} />
              <Text>{new Date(form.date).toLocaleDateString()}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.datePicker, { flex: 1, marginLeft: 8 }]}
              onPress={() => setShowDueDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color="#888" style={{ marginRight: 6 }} />
              <Text>Due: {new Date(form.dueDate).toLocaleDateString()}</Text>
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

          <TouchableOpacity style={styles.saveButton} onPress={handleSubmit}>
            <Text style={styles.saveButtonText}>Save Loan</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
       {/* Loan summary section */}
      <View style={styles.card}>
        <Text style={[styles.title, { fontSize: 20, marginBottom: 12 }]}>Loan Summary by Contact</Text>
        {loansLoading ? (
          <Text>Loading...</Text>
        ) : Object.keys(loanSummary).length === 0 ? (
          <Text style={{ color: '#888' }}>No loans found.</Text>
        ) : (
          Object.entries(loanSummary).map(([contact, total], idx) => (
            <View key={contact + idx} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: '#222', fontWeight: '500' }}>{contact}</Text>
              <Text style={{ color: '#3B66FF', fontWeight: '600' }}>₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
            </View>
          ))
        )}
      </View>
      <BottomNavBar />
     
    </>
  );
}