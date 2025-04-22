import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Modal, StatusBar } from 'react-native';
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
import { useTheme } from '../contexts/ThemeContext';
import Theme from '../constants/Theme';

function AddLoanForm({ onClose, onAdded }) {
  const [loanType, setLoanType] = useState('given');
  const [form, setForm] = useState({
    amount: '',
    lender: '',
    lenderNumber: '', // added for phone number
    description: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  
  // Get theme colors
  const { isDarkMode } = useTheme();
  const colors = isDarkMode ? Theme.dark.colors : Theme.light.colors;
  const shadows = isDarkMode ? Theme.shadowsDark : Theme.shadows;

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
        lenderNumber: '',
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
          const contactOptions = data
            .filter(contact => contact.phoneNumbers && contact.phoneNumbers.length > 0)
            .map(contact => {
              const number = contact.phoneNumbers[0]?.number || '';
              return {
                text: `${contact.name} (${number})`,
                onPress: () => {
                  handleChange('lender', contact.name);
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
    <ScrollView 
      style={{ 
        flex: 1, 
        backgroundColor: colors.background
      }}
    >
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      <View style={{ flex: 1, backgroundColor: colors.background, padding: 24 }}>
        {/* Header with Title and Close Button */}
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: 24,
          marginTop: 46
        }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.dark }}>Add Loan</Text>
          <TouchableOpacity
            onPress={onClose}
            style={{
              padding: 8,
              borderRadius: 8,
              backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2'
            }}
          >
            <Ionicons name="close-circle-outline" size={24} color={colors.error} />
          </TouchableOpacity>
        </View>

        {/* Loan Type Selector */}
        <Text style={{ marginBottom: 8, fontSize: 18, color: colors.dark }}>Loan Type</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 20, gap: 12 }}>
          <TouchableOpacity
            style={{ 
              flex: 1, 
              borderRadius: 8, 
              backgroundColor: loanType === 'given' ? colors.primary : isDarkMode ? colors.lighter : '#F3F4F6', 
              alignItems: 'center', 
              padding: 12, 
              flexDirection: 'row', 
              justifyContent: 'center' 
            }}
            onPress={() => setLoanType('given')}
            activeOpacity={0.85}
          >
            <Ionicons 
              name="arrow-up-circle" 
              size={22} 
              color={loanType === 'given' ? colors.white : colors.primary} 
              style={{ marginRight: 8 }} 
            />
            <Text style={{ 
              color: loanType === 'given' ? colors.white : colors.primary, 
              fontWeight: '700', 
              fontSize: 16 
            }}>Money Given</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ 
              flex: 1, 
              borderRadius: 8, 
              backgroundColor: loanType === 'taken' ? colors.error : isDarkMode ? colors.lighter : '#F3F4F6', 
              alignItems: 'center', 
              padding: 12, 
              flexDirection: 'row', 
              justifyContent: 'center' 
            }}
            onPress={() => setLoanType('taken')}
            activeOpacity={0.85}
          >
            <Ionicons 
              name="arrow-down-circle" 
              size={22} 
              color={loanType === 'taken' ? colors.white : colors.error} 
              style={{ marginRight: 8 }} 
            />
            <Text style={{ 
              color: loanType === 'taken' ? colors.white : colors.error, 
              fontWeight: '700', 
              fontSize: 16 
            }}>Money Taken</Text>
          </TouchableOpacity>
        </View>

        {/* Amount Field */}
        <Text style={{ marginBottom: 8, fontSize: 18, color: colors.dark }}>Amount (₹)</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
          <TextInput
            style={{ 
              borderWidth: 1, 
              borderColor: isDarkMode ? colors.light : '#e5e7eb', 
              borderRadius: 8,
              padding: 10, 
              flex: 1, 
              fontSize: 18,
              color: colors.dark,
              backgroundColor: colors.card
            }}
            keyboardType="numeric"
            value={form.amount}
            onChangeText={(text) => handleChange('amount', text.replace(/[^0-9.]/g, ''))}
            placeholder="₹5000"
            placeholderTextColor={isDarkMode ? colors.medium : "#aaa"}
          />
        </View>

        {/* Lender Field */}
        <Text style={{ marginBottom: 8, fontSize: 18, color: colors.dark }}>Lender</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
          <TextInput
            style={{ 
              flex: 1, 
              borderWidth: 1, 
              borderColor: isDarkMode ? colors.light : '#e5e7eb', 
              borderRadius: 8, 
              padding: 10, 
              fontSize: 18,
              color: colors.dark,
              backgroundColor: colors.card
            }}
            placeholder="Enter lender's name"
            value={form.lender}
            onChangeText={(text) => handleChange('lender', text)}
            placeholderTextColor={isDarkMode ? colors.medium : "#aaa"}
          />
          <TouchableOpacity onPress={selectContact} style={{ marginLeft: 10, padding: 8 }}>
            <Ionicons name="person-circle-outline" size={28} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Phone Number Field */}
        <Text style={{ marginBottom: 8, fontSize: 18, color: colors.dark }}>Phone Number</Text>
        <TextInput
          style={{ 
            borderWidth: 1, 
            borderColor: isDarkMode ? colors.light : '#e5e7eb', 
            borderRadius: 8, 
            padding: 10, 
            fontSize: 18, 
            marginBottom: 20,
            color: colors.dark,
            backgroundColor: colors.card
          }}
          placeholder="Phone number (auto-filled if contact selected)"
          value={form.lenderNumber}
          onChangeText={(text) => handleChange('lenderNumber', text)}
          placeholderTextColor={isDarkMode ? colors.medium : "#aaa"}
          keyboardType="phone-pad"
        />

        {/* Description Field */}
        <Text style={{ marginBottom: 8, fontSize: 18, color: colors.dark }}>Description (Optional)</Text>
        <TextInput
          style={{ 
            borderWidth: 1, 
            borderColor: isDarkMode ? colors.light : '#e5e7eb', 
            borderRadius: 8, 
            padding: 10, 
            fontSize: 18, 
            marginBottom: 20,
            color: colors.dark,
            backgroundColor: colors.card
          }}
          placeholder="Any note about this loan"
          multiline
          value={form.description}
          onChangeText={(text) => handleChange('description', text)}
          placeholderTextColor={isDarkMode ? colors.medium : "#aaa"}
        />

        {/* Transaction Date Field */}
        <Text style={{ marginBottom: 8, fontSize: 18, color: colors.dark }}>Transaction Date</Text>
        <TouchableOpacity
          style={{ 
            borderWidth: 1, 
            borderColor: isDarkMode ? colors.light : '#e5e7eb', 
            borderRadius: 8, 
            padding: 14, 
            marginBottom: 20,
            backgroundColor: colors.card
          }}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={{ color: colors.dark, fontSize: 18 }}>{form.date}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={form.date ? new Date(form.date) : new Date()}
            mode="date"
            display="default"
            maximumDate={new Date()}
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                handleChange('date', selectedDate.toISOString().split('T')[0]);
              }
            }}
          />
        )}

        {/* Due Date Field */}
        <Text style={{ marginBottom: 8, fontSize: 18, color: colors.dark }}>Due Date</Text>
        <TouchableOpacity
          style={{ 
            borderWidth: 1, 
            borderColor: isDarkMode ? colors.light : '#e5e7eb', 
            borderRadius: 8, 
            padding: 14, 
            marginBottom: 28,
            backgroundColor: colors.card
          }}
          onPress={() => setShowDueDatePicker(true)}
        >
          <Text style={{ color: colors.dark, fontSize: 18 }}>{form.dueDate}</Text>
        </TouchableOpacity>
        {showDueDatePicker && (
          <DateTimePicker
            value={form.dueDate ? new Date(form.dueDate) : new Date()}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDueDatePicker(false);
              if (selectedDate) {
                handleChange('dueDate', selectedDate.toISOString().split('T')[0]);
              }
            }}
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
              justifyContent: 'center',
              ...shadows.sm
            }} 
            onPress={handleSubmit}
          >
            <Ionicons name="checkmark-circle-outline" size={22} color={colors.white} style={{ marginRight: 8 }} />
            <Text style={{ color: colors.white, fontWeight: 'bold', fontSize: 18 }}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

