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
        {/* Page Title */}
        {!showForm && (
          <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#111', marginBottom: 12, letterSpacing: 0.5, paddingTop: 46 }}>Borrowing</Text>
        )}
        {/* Summary Card */}
        {!showForm && (
          <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 20, marginBottom: 18, alignItems: 'center', shadowColor: '#6366f1', shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 }}>
            <Text style={{ fontSize: 16, color: '#6b7280', marginBottom: 6 }}>Total Borrowed Amount</Text>
            <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#6366f1' }}>₹{totalBorrowed.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
          </View>
        )}
        {/* Borrowing Form Card */}
        {showForm && (
          <View style={[styles.card, { marginBottom: 24, padding: 20, borderRadius: 18, shadowColor: '#6366f1', shadowOpacity: 0.10, shadowRadius: 12, elevation: 3 }]}> 
            <TouchableOpacity
              onPress={() => setShowForm(false)}
              style={{ position: 'absolute', top: 34, right: 18, zIndex: 10, padding: 6 }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={32} color="#ef4444" />
            </TouchableOpacity>
            <Text style={{ color: '#6366f1', fontSize: 22, fontWeight: 'bold', marginBottom: 18, letterSpacing: 0.5 }}>Add Borrowing</Text>
            {/* Amount */}
            <Text style={{ marginBottom: 8, fontSize: 18, color: '#6366f1', fontWeight: '600' }}>Amount</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
              <TextInput
                style={{ borderWidth: 1, borderColor: '#6366f1', borderRadius: 10, padding: 12, fontSize: 18, color: '#222', backgroundColor: '#F8FAFF', flex: 1 }}
                placeholder="Enter amount"
                keyboardType="numeric"
                value={form.amount}
                onChangeText={(text) => handleChange('amount', text)}
                placeholderTextColor="#b6c3e0"
              />
            </View>
            {/* Lender Name & Number Picker */}
            <Text style={{ marginBottom: 8, fontSize: 18, color: '#6366f1', fontWeight: '600' }}>Lender's Name</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
              <TextInput
                style={{ flex: 1, borderWidth: 1, borderColor: '#6366f1', borderRadius: 10, padding: 12, fontSize: 18, color: '#222', backgroundColor: '#F8FAFF' }}
                placeholder="Enter lender's name"
                value={form.lenderName}
                onChangeText={(text) => handleChange('lenderName', text)}
                placeholderTextColor="#b6c3e0"
              />
              <TouchableOpacity onPress={selectContact} style={{ marginLeft: 10 }}>
                <Ionicons name="person-circle-outline" size={28} color="#6366f1" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, fontSize: 16, color: '#444', backgroundColor: '#F8FAFF', marginBottom: 18 }}
              placeholder="Phone number (auto-filled if contact selected)"
              value={form.lenderNumber}
              onChangeText={(text) => handleChange('lenderNumber', text)}
              placeholderTextColor="#b6c3e0"
              keyboardType="phone-pad"
            />
            {/* Date Borrowed */}
            <TouchableOpacity
              style={{ backgroundColor: '#F8FAFF', borderColor: '#6366f1', borderWidth: 1, borderRadius: 10, alignItems: 'center', flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 10, marginBottom: 18 }}
              onPress={() => setShowDateBorrowed(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="calendar-outline" size={20} color="#6366f1" style={{ marginRight: 6 }} />
              <Text style={{ color: '#222', fontWeight: '500', fontSize: 15 }}>{form.dateBorrowed}</Text>
            </TouchableOpacity>
            {showDateBorrowed && (
              <DateTimePicker
                value={form.dateBorrowed ? new Date(form.dateBorrowed) : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date()}
                onChange={(event, selectedDate) => {
                  setShowDateBorrowed(false);
                  if (selectedDate) {
                    // Always store as YYYY-MM-DD string
                    handleChange('dateBorrowed', selectedDate.toISOString().split('T')[0]);
                  }
                }}
              />
            )}
            {/* Note */}
            <Text style={{ marginBottom: 8, fontSize: 18, color: '#6366f1', fontWeight: '600' }}>Note (Optional)</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, fontSize: 16, color: '#444', backgroundColor: '#F8FAFF', marginBottom: 18 }}
              placeholder="For medical expenses"
              multiline
              numberOfLines={3}
              value={form.note}
              onChangeText={(text) => handleChange('note', text)}
              placeholderTextColor="#b6c3e0"
            />
            {/* Contact */}
            <Text style={{ marginBottom: 8, fontSize: 18, color: '#6366f1', fontWeight: '600' }}>Contact (Optional)</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, fontSize: 16, color: '#444', backgroundColor: '#F8FAFF', marginBottom: 18 }}
              placeholder="Phone number"
              keyboardType="phone-pad"
              value={form.contact}
              onChangeText={(text) => handleChange('contact', text)}
              placeholderTextColor="#b6c3e0"
            />
            {/* Repayment Amount & Date */}
            <Text style={{ marginBottom: 8, fontSize: 18, color: '#6366f1', fontWeight: '600' }}>Repayment Amount (if paid)</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
              <TextInput
                style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, fontSize: 18, color: '#222', backgroundColor: '#F8FAFF', flex: 1 }}
                placeholder="Enter repayment amount"
                keyboardType="numeric"
                value={form.repayment}
                onChangeText={(text) => handleChange('repayment', text)}
                placeholderTextColor="#b6c3e0"
              />
            </View>
            <TouchableOpacity
              style={{ backgroundColor: '#F8FAFF', borderColor: '#e5e7eb', borderWidth: 1, borderRadius: 10, alignItems: 'center', flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 10, marginBottom: 18 }}
              onPress={() => setShowRepaymentDate(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="calendar-outline" size={20} color="#6366f1" style={{ marginRight: 6 }} />
              <Text style={{ color: '#222', fontWeight: '500', fontSize: 15 }}>{form.repaymentDate || 'YYYY-MM-DD'}</Text>
            </TouchableOpacity>
            {showRepaymentDate && (
              <DateTimePicker
                value={form.repaymentDate ? new Date(form.repaymentDate) : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date()}
                onChange={(event, selectedDate) => {
                  setShowRepaymentDate(false);
                  if (selectedDate) {
                    handleChange('repaymentDate', selectedDate.toISOString().split('T')[0]);
                  }
                }}
              />
            )}
            {/* Save & Cancel Buttons */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <TouchableOpacity style={{ flex: 1, backgroundColor: '#6366f1', padding: 16, borderRadius: 8, alignItems: 'center', marginRight: 10, flexDirection: 'row', justifyContent: 'center' }} onPress={handleSubmit}>
                <Ionicons name="checkmark-circle-outline" size={22} color="#fff" style={{ marginRight: 8 }} />
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
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