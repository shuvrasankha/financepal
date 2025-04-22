import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Contacts from 'expo-contacts';
import styles from '../styles/LendingStyles';
import BottomNavBar from './components/BottomNavBar';
import { useTheme } from '../contexts/ThemeContext';
import Theme from '../constants/Theme';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy, addDoc, onSnapshot } from 'firebase/firestore';

export default function Borrowing() {
  const [form, setForm] = useState({
    amount: '',
    lenderName: '',
    lenderNumber: '', // added for phone number
    dateBorrowed: new Date().toISOString().split('T')[0],
    dueDate: '',
    note: '',
    contact: '',
    repayment: '',
    repaymentDate: '',
  });
  const [showDateBorrowed, setShowDateBorrowed] = useState(false);
  const [showRepaymentDate, setShowRepaymentDate] = useState(false);
  const [errors, setErrors] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [borrowings, setBorrowings] = useState([]);
  const [loadingBorrowings, setLoadingBorrowings] = useState(true);
  
  // fetch function for reuse
  const fetchBorrowings = async () => {
    setLoadingBorrowings(true);
    try {
      const q = query(collection(db, 'borrowings'), orderBy('dateBorrowed', 'desc'));
      const snapshot = await getDocs(q);
      setBorrowings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error('Error fetching borrowings:', error);
    } finally {
      setLoadingBorrowings(false);
    }
  };

  // Add theme context
  const { isDarkMode } = useTheme();
  const colors = isDarkMode ? Theme.dark.colors : Theme.light.colors;

  useEffect(() => {
    setLoadingBorrowings(true);
    const q = query(collection(db, 'borrowings'), orderBy('dateBorrowed', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        setBorrowings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoadingBorrowings(false);
      },
      error => {
        console.error('Error with realtime borrowings listener:', error);
        setLoadingBorrowings(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  // Date handlers
  const onDateBorrowedChange = (event, selectedDate) => {
    setShowDateBorrowed(false);
    if (selectedDate) {
      handleChange('dateBorrowed', selectedDate.toISOString().split('T')[0]);
    }
  };

  const onRepaymentDateChange = (event, selectedDate) => {
    setShowRepaymentDate(false);
    if (selectedDate) {
      handleChange('repaymentDate', selectedDate.toISOString().split('T')[0]);
    }
  };

  const validate = () => {
    let newErrors = {};
    return newErrors;
  };

  async function onSave() {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }
    try {
      await addDoc(collection(db, 'borrowings'), {
        amount: form.amount,
        lenderName: form.lenderName,
        lenderNumber: form.lenderNumber,
        dateBorrowed: form.dateBorrowed,
        dueDate: form.dueDate,
        note: form.note,
        repayment: form.repayment,
        repaymentDate: form.repaymentDate,
        createdAt: new Date().toISOString(),
      });
      Alert.alert('Success', 'Borrowing details saved successfully!');
      setForm({
        amount: '', lenderName: '', lenderNumber: '', dateBorrowed: new Date().toISOString().split('T')[0], dueDate: '', note: '', contact: '', repayment: '', repaymentDate: '',
      });
      setShowForm(false);
      fetchBorrowings();
    } catch (error) {
      console.error('Error saving borrowing:', error);
      Alert.alert('Error', 'Failed to save borrowing.');
    }
  }

  // Calculate total borrowed from fetched borrowings
  const totalBorrowed = borrowings.reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0);

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
          const contactOptions = data
            .filter(contact => contact.phoneNumbers && contact.phoneNumbers.length > 0)
            .map(contact => {
              const number = contact.phoneNumbers[0]?.number || '';
              return {
                text: `${contact.name} (${number})`,
                onPress: () => {
                  handleChange('lenderName', contact.name);
                  handleChange('lenderNumber', number);
                },
              };
            });
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
    <>
      <ScrollView 
        style={[
          styles.container, 
          { backgroundColor: colors.background }
        ]} 
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        {!showForm ? (
          // Main dashboard view when form is not shown
          <>
            {/* Page Title and Add Button */}
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: 12,
              paddingTop: 46,
              marginHorizontal: 20
            }}>
              <Text style={{ 
                fontSize: 28, 
                fontWeight: 'bold', 
                color: colors.dark, 
                letterSpacing: 0.5
              }}>
                Borrowing
              </Text>
              
              {/* Add Button */}
              <TouchableOpacity
                style={{
                  backgroundColor: colors.primary,
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  justifyContent: 'center',
                  alignItems: 'center',
                  shadowColor: colors.primary,
                  shadowOpacity: isDarkMode ? 0.3 : 0.18,
                  shadowRadius: 8,
                  elevation: 3,
                }}
                onPress={() => setShowForm(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={24} color={colors.white} />
              </TouchableOpacity>
            </View>
            
            {/* Summary Card */}
            <View style={{ 
              backgroundColor: colors.card, 
              borderRadius: 14, 
              padding: 20, 
              marginBottom: 18, 
              marginHorizontal: 20,
              alignItems: 'center', 
              shadowColor: colors.primary, 
              shadowOpacity: isDarkMode ? 0.4 : 0.08, 
              shadowRadius: 6, 
              elevation: 2 
            }}>
              <Text style={{ fontSize: 16, color: colors.medium, marginBottom: 6 }}>
                Total Borrowed Amount
              </Text>
              <Text style={{ fontSize: 28, fontWeight: 'bold', color: colors.primary }}>
                ₹{totalBorrowed.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          </>
        ) : (
          // Form view displayed directly in the main ScrollView, not in a card
          <>
            {/* Header with Title and Close Button */}
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: 24,
              marginTop: 46
            }}>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.dark }}>Add Borrowing</Text>
              <TouchableOpacity
                onPress={() => setShowForm(false)}
                style={{
                  padding: 8,
                  borderRadius: 8,
                  backgroundColor: isDarkMode ? '#463737' : '#fee2e2'
                }}
              >
                <Ionicons name="close-circle-outline" size={24} color={colors.error} />
              </TouchableOpacity>
            </View>

            {/* Amount Field */}
            <Text style={{ marginBottom: 8, fontSize: 18, color: colors.dark }}>Amount</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
              <TextInput
                style={{ 
                  borderWidth: 1, 
                  borderColor: colors.light, 
                  borderRadius: 8, 
                  padding: 10, 
                  flex: 1, 
                  fontSize: 18,
                  color: colors.dark,
                  backgroundColor: isDarkMode ? colors.lighter : '#fff'
                }}
                keyboardType="numeric"
                value={form.amount}
                onChangeText={(text) => handleChange('amount', text.replace(/[^0-9.]/g, ''))}
                placeholder="₹5000"
                placeholderTextColor={isDarkMode ? '#888' : '#aaa'}
              />
            </View>

            {/* Lender Name & Contact Field */}
            <Text style={{ marginBottom: 8, fontSize: 18, color: colors.dark }}>Lender's Name</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
              <TextInput
                style={{ 
                  flex: 1, 
                  borderWidth: 1, 
                  borderColor: colors.light, 
                  borderRadius: 8, 
                  padding: 10, 
                  fontSize: 18,
                  color: colors.dark,
                  backgroundColor: isDarkMode ? colors.lighter : '#fff'
                }}
                placeholder="Enter lender's name"
                value={form.lenderName}
                onChangeText={(text) => handleChange('lenderName', text)}
                placeholderTextColor={isDarkMode ? '#888' : '#aaa'}
              />
              <TouchableOpacity onPress={selectContact} style={{ marginLeft: 10, padding: 8 }}>
                <Ionicons name="person-circle-outline" size={28} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Lender Number Field */}
            <Text style={{ marginBottom: 8, fontSize: 18, color: colors.dark }}>Lender's Phone</Text>
            <TextInput
              style={{ 
                borderWidth: 1, 
                borderColor: colors.light, 
                borderRadius: 8, 
                padding: 10, 
                fontSize: 18, 
                marginBottom: 20,
                color: colors.dark,
                backgroundColor: isDarkMode ? colors.lighter : '#fff'
              }}
              placeholder="Phone number (auto-filled if contact selected)"
              value={form.lenderNumber}
              onChangeText={(text) => handleChange('lenderNumber', text)}
              placeholderTextColor={isDarkMode ? '#888' : '#aaa'}
              keyboardType="phone-pad"
            />

            {/* Date Borrowed Field */}
            <Text style={{ marginBottom: 8, fontSize: 18, color: colors.dark }}>Date Borrowed</Text>
            <TouchableOpacity
              style={{ 
                borderWidth: 1, 
                borderColor: colors.light, 
                borderRadius: 8, 
                padding: 14, 
                marginBottom: 20,
                backgroundColor: isDarkMode ? colors.lighter : '#fff'
              }}
              onPress={() => setShowDateBorrowed(true)}
            >
              <Text style={{ color: colors.dark, fontSize: 18 }}>{form.dateBorrowed}</Text>
            </TouchableOpacity>
            {showDateBorrowed && (
              <DateTimePicker
                value={form.dateBorrowed ? new Date(form.dateBorrowed) : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                maximumDate={new Date()}
                onChange={(event, selectedDate) => {
                  setShowDateBorrowed(false);
                  if (selectedDate) {
                    handleChange('dateBorrowed', selectedDate.toISOString().split('T')[0]);
                  }
                }}
                // Add theme styling for iOS
                themeVariant={isDarkMode ? 'dark' : 'light'}
              />
            )}

            {/* Note Field */}
            <Text style={{ marginBottom: 8, fontSize: 18, color: colors.dark }}>Note (Optional)</Text>
            <TextInput
              style={{ 
                borderWidth: 1, 
                borderColor: colors.light, 
                borderRadius: 8, 
                padding: 10, 
                fontSize: 18, 
                marginBottom: 20,
                color: colors.dark,
                backgroundColor: isDarkMode ? colors.lighter : '#fff'
              }}
              placeholder="Any note about this borrowing"
              multiline
              value={form.note}
              onChangeText={(text) => handleChange('note', text)}
              placeholderTextColor={isDarkMode ? '#888' : '#aaa'}
            />

            {/* Repayment Amount Field */}
            <Text style={{ marginBottom: 8, fontSize: 18, color: colors.dark }}>Repayment Amount (if paid)</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
              <TextInput
                style={{ 
                  borderWidth: 1, 
                  borderColor: colors.light, 
                  borderRadius: 8, 
                  padding: 10, 
                  flex: 1, 
                  fontSize: 18,
                  color: colors.dark,
                  backgroundColor: isDarkMode ? colors.lighter : '#fff'
                }}
                keyboardType="numeric"
                value={form.repayment}
                onChangeText={(text) => handleChange('repayment', text.replace(/[^0-9.]/g, ''))}
                placeholder="₹0"
                placeholderTextColor={isDarkMode ? '#888' : '#aaa'}
              />
            </View>

            {/* Repayment Date Field */}
            <Text style={{ marginBottom: 8, fontSize: 18, color: colors.dark }}>Repayment Date (if paid)</Text>
            <TouchableOpacity
              style={{ 
                borderWidth: 1, 
                borderColor: colors.light, 
                borderRadius: 8, 
                padding: 14, 
                marginBottom: 28,
                backgroundColor: isDarkMode ? colors.lighter : '#fff'
              }}
              onPress={() => setShowRepaymentDate(true)}
            >
              <Text style={{ color: colors.dark, fontSize: 18 }}>
                {form.repaymentDate ? form.repaymentDate : 'Select date (optional)'}
              </Text>
            </TouchableOpacity>
            {showRepaymentDate && (
              <DateTimePicker
                value={form.repaymentDate ? new Date(form.repaymentDate) : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                maximumDate={new Date()}
                onChange={(event, selectedDate) => {
                  setShowRepaymentDate(false);
                  if (selectedDate) {
                    handleChange('repaymentDate', selectedDate.toISOString().split('T')[0]);
                  }
                }}
                // Add theme styling for iOS
                themeVariant={isDarkMode ? 'dark' : 'light'}
              />
            )}

            {/* Save Button */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8 }}>
              <TouchableOpacity 
                style={{ 
                  flex: 1, 
                  backgroundColor: colors.primary, 
                  padding: 16, 
                  borderRadius: 8, 
                  alignItems: 'center', 
                  flexDirection: 'row', 
                  justifyContent: 'center' 
                }} 
                onPress={onSave}
              >
                <Ionicons name="checkmark-circle-outline" size={22} color={colors.white} style={{ marginRight: 8 }} />
                <Text style={{ color: colors.white, fontWeight: 'bold', fontSize: 18 }}>Save</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
      
      <BottomNavBar />
    </>
  );
}