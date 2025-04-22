import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Contacts from 'expo-contacts';
import styles from '../styles/LendingStyles';
import BottomNavBar from './components/BottomNavBar';

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

  const handleSubmit = () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    console.log('Borrowing details submitted:', form);
    Alert.alert('Success', 'Borrowing details saved successfully!');
    // TODO: Add API call or state management logic
  };

  // Calculate total borrowed (for summary card)
  // In a real app, fetch this from backend; here, just use the current form amount for demo
  const totalBorrowed = form.amount ? parseFloat(form.amount) : 0;

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
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 80 }}>
        {!showForm ? (
          // Main dashboard view when form is not shown
          <>
            {/* Page Title */}
            <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#111', marginBottom: 12, letterSpacing: 0.5, paddingTop: 46 }}>Borrowing</Text>
            
            {/* Summary Card */}
            <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 20, marginBottom: 18, alignItems: 'center', shadowColor: '#6366f1', shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 }}>
              <Text style={{ fontSize: 16, color: '#6b7280', marginBottom: 6 }}>Total Borrowed Amount</Text>
              <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#6366f1' }}>₹{totalBorrowed.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
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
              <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Add Borrowing</Text>
              <TouchableOpacity
                onPress={() => setShowForm(false)}
                style={{
                  padding: 8,
                  borderRadius: 8,
                  backgroundColor: '#fee2e2'
                }}
              >
                <Ionicons name="close-circle-outline" size={24} color="#ef4444" />
              </TouchableOpacity>
            </View>

            {/* Amount Field */}
            <Text style={{ marginBottom: 8, fontSize: 18 }}>Amount</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
              <TextInput
                style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, flex: 1, fontSize: 18 }}
                keyboardType="numeric"
                value={form.amount}
                onChangeText={(text) => handleChange('amount', text.replace(/[^0-9.]/g, ''))}
                placeholder="₹5000"
                placeholderTextColor="#aaa"
              />
            </View>

            {/* Lender Name & Contact Field */}
            <Text style={{ marginBottom: 8, fontSize: 18 }}>Lender's Name</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
              <TextInput
                style={{ flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, fontSize: 18 }}
                placeholder="Enter lender's name"
                value={form.lenderName}
                onChangeText={(text) => handleChange('lenderName', text)}
                placeholderTextColor="#aaa"
              />
              <TouchableOpacity onPress={selectContact} style={{ marginLeft: 10, padding: 8 }}>
                <Ionicons name="person-circle-outline" size={28} color="#6366f1" />
              </TouchableOpacity>
            </View>

            {/* Lender Number Field */}
            <Text style={{ marginBottom: 8, fontSize: 18 }}>Lender's Phone</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, fontSize: 18, marginBottom: 20 }}
              placeholder="Phone number (auto-filled if contact selected)"
              value={form.lenderNumber}
              onChangeText={(text) => handleChange('lenderNumber', text)}
              placeholderTextColor="#aaa"
              keyboardType="phone-pad"
            />

            {/* Date Borrowed Field */}
            <Text style={{ marginBottom: 8, fontSize: 18 }}>Date Borrowed</Text>
            <TouchableOpacity
              style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 14, marginBottom: 20 }}
              onPress={() => setShowDateBorrowed(true)}
            >
              <Text style={{ color: '#222', fontSize: 18 }}>{form.dateBorrowed}</Text>
            </TouchableOpacity>
            {showDateBorrowed && (
              <DateTimePicker
                value={form.dateBorrowed ? new Date(form.dateBorrowed) : new Date()}
                mode="date"
                display="default"
                maximumDate={new Date()}
                onChange={(event, selectedDate) => {
                  setShowDateBorrowed(false);
                  if (selectedDate) {
                    handleChange('dateBorrowed', selectedDate.toISOString().split('T')[0]);
                  }
                }}
              />
            )}

            {/* Note Field */}
            <Text style={{ marginBottom: 8, fontSize: 18 }}>Note (Optional)</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, fontSize: 18, marginBottom: 20 }}
              placeholder="Any note about this borrowing"
              multiline
              value={form.note}
              onChangeText={(text) => handleChange('note', text)}
              placeholderTextColor="#aaa"
            />

            {/* Repayment Amount Field */}
            <Text style={{ marginBottom: 8, fontSize: 18 }}>Repayment Amount (if paid)</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
              <TextInput
                style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, flex: 1, fontSize: 18 }}
                keyboardType="numeric"
                value={form.repayment}
                onChangeText={(text) => handleChange('repayment', text.replace(/[^0-9.]/g, ''))}
                placeholder="₹0"
                placeholderTextColor="#aaa"
              />
            </View>

            {/* Repayment Date Field */}
            <Text style={{ marginBottom: 8, fontSize: 18 }}>Repayment Date (if paid)</Text>
            <TouchableOpacity
              style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 14, marginBottom: 28 }}
              onPress={() => setShowRepaymentDate(true)}
            >
              <Text style={{ color: '#222', fontSize: 18 }}>
                {form.repaymentDate ? form.repaymentDate : 'Select date (optional)'}
              </Text>
            </TouchableOpacity>
            {showRepaymentDate && (
              <DateTimePicker
                value={form.repaymentDate ? new Date(form.repaymentDate) : new Date()}
                mode="date"
                display="default"
                maximumDate={new Date()}
                onChange={(event, selectedDate) => {
                  setShowRepaymentDate(false);
                  if (selectedDate) {
                    handleChange('repaymentDate', selectedDate.toISOString().split('T')[0]);
                  }
                }}
              />
            )}

            {/* Save Button */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8 }}>
              <TouchableOpacity 
                style={{ 
                  flex: 1, 
                  backgroundColor: '#6366f1', 
                  padding: 16, 
                  borderRadius: 8, 
                  alignItems: 'center', 
                  flexDirection: 'row', 
                  justifyContent: 'center' 
                }} 
                onPress={handleSubmit}
              >
                <Ionicons name="checkmark-circle-outline" size={22} color="#fff" style={{ marginRight: 8 }} />
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>Save</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
      
      {/* + Button at bottom right */}
      {!showForm && (
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
          onPress={() => setShowForm(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={32} color="#fff" />
        </TouchableOpacity>
      )}
      <BottomNavBar />
    </>
  );
}