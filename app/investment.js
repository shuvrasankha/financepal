import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import styles from '../styles/LendingStyles'; // Reusing LendingStyles for consistency
import BottomNavBar from './components/BottomNavBar';

const INVESTMENT_TYPES = ['Stocks', 'Mutual Funds', 'Fixed Deposit', 'Real Estate', 'Gold', 'Others'];

export default function Investment() {
  const [form, setForm] = useState({
    amount: '',
    investmentType: '',
    dateInvested: new Date().toISOString().split('T')[0],
    maturityDate: '',
    note: '',
    contact: '',
  });

  const [showMaturityDatePicker, setShowMaturityDatePicker] = useState(false);
  const [showInvestmentTypeModal, setShowInvestmentTypeModal] = useState(false);
  const [showDateInvestedPicker, setShowDateInvestedPicker] = useState(false);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!form.amount || !form.investmentType) {
      Alert.alert('Error', 'Amount and Investment Type are required fields.');
      return;
    }
    console.log('Investment details submitted:', form);
    Alert.alert('Success', 'Investment details saved successfully!');
    // TODO: Add API call or state management logic
  };

  const handleMaturityDateChange = (event, selectedDate) => {
    setShowMaturityDatePicker(Platform.OS === 'ios'); // Only keep open on iOS
    if (selectedDate) {
      const investedDate = new Date(form.dateInvested);
      if (selectedDate >= investedDate) {
        handleChange('maturityDate', selectedDate.toISOString().split('T')[0]);
      } else {
        Alert.alert(
          'Invalid Date',
          'Maturity date must be after the investment date.'
        );
      }
    }
  };

  const handleDateInvestedChange = (event, selectedDate) => {
    const currentDate = selectedDate || form.dateInvested;
    setShowDateInvestedPicker(Platform.OS === 'ios'); // Only keep open on iOS
    if (selectedDate) {
      handleChange('dateInvested', currentDate.toISOString().split('T')[0]);
    }
  };

  return (
    <>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Investment</Text>

        <View style={styles.card}>
          {/* Amount Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Amount</Text>
            <TextInput
              style={styles.input}
              placeholder="₹5000.00"
              keyboardType="numeric"
              value={form.amount}
              onChangeText={(text) => {
                const numericValue = text.replace(/[^0-9.]/g, '');
                if (/^\d*\.?\d*$/.test(numericValue)) {
                  handleChange('amount', numericValue);
                }
              }}
            />
          </View>

          {/* Investment Type Picker */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Investment Type</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowInvestmentTypeModal(true)}
            >
              <Text style={[styles.inputText, !form.investmentType && localStyles.placeholderText]}>
                {form.investmentType || 'Select Investment Type'}
              </Text>
            </TouchableOpacity>

            <Modal
              visible={showInvestmentTypeModal}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setShowInvestmentTypeModal(false)}
            >
              <View style={localStyles.modalOverlay}>
                <View style={localStyles.modalContent}>
                  <Text style={localStyles.modalTitle}>Select Investment Type</Text>
                  {INVESTMENT_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        localStyles.categoryItem,
                        form.investmentType === type && localStyles.selectedCategory,
                      ]}
                      onPress={() => {
                        handleChange('investmentType', type); // Update state
                        setShowInvestmentTypeModal(false); // Close modal
                      }}
                    >
                      <Text
                        style={[
                          localStyles.categoryItemText,
                          form.investmentType === type && localStyles.selectedCategoryText,
                        ]}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={localStyles.cancelButton}
                    onPress={() => setShowInvestmentTypeModal(false)}
                  >
                    <Text style={localStyles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          </View>

          {/* Date Invested */}
          <View style={styles.inputGroup}>
            <View style={styles.labelContainer}>
              <Ionicons name="calendar-outline" size={18} color="#6366f1" />
              <Text style={styles.label}>Date Invested</Text>
            </View>
            {Platform.OS !== 'web' ? (
              <>
                <TouchableOpacity 
                  style={styles.input}
                  onPress={() => setShowDateInvestedPicker(true)}
                >
                  <Text style={styles.inputText}>
                    {form.dateInvested ? new Date(form.dateInvested).toLocaleDateString() : 'Select Date'}
                  </Text>
                </TouchableOpacity>
                {showDateInvestedPicker && (
                  <DateTimePicker
                    value={form.dateInvested ? new Date(form.dateInvested) : new Date()}
                    mode="date"
                    display="default"
                    onChange={handleDateInvestedChange}
                    maximumDate={new Date()}
                  />
                )}
              </>
            ) : (
              <TouchableOpacity
                style={styles.input}
                onPress={() => {
                  const newDate = prompt(
                    'Enter investment date (YYYY-MM-DD):',
                    form.dateInvested
                  );
                  if (newDate) {
                    const parsedDate = new Date(newDate);
                    if (!isNaN(parsedDate)) {
                      handleChange('dateInvested', parsedDate.toISOString().split('T')[0]);
                    } else {
                      Alert.alert(
                        'Invalid Date',
                        'Please enter a valid date in YYYY-MM-DD format.'
                      );
                    }
                  }
                }}
              >
                <Text style={styles.inputText}>
                  {form.dateInvested ? new Date(form.dateInvested).toLocaleDateString() : 'Select Date'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Maturity Date Picker */}
          <View style={styles.inputGroup}>
            <View style={styles.labelContainer}>
              <Ionicons name="calendar-outline" size={18} color="#6366f1" />
              <Text style={styles.label}>Maturity Date (Optional)</Text>
            </View>
            {Platform.OS !== 'web' ? (
              <>
                <TouchableOpacity 
                  style={styles.input}
                  onPress={() => setShowMaturityDatePicker(true)}
                >
                  <Text style={styles.inputText}>
                    {form.maturityDate ? new Date(form.maturityDate).toLocaleDateString() : 'Select Date'}
                  </Text>
                </TouchableOpacity>
                {showMaturityDatePicker && (
                  <DateTimePicker
                    value={form.maturityDate ? new Date(form.maturityDate) : new Date()}
                    mode="date"
                    display="default"
                    onChange={handleMaturityDateChange}
                    minimumDate={new Date(form.dateInvested)} // Ensure maturity date is after investment date
                  />
                )}
              </>
            ) : (
              <TouchableOpacity
                style={styles.input}
                onPress={() => {
                  const newDate = prompt(
                    'Enter maturity date (YYYY-MM-DD):',
                    form.maturityDate
                  );
                  if (newDate) {
                    const parsedDate = new Date(newDate);
                    const investedDate = new Date(form.dateInvested);
                    if (!isNaN(parsedDate)) {
                      if (parsedDate >= investedDate) {
                        handleChange('maturityDate', parsedDate.toISOString().split('T')[0]);
                      } else {
                        Alert.alert(
                          'Invalid Date',
                          'Maturity date must be after the investment date.'
                        );
                      }
                    } else {
                      Alert.alert(
                        'Invalid Date',
                        'Please enter a valid date in YYYY-MM-DD format.'
                      );
                    }
                  }
                }}
              >
                <Text style={styles.inputText}>
                  {form.maturityDate ? new Date(form.maturityDate).toLocaleDateString() : 'Select Date'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Note Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Note</Text>
            <TextInput
              style={styles.textarea}
              placeholder="Optional note"
              multiline
              numberOfLines={4}
              value={form.note}
              onChangeText={(text) => handleChange('note', text)}
            />
          </View>

          {/* Contact Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contact (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Advisor / Broker Contact"
              value={form.contact}
              onChangeText={(text) => handleChange('contact', text)}
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity style={styles.saveButton} onPress={handleSubmit}>
            <Text style={styles.saveButtonText}>Save Investment Details →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <BottomNavBar />
    </>
  );
}

const localStyles = {
  placeholderText: {
    color: '#9ca3af', // Light gray for placeholder
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    width: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  categoryItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  selectedCategory: {
    backgroundColor: '#e0f2fe',
  },
  categoryItemText: {
    fontSize: 16,
  },
  selectedCategoryText: {
    fontWeight: 'bold',
    color: '#0284c7',
  },
  cancelButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#ef4444',
    fontSize: 16,
  },
};