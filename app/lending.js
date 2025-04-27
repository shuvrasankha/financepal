import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Modal, StatusBar, ActivityIndicator, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import styles from '../styles/LendingStyles';
import BottomNavBar from './components/BottomNavBar';
import { db, auth } from '../firebase';
import { collection, addDoc, getDocs, query, where, doc, deleteDoc } from 'firebase/firestore';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import Theme from '../constants/Theme';
import { useActionSheet } from '@expo/react-native-action-sheet';
import ContactSelector from './components/ContactSelector';

function AddLoanForm({ onClose, onAdded, saveLoanToFirestore }) {
  const [loanType, setLoanType] = useState('given');
  const [form, setForm] = useState({
    amount: '',
    lender: '',
    lenderNumber: '', // added for phone number
    description: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default to 30 days from today
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [isSaving, setSaving] = useState(false);
  
  // Get theme colors
  const { isDarkMode } = useTheme();
  const colors = isDarkMode ? Theme.dark.colors : Theme.light.colors;
  const shadows = isDarkMode ? Theme.shadowsDark : Theme.shadows;
  const { showActionSheetWithOptions } = useActionSheet();

  // Handle selected contact from ContactSelector
  const handleContactSelect = (contact) => {
    handleChange('lender', contact.name);
    handleChange('lenderNumber', contact.phoneNumber);
  };

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!form.amount || !form.lender) {
      Alert.alert('Validation Error', 'Amount and Lender are required fields.');
      return;
    }
    
    try {
      setSaving(true);
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
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        });
        onClose();
        // Call onAdded callback to refresh data in the parent component
        if (onAdded) onAdded();
      }
    } catch (error) {
      console.error('Error saving loan:', error);
      Alert.alert('Error', 'Failed to save loan. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Contact selection function
  const selectContact = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === 'granted') {
        let allContacts = [];
        let pageOffset = 0;
        let hasNextPage = true;
        const pageSize = 100;
        while (hasNextPage) {
          const { data, hasNextPage: nextPage } = await Contacts.getContactsAsync({
            fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
            sort: Contacts.SortTypes.FirstName,
            pageSize,
            pageOffset,
          });
          allContacts = allContacts.concat(data);
          hasNextPage = nextPage;
          pageOffset += pageSize;
        }
        const data = allContacts.filter(contact => contact.phoneNumbers && contact.phoneNumbers.length > 0);
        if (data.length > 0) {
          const options = data.map(contact => `${contact.name} (${contact.phoneNumbers[0]?.number || ''})`);
          options.push('Cancel');
          showActionSheetWithOptions(
            {
              options,
              cancelButtonIndex: options.length - 1,
            },
            (buttonIndex) => {
              if (buttonIndex === undefined || buttonIndex === options.length - 1) return;
              const selected = data[buttonIndex];
              handleChange('lender', selected.name);
              handleChange('lenderNumber', selected.phoneNumbers[0]?.number || '');
            }
          );
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
          {/* Place ContactSelector component here */}
          <View style={{ marginLeft: 10 }}>
            <ContactSelector onSelectContact={handleContactSelect} />
          </View>
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
              backgroundColor: isSaving ? colors.medium : colors.primary, 
              padding: 16, 
              borderRadius: 8, 
              alignItems: 'center', 
              flexDirection: 'row', 
              justifyContent: 'center',
              ...shadows.sm
            }} 
            onPress={handleSubmit}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <ActivityIndicator size="small" color={colors.white} style={{ marginRight: 8 }} />
                <Text style={{ color: colors.white, fontWeight: 'bold', fontSize: 18 }}>Saving...</Text>
              </>
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={22} color={colors.white} style={{ marginRight: 8 }} />
                <Text style={{ color: colors.white, fontWeight: 'bold', fontSize: 18 }}>Save</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

// Add this function before the TransactionHistory component
const exportTransactionsAsCSV = async (transactions, contact) => {
  try {
    // Create CSV header
    let csv = "Type,Amount,Date,Due Date,Description,Status\n";
    
    // Add transaction data rows
    transactions.forEach(t => {
      const formattedDate = t.date ? new Date(t.date).toLocaleDateString('en-IN') : 'N/A';
      const formattedDueDate = t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-IN') : 'N/A';
      
      // Format status
      let status = t.status === 'settled' ? 'Settled' : 'Active';
      if (status === 'Active' && new Date(t.dueDate) < new Date()) {
        status = 'Overdue';
      }
      
      // Format description (escape any commas or quotes)
      const description = t.description ? `"${t.description.replace(/"/g, '""')}"` : '';
      
      csv += `${t.loanType},${parseFloat(t.amount).toFixed(2)},${formattedDate},${formattedDueDate},${description},${status}\n`;
    });
    
    // Generate file name based on contact name and current date
    const filename = `${contact.replace(/\s+/g, '_')}_transactions_${new Date().toISOString().split('T')[0]}.csv`;
    
    // Check if we're on web or native
    if (Platform.OS === 'web') {
      // For web, create a download link
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // For native platforms, use Expo FileSystem and Sharing
      const FileSystem = require('expo-file-system');
      const Sharing = require('expo-sharing');
      
      // Create the CSV file in the app's temporary directory
      const fileUri = FileSystem.documentDirectory + filename;
      await FileSystem.writeAsStringAsync(fileUri, csv);
      
      // Share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: `${contact}'s Transactions`,
          UTI: 'public.comma-separated-values-text'
        });
      } else {
        Alert.alert("Sharing not available", "Sharing is not available on your device");
      }
    }
    
    Alert.alert('Success', `Transactions for ${contact} exported successfully!`);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    Alert.alert('Export Failed', 'Failed to export transactions. Please try again.');
  }
};

