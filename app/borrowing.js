import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import styles from '../styles/LendingStyles';
import BottomNavBar from './components/BottomNavBar';

export default function Borrowing() {
  const [form, setForm] = useState({
    amount: '',
    lenderName: '',
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

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 80 }}>
        {/* Page Title */}
        <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#111', marginBottom: 12, letterSpacing: 0.5 }}>Borrowing</Text>
        {/* Summary Card */}
        <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 20, marginBottom: 18, alignItems: 'center', shadowColor: '#6366f1', shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 }}>
          <Text style={{ fontSize: 16, color: '#6b7280', marginBottom: 6 }}>Total Borrowed Amount</Text>
          <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#6366f1' }}>₹{totalBorrowed.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
        </View>
        {/* Borrowing Form Card */}
        {showForm && (
          <View style={[styles.card, { marginBottom: 24, padding: 20, borderRadius: 18, shadowColor: '#6366f1', shadowOpacity: 0.10, shadowRadius: 12, elevation: 3 }]}> 
            <Text style={{ color: '#6366f1', fontSize: 22, fontWeight: 'bold', marginBottom: 18, letterSpacing: 0.5 }}>Add Borrowing</Text>
            {/* Amount */}
            <Text style={{ marginBottom: 8, fontSize: 18, color: '#6366f1', fontWeight: '600' }}>Amount (₹)</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
              <FontAwesome5 name="rupee-sign" size={20} color="#6366f1" style={{ marginRight: 8 }} />
              <TextInput
                style={{ borderWidth: 1, borderColor: '#6366f1', borderRadius: 10, padding: 12, fontSize: 18, color: '#222', backgroundColor: '#F8FAFF', flex: 1 }}
                placeholder="Enter amount"
                keyboardType="numeric"
                value={form.amount}
                onChangeText={(text) => handleChange('amount', text)}
                placeholderTextColor="#b6c3e0"
              />
            </View>
            {/* Lender Name */}
            <Text style={{ marginBottom: 8, fontSize: 18, color: '#6366f1', fontWeight: '600' }}>Lender's Name</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
              <Ionicons name="person" size={20} color="#6366f1" style={{ marginRight: 8 }} />
              <TextInput
                style={{ borderWidth: 1, borderColor: '#6366f1', borderRadius: 10, padding: 12, fontSize: 18, color: '#222', backgroundColor: '#F8FAFF', flex: 1 }}
                placeholder="Enter lender's name"
                value={form.lenderName}
                onChangeText={(text) => handleChange('lenderName', text)}
                placeholderTextColor="#b6c3e0"
              />
            </View>
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
                onChange={(event, selectedDate) => {
                  setShowDateBorrowed(false);
                  if (selectedDate) handleChange('dateBorrowed', selectedDate.toISOString().split('T')[0]);
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
              <FontAwesome5 name="rupee-sign" size={20} color="#6366f1" style={{ marginRight: 8 }} />
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
              <Text style={{ color: '#222', fontWeight: '500', fontSize: 15 }}>Repayment: {form.repaymentDate || 'YYYY-MM-DD'}</Text>
            </TouchableOpacity>
            {showRepaymentDate && (
              <DateTimePicker
                value={form.repaymentDate ? new Date(form.repaymentDate) : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => {
                  setShowRepaymentDate(false);
                  if (selectedDate) handleChange('repaymentDate', selectedDate.toISOString().split('T')[0]);
                }}
              />
            )}
            {/* Save & Cancel Buttons */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <TouchableOpacity style={{ flex: 1, backgroundColor: '#6366f1', padding: 16, borderRadius: 8, alignItems: 'center', marginRight: 10, flexDirection: 'row', justifyContent: 'center' }} onPress={handleSubmit}>
                <Ionicons name="checkmark-circle-outline" size={22} color="#fff" style={{ marginRight: 8 }} />
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, backgroundColor: '#fee2e2', padding: 16, borderRadius: 8, alignItems: 'center', marginLeft: 10, flexDirection: 'row', justifyContent: 'center' }} onPress={() => setShowForm(false)}>
                <Ionicons name="close-circle-outline" size={22} color="#ef4444" style={{ marginRight: 8 }} />
                <Text style={{ color: '#ef4444', fontWeight: 'bold', fontSize: 18 }}>Cancel</Text>
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