export default function Lending() {
  const [loanType, setLoanType] = useState('given'); // 'given' or 'taken'
  const [form, setForm] = useState({
    amount: '',
    lender: '',
    lenderNumber: '', // added for phone number
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
  
  // Get theme colors
  const { isDarkMode } = useTheme();
  const colors = isDarkMode ? Theme.dark.colors : Theme.light.colors;
  const shadows = isDarkMode ? Theme.shadowsDark : Theme.shadows;

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
          const contactOptions = data
            .filter(contact => contact.phoneNumbers && contact.phoneNumbers.length > 0)
            .map(contact => {
              const number = contact.phoneNumbers[0]?.number || '';
              return {
                text: `${contact.name} (${number})`,
                onPress: () => {
                  handleChange('lender', contact.name);
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
        lenderNumber: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date().toISOString().split('T')[0],
      });
    }
  };

  return (
    <>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      <ScrollView 
        style={[styles.container, { backgroundColor: colors.background }]} 
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: 12,
          paddingTop: 46
        }}>
          <Text style={[styles.title, { color: colors.dark, letterSpacing: 0.5 }]}>
            Lending
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
              marginRight: 20,
              ...shadows.sm,
            }}
            onPress={() => setShowAddModal(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>
        
        {/* Total Pending Amount Card */}
        <View style={{
          backgroundColor: colors.card,
          borderRadius: 14,
          padding: 20,
          marginBottom: 18,
          alignItems: 'center',
          ...shadows.sm
        }}>
          <Text style={{ fontSize: 16, color: colors.medium, marginBottom: 6 }}>
            Total Pending Amount
          </Text>
          <Text style={{ fontSize: 28, fontWeight: 'bold', color: colors.primary }}>
            ₹{Object.values(loanSummary).reduce((sum, amt) => sum + (amt || 0), 0).toLocaleString('en-IN')}
          </Text>
        </View>
        
        {/* Loan summary section */}
        <View style={[
          styles.card, 
          { 
            marginBottom: 24, 
            padding: 0, 
            overflow: 'hidden', 
            borderRadius: 18, 
            backgroundColor: colors.card,
            ...shadows.md
          }
        ]}> 
          <View style={{ 
            backgroundColor: colors.card, 
            paddingVertical: 18, 
            paddingHorizontal: 20, 
            borderTopLeftRadius: 18, 
            borderTopRightRadius: 18,
            borderBottomWidth: 1,
            borderBottomColor: isDarkMode ? colors.lighter : '#e5e7eb'
          }}>
            <Text style={{ 
              color: colors.dark, 
              fontSize: 22, 
              fontWeight: 'bold', 
              letterSpacing: 0.5 
            }}>
              Loan Summary
            </Text>
          </View>
          
          {loansLoading ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={{ color: colors.primary, fontWeight: '600' }}>
                Loading...
              </Text>
            </View>
          ) : Object.keys(loanSummary).length === 0 ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={{ color: colors.medium }}>
                No loans found.
              </Text>
            </View>
          ) : (
            <View style={{ paddingHorizontal: 0, paddingBottom: 8 }}>
              {/* Table Header */}
              <View style={{ 
                flexDirection: 'row', 
                backgroundColor: isDarkMode ? colors.lighter : '#f3f4f6', 
                paddingVertical: 14, 
                paddingHorizontal: 18,
                borderBottomWidth: 1, 
                borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#e5e7eb' 
              }}>
                <Text style={{ 
                  flex: 2, 
                  fontWeight: '700', 
                  color: colors.primary, 
                  fontSize: 16, 
                  letterSpacing: 0.2 
                }}>
                  Contact
                </Text>
                <Text style={{ 
                  flex: 1, 
                  fontWeight: '700', 
                  color: colors.primary, 
                  fontSize: 16, 
                  textAlign: 'right', 
                  letterSpacing: 0.2 
                }}>
                  Pending
                </Text>
              </View>
              
              {/* Table Rows */}
              {Object.entries(loanSummary).map(([contact, pending], idx) => (
                <View key={contact + idx} style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  borderBottomWidth: 1, 
                  borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f3f4f6', 
                  backgroundColor: idx % 2 === 0 
                    ? colors.card 
                    : isDarkMode ? 'rgba(99, 102, 241, 0.08)' : '#f8faff', 
                  paddingVertical: 16, 
                  paddingHorizontal: 18 
                }}>
                  <Ionicons 
                    name="person-circle" 
                    size={28} 
                    color={colors.primary} 
                    style={{ marginRight: 10 }} 
                  />
                  <Text style={{ 
                    flex: 2, 
                    color: colors.dark, 
                    fontWeight: '600', 
                    fontSize: 15 
                  }}>
                    {contact}
                  </Text>
                  <Text style={{ 
                    flex: 1, 
                    color: pending === 0 
                      ? colors.medium 
                      : (pending > 0 ? colors.success : colors.error), 
                    fontWeight: '700', 
                    fontSize: 16, 
                    textAlign: 'right' 
                  }}>
                    ₹{pending.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
        
        {/* Line Graph: Pending Amount per Month */}
        <Text style={{ 
          fontSize: 18, 
          fontWeight: '600', 
          marginBottom: 10, 
          color: colors.dark 
        }}>
          Pending Amount (Last 12 Months)
        </Text>
        
        <LineChart
          data={{
            labels: months.map(m => m.label),
            datasets: [
              {
                data: [0, ...monthlyPendingData],
                color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
                strokeWidth: 2,
              },
            ],
          }}
          width={Dimensions.get('window').width - 40}
          height={200}
          yAxisLabel="₹"
          chartConfig={{
            backgroundColor: colors.card,
            backgroundGradientFrom: colors.card,
            backgroundGradientTo: colors.card,
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(${isDarkMode ? '255, 255, 255' : '31, 41, 55'}, ${opacity})`,
            style: { borderRadius: 16 },
            propsForDots: {
              r: '5',
              strokeWidth: '2',
              stroke: colors.primary,
            },
          }}
          bezier
          style={{ 
            marginVertical: 12, 
            borderRadius: 12,
            ...shadows.sm
          }}
        />
      </ScrollView>
      
      {/* Add Loan Modal */}
      <Modal visible={showAddModal} animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <AddLoanForm onClose={() => setShowAddModal(false)} onAdded={fetchLoansFromFirestore} />
      </Modal>
      <BottomNavBar />
    </>
  );
}