// Add TransactionHistory component
function TransactionHistory({ contact, transactions, onClose, colors, shadows }) {
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString('en-IN', options);
  };
  
  // Extract isDarkMode from colors
  const isDarkMode = colors.isDarkMode;
  
  // Add a state for tracking deleted items
  const [pendingDeletion, setPendingDeletion] = useState(null);
  
  // Function to handle loan deletion
  const handleDeleteLoan = async (loanId) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'User not authenticated.');
        return;
      }
      
      // Reference to the loan document
      const loanRef = doc(db, 'loans', loanId);
      
      // Delete the document
      await deleteDoc(loanRef);
      
      // Show success message
      Alert.alert('Success', 'Loan deleted successfully');
      
      // Refresh the parent component's data
      // We use a callback approach since we don't have direct access to the loan list
      if (onClose) {
        // Close transaction history modal which will trigger a refresh
        onClose(true);
      }
    } catch (error) {
      console.error('Error deleting loan:', error);
      Alert.alert('Error', 'Failed to delete loan. Please try again.');
    }
  };
  
  // Function to confirm deletion
  const confirmDelete = (id) => {
    setPendingDeletion(null);
    Alert.alert(
      'Delete Loan',
      'Are you sure you want to delete this loan? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDeleteLoan(id)
        }
      ]
    );
  };

  // Sort transactions by date, newest first
  const sortedTransactions = [...transactions].sort((a, b) => {
    return new Date(b.date) - new Date(a.date);
  });
  
  // Calculate the net balance
  const givenAmount = transactions
    .filter(t => t.loanType === 'given')
    .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    
  const takenAmount = transactions
    .filter(t => t.loanType === 'taken')
    .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    
  const netBalance = givenAmount - takenAmount;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      
      {/* Header */}
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: 24,
        paddingTop: 46,
        borderBottomWidth: 1,
        borderBottomColor: isDarkMode ? colors.light : '#e5e7eb',
        backgroundColor: colors.background,
      }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.dark }}>
            Transactions
          </Text>
          <Text style={{ fontSize: 16, color: colors.medium, marginTop: 4 }}>
            {contact}
          </Text>
        </View>
        <View style={{ flexDirection: 'row' }}>
          {/* Export button */}
          <TouchableOpacity
            onPress={() => exportTransactionsAsCSV(transactions, contact)}
            style={{
              padding: 8,
              borderRadius: 8,
              backgroundColor: isDarkMode ? 'rgba(21, 128, 61, 0.2)' : '#dcfce7',
              marginRight: 8
            }}
          >
            <Ionicons name="download-outline" size={24} color={colors.success} />
          </TouchableOpacity>
          
          {/* Close button */}
          <TouchableOpacity
            onPress={() => onClose()}
            style={{
              padding: 8,
              borderRadius: 8,
              backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2'
            }}
          >
            <Ionicons name="close-circle-outline" size={24} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Transaction Summary */}
      <View style={{
        backgroundColor: colors.card,
        margin: 16,
        borderRadius: 12,
        padding: 16,
        borderWidth: isDarkMode ? 1 : 0,
        borderColor: isDarkMode ? colors.light : 'transparent',
        ...shadows.sm
      }}>
        <Text style={{ fontSize: 16, color: colors.medium, marginBottom: 8 }}>
          Total Transactions: <Text style={{ fontWeight: 'bold', color: colors.dark }}>{transactions.length}</Text>
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 14, color: colors.medium }}>
              Given
            </Text>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.success }}>
              ₹{givenAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
          </View>
          <View>
            <Text style={{ fontSize: 14, color: colors.medium }}>
              Taken
            </Text>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.error }}>
              ₹{takenAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
          </View>
          <View>
            <Text style={{ fontSize: 14, color: colors.medium }}>
              Net Balance
            </Text>
            <Text style={{ 
              fontSize: 18, 
              fontWeight: 'bold', 
              color: netBalance > 0 ? colors.success : 
                    netBalance < 0 ? colors.error : colors.medium 
            }}>
              ₹{Math.abs(netBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </View>
      </View>
      
      {/* Transactions List */}
      <FlatList
        data={sortedTransactions}
        keyExtractor={(item, index) => `transaction-${item.id || index}`}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListEmptyComponent={() => (
          <View style={{ padding: 24, alignItems: 'center' }}>
            <Text style={{ color: colors.medium }}>No transactions found</Text>
          </View>
        )}
        renderItem={({ item, index }) => (
          <View style={{ 
            backgroundColor: index % 2 === 0 ? 
              colors.card : 
              isDarkMode ? 'rgba(99, 102, 241, 0.08)' : '#f8fafc',
            padding: 16,
            marginHorizontal: 16,
            marginBottom: 8,
            borderRadius: 12,
            borderWidth: isDarkMode ? 1 : 0,
            borderColor: isDarkMode ? colors.light : 'transparent',
            ...shadows.sm
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons 
                  name={item.loanType === 'given' ? 'arrow-up-circle' : 'arrow-down-circle'} 
                  size={24} 
                  color={item.loanType === 'given' ? colors.success : colors.error} 
                  style={{ marginRight: 8 }} 
                />
                <Text style={{ 
                  fontSize: 18, 
                  fontWeight: 'bold', 
                  color: item.loanType === 'given' ? colors.success : colors.error 
                }}>
                  ₹{parseFloat(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              </View>
              <Text style={{ color: colors.medium, fontSize: 14 }}>
                {formatDate(item.date)}
              </Text>
            </View>
            
            {item.description ? (
              <Text style={{ color: colors.dark, marginBottom: 8 }}>
                {item.description}
              </Text>
            ) : null}
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={{ fontSize: 14, color: colors.medium }}>
                Due: {formatDate(item.dueDate)}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ 
                  fontSize: 14, 
                  fontWeight: 'bold',
                  marginRight: 10,
                  color: new Date(item.dueDate) < new Date() && item.status !== 'settled' 
                    ? colors.error 
                    : colors.medium 
                }}>
                  {item.status === 'settled' ? 'Settled' : 
                    new Date(item.dueDate) < new Date() ? 'Overdue' : 'Active'}
                </Text>
                
                {/* Delete button */}
                <TouchableOpacity 
                  onPress={() => confirmDelete(item.id)}
                  style={{
                    padding: 4,
                    borderRadius: 4,
                    backgroundColor: colors.isDarkMode ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2'
                  }}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      />
    </View>
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
  const [loans, setLoans] = useState([]);
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  
  // Get theme colors
  const { isDarkMode } = useTheme();
  const colors = isDarkMode ? Theme.dark.colors : Theme.light.colors;
  const shadows = isDarkMode ? Theme.shadowsDark : Theme.shadows;
  const { showActionSheetWithOptions } = useActionSheet();

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Contact selection function
  const selectContact = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === 'granted') {
        let allContacts = [];
        let pageOffset = 0;
        let hasNextPage = true;
        const pageSize = 100;
        while (hasNextPage) {
          const { data, hasNextPage: nextPage } = await Contacts.getContactsAsync({
            fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
            sort: Contacts.SortTypes.FirstName,
            pageSize,
            pageOffset,
          });
          allContacts = allContacts.concat(data);
          hasNextPage = nextPage;
          pageOffset += pageSize;
        }
        const data = allContacts.filter(contact => contact.phoneNumbers && contact.phoneNumbers.length > 0);
        if (data.length > 0) {
          const options = data.map(contact => `${contact.name} (${contact.phoneNumbers[0]?.number || ''})`);
          options.push('Cancel');
          showActionSheetWithOptions(
            {
              options,
              cancelButtonIndex: options.length - 1,
            },
            (buttonIndex) => {
              if (buttonIndex === undefined || buttonIndex === options.length - 1) return;
              const selected = data[buttonIndex];
              handleChange('lender', selected.name);
              handleChange('lenderNumber', selected.phoneNumbers[0]?.number || '');
            }
          );
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
      
      // Store loan data with timestamps and status
      await addDoc(collection(db, 'loans'), {
        ...loan,
        amount: thisAmount, // Store the original amount (not negative)
        userId: user.uid,
        createdAt: new Date().toISOString(),
        pendingAmount,
        status: 'active', // Can be used for marking loans as 'settled' later
        lastUpdated: new Date().toISOString()
      });
      
      return true;
    } catch (error) {
      console.error('Error saving loan:', error);
      Alert.alert('Error', 'Failed to save loan details.');
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
      const fetchedLoans = await fetchLoansFromFirestore();
      
      setLoans(fetchedLoans);
      
      // Group by contact, keep the latest (by createdAt) pendingAmount for each contact
      const summary = {};
      fetchedLoans.forEach(loan => {
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

  // Function to refresh loans data
  const refreshLoans = async () => {
    setLoansLoading(true);
    const fetchedLoans = await fetchLoansFromFirestore();
    setLoans(fetchedLoans);
    
    // Update summary data
    const summary = {};
    fetchedLoans.forEach(loan => {
      const contact = loan.contact || 'Unknown';
      const createdAt = loan.createdAt || '';
      if (!summary[contact] || (createdAt > summary[contact].createdAt)) {
        summary[contact] = { pendingAmount: loan.pendingAmount || 0, createdAt };
      }
    });
    
    const flatSummary = {};
    Object.entries(summary).forEach(([contact, val]) => {
      flatSummary[contact] = val.pendingAmount;
    });
    
    setLoanSummary(flatSummary);
    setLoansLoading(false);
  };

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
        contentContainerStyle={{ paddingBottom: 120 }}
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
          borderRadius: 18,
          padding: 24,
          marginBottom: 24,
          marginHorizontal: 4
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ fontSize: 16, color: colors.medium, marginBottom: 8 }}>
                Total Pending Amount
              </Text>
              <Text style={{ 
                fontSize: 32, 
                fontWeight: 'bold', 
                color: colors.primary,
                letterSpacing: 0.5 
              }}>
                ₹{Object.values(loanSummary).reduce((sum, amt) => sum + (amt || 0), 0).toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: isDarkMode ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.1)',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <Ionicons 
                name="wallet-outline" 
                size={28} 
                color={colors.primary} 
              />
            </View>
          </View>
          
          {/* Add a summary line */}
          <View style={{ 
            flexDirection: 'row', 
            marginTop: 16, 
            paddingTop: 16,
            borderTopWidth: 1,
            borderTopColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#e5e7eb'
          }}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="arrow-up-circle" size={18} color={colors.success} style={{ marginRight: 6 }} />
              <Text style={{ color: colors.medium, fontSize: 14 }}>
                Given: <Text style={{ fontWeight: 'bold', color: colors.success }}>
                  ₹{Object.values(loanSummary)
                    .filter(amt => amt > 0)
                    .reduce((sum, amt) => sum + amt, 0)
                    .toLocaleString('en-IN')}
                </Text>
              </Text>
            </View>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="arrow-down-circle" size={18} color={colors.error} style={{ marginRight: 6 }} />
              <Text style={{ color: colors.medium, fontSize: 14 }}>
                Taken: <Text style={{ fontWeight: 'bold', color: colors.error }}>
                  ₹{Math.abs(Object.values(loanSummary)
                    .filter(amt => amt < 0)
                    .reduce((sum, amt) => sum + Math.abs(amt), 0))
                    .toLocaleString('en-IN')}
                </Text>
              </Text>
            </View>
          </View>
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
            borderWidth: isDarkMode ? 1 : 0,
            borderColor: isDarkMode ? colors.light : 'transparent',
            ...shadows.md
          }
        ]}> 
          <View style={{ 
            backgroundColor: isDarkMode ? colors.lighter : colors.card, 
            paddingVertical: 18, 
            paddingHorizontal: 20, 
            borderTopLeftRadius: 18, 
            borderTopRightRadius: 18,
            borderBottomWidth: 1,
            borderBottomColor: isDarkMode ? colors.light : '#e5e7eb'
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
                backgroundColor: isDarkMode ? 'rgba(99, 102, 241, 0.1)' : '#f3f4f6', 
                paddingVertical: 14, 
                paddingHorizontal: 18,
                borderBottomWidth: 1, 
                borderBottomColor: isDarkMode ? colors.light : '#e5e7eb' 
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
                <TouchableOpacity 
                  key={contact + idx} 
                  style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    borderBottomWidth: 1, 
                    borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f3f4f6', 
                    backgroundColor: idx % 2 === 0 
                      ? colors.card 
                      : isDarkMode ? 'rgba(99, 102, 241, 0.08)' : '#f8faff', 
                    paddingVertical: 16, 
                    paddingHorizontal: 18 
                  }}
                  onPress={() => {
                    setSelectedContact(contact);
                    setShowTransactionHistory(true);
                  }}
                >
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
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
      
      {/* Add Loan Modal */}
      <Modal visible={showAddModal} animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <AddLoanForm 
          onClose={() => setShowAddModal(false)} 
          onAdded={refreshLoans} 
          saveLoanToFirestore={saveLoanToFirestore} 
        />
      </Modal>
      
      {/* Transaction History Modal */}
      <Modal visible={showTransactionHistory} animationType="slide" onRequestClose={() => setShowTransactionHistory(false)}>
        <TransactionHistory 
          contact={selectedContact} 
          transactions={loans.filter(loan => loan.contact === selectedContact)} 
          onClose={(refreshNeeded = false) => {
            setShowTransactionHistory(false);
            if (refreshNeeded) {
              // Refresh the loans data when a transaction is deleted
              refreshLoans();
            }
          }} 
          colors={{ ...colors, isDarkMode }}
          shadows={shadows} 
        />
      </Modal>
      
      <BottomNavBar />
    </>
  );
}