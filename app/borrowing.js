import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Alert, 
  Platform, 
  ActivityIndicator, 
  FlatList,
  SafeAreaView,
  Animated,
  Dimensions,
  StatusBar,
  KeyboardAvoidingView,
  Modal
} from 'react-native';
import { Ionicons, FontAwesome5, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Contacts from 'expo-contacts';
import BottomNavBar from './components/BottomNavBar';
import { useTheme } from '../contexts/ThemeContext';
import Theme from '../constants/Theme';
import { db, auth } from '../firebase';
import { 
  collection, 
  getDocs, 
  query, 
  addDoc, 
  onSnapshot, 
  doc, 
  deleteDoc, 
  updateDoc, 
  where,
  serverTimestamp
} from 'firebase/firestore';
import { useActionSheet } from '@expo/react-native-action-sheet';

// Create a standalone borrowing form component
function AddBorrowingForm({ onClose, editingData = null }) {
  const { isDarkMode } = useTheme();
  const colors = isDarkMode ? Theme.dark.colors : Theme.light.colors;
  const shadows = isDarkMode ? Theme.shadowsDark : Theme.shadows;
  
  const [form, setForm] = useState({
    amount: editingData ? editingData.amount.toString() : '',
    lenderName: editingData ? editingData.lenderName : '',
    lenderNumber: editingData ? editingData.lenderNumber || '' : '',
    dateBorrowed: editingData ? editingData.dateBorrowed : new Date().toISOString().split('T')[0],
    dueDate: editingData ? editingData.dueDate || '' : '',
    note: editingData ? editingData.note || '' : '',
    repayment: editingData ? (editingData.repayment ? editingData.repayment.toString() : '') : '',
    repaymentDate: editingData ? editingData.repaymentDate || '' : '',
  });
  
  const [errors, setErrors] = useState({});
  const [showDateBorrowed, setShowDateBorrowed] = useState(false);
  const [showDueDate, setShowDueDate] = useState(false);
  const [showRepaymentDate, setShowRepaymentDate] = useState(false);
  
  const { showActionSheetWithOptions } = useActionSheet();
  
  // Update form field handler
  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
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
              handleChange('lenderName', selected.name);
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
  
  // Form validation
  const validate = () => {
    let newErrors = {};
    if (!form.amount || isNaN(parseFloat(form.amount)) || parseFloat(form.amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount';
    }
    if (!form.lenderName || form.lenderName.trim() === '') {
      newErrors.lenderName = 'Please enter the lender name';
    }
    if (!form.dateBorrowed) {
      newErrors.dateBorrowed = 'Please select the date borrowed';
    }
    if (form.repayment && (isNaN(parseFloat(form.repayment)) || parseFloat(form.repayment) < 0)) {
      newErrors.repayment = 'Please enter a valid repayment amount';
    }
    if (form.repayment && !form.repaymentDate) {
      newErrors.repaymentDate = 'Please select the repayment date';
    }
    return newErrors;
  };
  
  // Save borrowing to Firestore
  const onSave = async () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }
    
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Prepare data with correct types
      const dataToSave = {
        amount: parseFloat(form.amount),
        lenderName: form.lenderName,
        lenderNumber: form.lenderNumber,
        dateBorrowed: form.dateBorrowed,
        dueDate: form.dueDate,
        note: form.note,
        repayment: form.repayment ? parseFloat(form.repayment) : null,
        repaymentDate: form.repaymentDate,
        userId: user.uid,
        timestamp: serverTimestamp()
      };

      // If editingData exists, update the record instead of creating a new one
      if (editingData) {
        dataToSave.updatedAt = new Date().toISOString();
        await updateDoc(doc(db, 'borrowings', editingData.id), dataToSave);
        Alert.alert('Success', 'Borrowing details updated successfully!');
      } else {
        dataToSave.createdAt = new Date().toISOString();
        await addDoc(collection(db, 'borrowings'), dataToSave);
        Alert.alert('Success', 'Borrowing details saved successfully!');
      }

      // Close form and reset
      onClose();
    } catch (error) {
      console.error('Error saving borrowing:', error);
      Alert.alert('Error', 'Failed to save borrowing.');
    }
  };
  
  return (
    <ScrollView 
      style={{ 
        flex: 1, 
        backgroundColor: colors.background
      }}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      <View style={{ flex: 1, backgroundColor: colors.background, padding: 24 }}>
        {/* Header with Title and Close Button */}
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: 24,
          marginTop: Platform.OS === 'ios' ? 46 : 100 // Same padding for both platforms for consistency
        }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.dark }}>
            {editingData ? 'Edit Borrowing' : 'Add Borrowing'}
          </Text>
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
        
        {/* Borrowing Section */}
        <View style={{
          backgroundColor: colors.card,
          borderRadius: 12,
          padding: 20,
          marginBottom: 24,
          ...shadows.sm
        }}>
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            marginBottom: 20
          }}>

            <Text style={{ 
              fontSize: 20, 
              fontWeight: '700', 
              color: colors.dark
            }}>
              Borrowing Details
            </Text>
          </View>
          
          {/* Amount Field */}
          <Text style={{ marginBottom: 8, fontSize: 18, color: colors.dark }}>Amount (₹)*</Text>
          <View style={{ marginBottom: 20 }}>
            <TextInput
              style={{ 
                borderWidth: 1, 
                borderColor: errors.amount ? colors.error : (isDarkMode ? colors.light : '#e5e7eb'), 
                borderRadius: 8,
                padding: 14, 
                fontSize: 18,
                color: colors.dark,
                backgroundColor: isDarkMode ? colors.lighter : colors.card
              }}
              keyboardType="numeric"
              value={form.amount}
              onChangeText={(text) => handleChange('amount', text.replace(/[^0-9.]/g, ''))}
              placeholder="Enter amount"
              placeholderTextColor={isDarkMode ? colors.medium : "#aaa"}
            />
            {errors.amount && (
              <Text style={{ color: colors.error, fontSize: 14, marginTop: 6 }}>
                {errors.amount}
              </Text>
            )}
          </View>
          
          {/* Lender Name Field */}
          <Text style={{ marginBottom: 8, fontSize: 18, color: colors.dark }}>Lender's Name*</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
            <View style={{ flex: 1 }}>
              <TextInput
                style={{ 
                  borderWidth: 1, 
                  borderColor: errors.lenderName ? colors.error : (isDarkMode ? colors.light : '#e5e7eb'), 
                  borderRadius: 8, 
                  padding: 14, 
                  fontSize: 18,
                  color: colors.dark,
                  backgroundColor: isDarkMode ? colors.lighter : colors.card
                }}
                placeholder="Enter lender's name"
                value={form.lenderName}
                onChangeText={(text) => handleChange('lenderName', text)}
                placeholderTextColor={isDarkMode ? colors.medium : "#aaa"}
              />
              {errors.lenderName && (
                <Text style={{ color: colors.error, fontSize: 14, marginTop: 6 }}>
                  {errors.lenderName}
                </Text>
              )}
            </View>
            <TouchableOpacity 
              onPress={() => selectContact()} 
              style={{ 
                marginLeft: 10, 
                padding: 12,
                backgroundColor: colors.primary,
                borderRadius: 8,
                ...shadows.sm
              }}
            >
              <Ionicons name="people" size={24} color={colors.white} />
            </TouchableOpacity>
          </View>
          
          {/* Lender Number Field */}
          <Text style={{ marginBottom: 8, fontSize: 18, color: colors.dark }}>Lender's Phone (Optional)</Text>
          <TextInput
            style={{ 
              borderWidth: 1, 
              borderColor: isDarkMode ? colors.light : '#e5e7eb', 
              borderRadius: 8, 
              padding: 14, 
              fontSize: 18, 
              marginBottom: 20,
              color: colors.dark,
              backgroundColor: isDarkMode ? colors.lighter : colors.card
            }}
            placeholder="Phone number"
            value={form.lenderNumber}
            onChangeText={(text) => handleChange('lenderNumber', text)}
            placeholderTextColor={isDarkMode ? colors.medium : "#aaa"}
            keyboardType="phone-pad"
          />
          
          {/* Transaction Date Field */}
          <Text style={{ marginBottom: 8, fontSize: 18, color: colors.dark }}>Date Borrowed*</Text>
          <TouchableOpacity
            style={{ 
              borderWidth: 1, 
              borderColor: errors.dateBorrowed ? colors.error : (isDarkMode ? colors.light : '#e5e7eb'), 
              borderRadius: 8, 
              padding: 14, 
              marginBottom: errors.dateBorrowed ? 6 : 20,
              backgroundColor: isDarkMode ? colors.lighter : colors.card
            }}
            onPress={() => setShowDateBorrowed(true)}
          >
            <Text style={{ color: colors.dark, fontSize: 18 }}>{formatDate(form.dateBorrowed)}</Text>
          </TouchableOpacity>
          {errors.dateBorrowed && (
            <Text style={{ color: colors.error, fontSize: 14, marginBottom: 20 }}>
              {errors.dateBorrowed}
            </Text>
          )}
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
              themeVariant={isDarkMode ? 'dark' : 'light'}
            />
          )}
          
          {/* Due Date Field */}
          <Text style={{ marginBottom: 8, fontSize: 18, color: colors.dark }}>Due Date (Optional)</Text>
          <TouchableOpacity
            style={{ 
              borderWidth: 1, 
              borderColor: isDarkMode ? colors.light : '#e5e7eb', 
              borderRadius: 8, 
              padding: 14, 
              marginBottom: 20,
              backgroundColor: isDarkMode ? colors.lighter : colors.card
            }}
            onPress={() => setShowDueDate(true)}
          >
            <Text style={{ 
              color: form.dueDate ? colors.dark : isDarkMode ? colors.medium : "#aaa", 
              fontSize: 18 
            }}>
              {form.dueDate ? formatDate(form.dueDate) : 'Select due date (optional)'}
            </Text>
          </TouchableOpacity>
          {showDueDate && (
            <DateTimePicker
              value={form.dueDate ? new Date(form.dueDate) : new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              minimumDate={new Date(form.dateBorrowed)}
              onChange={(event, selectedDate) => {
                setShowDueDate(false);
                if (selectedDate) {
                  handleChange('dueDate', selectedDate.toISOString().split('T')[0]);
                }
              }}
              themeVariant={isDarkMode ? 'dark' : 'light'}
            />
          )}
          
          {/* Note Field */}
          <Text style={{ marginBottom: 8, fontSize: 18, color: colors.dark }}>Note (Optional)</Text>
          <TextInput
            style={{ 
              borderWidth: 1, 
              borderColor: isDarkMode ? colors.light : '#e5e7eb', 
              borderRadius: 8, 
              padding: 14, 
              fontSize: 18, 
              marginBottom: 10,
              color: colors.dark,
              backgroundColor: isDarkMode ? colors.lighter : colors.card,
              textAlignVertical: 'top',
              minHeight: 100
            }}
            placeholder="Add notes about this borrowing"
            multiline
            value={form.note}
            onChangeText={(text) => handleChange('note', text)}
            placeholderTextColor={isDarkMode ? colors.medium : "#aaa"}
          />
        </View>
        
        {/* Repayment Section */}
        
        {/* Action Buttons */}
        <View style={{ flexDirection: 'column', marginTop: 8, marginBottom: 40 }}>
          <TouchableOpacity 
            style={{ 
              backgroundColor: colors.primary, 
              padding: 16, 
              borderRadius: 8, 
              alignItems: 'center', 
              flexDirection: 'row', 
              justifyContent: 'center',
              marginBottom: 16,
              ...shadows.sm
            }} 
            onPress={onSave}
          >
            <Ionicons 
              name={editingData ? "save-outline" : "checkmark-circle-outline"} 
              size={22} 
              color={colors.white} 
              style={{ marginRight: 8 }} 
            />
            <Text style={{ color: colors.white, fontWeight: 'bold', fontSize: 18 }}>
              {editingData ? 'Update' : 'Save'}
            </Text>
          </TouchableOpacity>
          
        </View>
      </View>
    </ScrollView>
  );
}

// Add RepaymentForm component to handle just the repayment portion
function RepaymentForm({ borrowing, onClose, onSuccess }) {
  const { isDarkMode } = useTheme();
  const colors = isDarkMode ? Theme.dark.colors : Theme.light.colors;
  const shadows = isDarkMode ? Theme.shadowsDark : Theme.shadows;
  
  const [form, setForm] = useState({
    repayment: borrowing.repayment ? borrowing.repayment.toString() : '',
    repaymentDate: borrowing.repaymentDate || new Date().toISOString().split('T')[0],
  });
  
  const [errors, setErrors] = useState({});
  const [showRepaymentDate, setShowRepaymentDate] = useState(false);
  
  // Update form field handler
  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };
  
  // Form validation
  const validate = () => {
    let newErrors = {};
    if (!form.repayment || isNaN(parseFloat(form.repayment)) || parseFloat(form.repayment) <= 0) {
      newErrors.repayment = 'Please enter a valid repayment amount';
    }
    if (!form.repaymentDate) {
      newErrors.repaymentDate = 'Please select the repayment date';
    }
    return newErrors;
  };
  
  // Save repayment to Firestore
  const onSave = async () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }
    
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Update only the repayment fields in the borrowing record
      await updateDoc(doc(db, 'borrowings', borrowing.id), {
        repayment: parseFloat(form.repayment),
        repaymentDate: form.repaymentDate,
        updatedAt: new Date().toISOString()
      });
      
      Alert.alert('Success', 'Repayment recorded successfully!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Error recording repayment:', error);
      Alert.alert('Error', 'Failed to record repayment.');
    }
  };
  
  return (
    <ScrollView 
      style={{ 
        flex: 1, 
        backgroundColor: colors.background
      }}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      <View style={{ flex: 1, backgroundColor: colors.background, padding: 24 }}>
        {/* Header with Title and Close Button */}
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: 24,
          marginTop: Platform.OS === 'android' ? 46 : 46 // Same padding for both platforms for consistency
        }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.dark }}>Record Repayment</Text>
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
        
        {/* Borrowing Summary */}
        <View style={{
          backgroundColor: colors.card,
          borderRadius: 12,
          padding: 20,
          marginBottom: 24,
          ...shadows.sm
        }}>
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            marginBottom: 20
          }}>
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: isDarkMode ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12
            }}>
              <FontAwesome5 name="info-circle" size={18} color={colors.primary} />
            </View>
            <Text style={{ 
              fontSize: 20, 
              fontWeight: '700', 
              color: colors.dark
            }}>
              Borrowing Summary
            </Text>
          </View>
          
          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'space-between',
            marginBottom: 12,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
          }}>
            <Text style={{ fontSize: 16, color: colors.medium }}>Amount Borrowed:</Text>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.dark }}>
              ₹{parseFloat(borrowing.amount).toLocaleString('en-IN')}
            </Text>
          </View>
          
          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'space-between',
            marginBottom: 12,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
          }}>
            <Text style={{ fontSize: 16, color: colors.medium }}>Lender:</Text>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.dark }}>
              {borrowing.lenderName}
            </Text>
          </View>
          
          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'space-between',
            marginBottom: borrowing.dueDate ? 12 : 0,
            paddingBottom: borrowing.dueDate ? 12 : 0,
            borderBottomWidth: borrowing.dueDate ? 1 : 0,
            borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
          }}>
            <Text style={{ fontSize: 16, color: colors.medium }}>Date Borrowed:</Text>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.dark }}>
              {formatDate(borrowing.dateBorrowed)}
            </Text>
          </View>
          
          {borrowing.dueDate && (
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between'
            }}>
              <Text style={{ fontSize: 16, color: colors.medium }}>Due Date:</Text>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.dark }}>
                {formatDate(borrowing.dueDate)}
              </Text>
            </View>
          )}
          
          {borrowing.repayment > 0 && (
            <View style={{ 
              backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)',
              borderRadius: 8,
              padding: 12,
              marginTop: 16,
              flexDirection: 'row',
              alignItems: 'center'
            }}>
              <Ionicons name="information-circle" size={20} color={colors.success} style={{ marginRight: 8 }} />
              <Text style={{ color: colors.success, flex: 1 }}>
                You've already repaid ₹{parseFloat(borrowing.repayment).toLocaleString('en-IN')}
                {borrowing.repaymentDate ? ` on ${formatDate(borrowing.repaymentDate)}` : ''}
              </Text>
            </View>
          )}
        </View>
        
        {/* Repayment Details */}
        <View style={{ 
          backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.05)',
          borderRadius: 12,
          padding: 20,
          marginBottom: 24,
          borderWidth: 1,
          borderColor: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)',
          ...shadows.sm
        }}>
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            marginBottom: 20 
          }}>
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12
            }}>
              <Ionicons name="checkmark-circle" size={22} color={colors.success} />
            </View>
            <Text style={{ 
              fontSize: 20, 
              fontWeight: '700', 
              color: colors.dark
            }}>
              Repayment Details
            </Text>
          </View>
          
          {/* Repayment Amount Field */}
          <Text style={{ marginBottom: 8, fontSize: 18, color: colors.dark }}>Repayment Amount*</Text>
          <View style={{ marginBottom: 20 }}>
            <TextInput
              style={{ 
                borderWidth: 1, 
                borderColor: errors.repayment ? colors.error : (isDarkMode ? colors.light : '#e5e7eb'), 
                borderRadius: 8,
                padding: 14, 
                fontSize: 18,
                color: colors.dark,
                backgroundColor: isDarkMode ? colors.lighter : 'rgba(255, 255, 255, 0.8)'
              }}
              keyboardType="numeric"
              value={form.repayment}
              onChangeText={(text) => handleChange('repayment', text.replace(/[^0-9.]/g, ''))}
              placeholder="Enter amount repaid"
              placeholderTextColor={isDarkMode ? colors.medium : "#aaa"}
            />
            {errors.repayment && (
              <Text style={{ color: colors.error, fontSize: 14, marginTop: 6 }}>
                {errors.repayment}
              </Text>
            )}
          </View>
          
          {/* Repayment Date Field */}
          <Text style={{ marginBottom: 8, fontSize: 18, color: colors.dark }}>Repayment Date*</Text>
          <TouchableOpacity
            style={{ 
              borderWidth: 1, 
              borderColor: errors.repaymentDate ? colors.error : (isDarkMode ? colors.light : '#e5e7eb'), 
              borderRadius: 8, 
              padding: 14, 
              marginBottom: errors.repaymentDate ? 6 : 0,
              backgroundColor: isDarkMode ? colors.lighter : 'rgba(255, 255, 255, 0.8)'
            }}
            onPress={() => setShowRepaymentDate(true)}
          >
            <Text style={{ 
              color: form.repaymentDate ? colors.dark : isDarkMode ? colors.medium : "#aaa", 
              fontSize: 18 
            }}>
              {form.repaymentDate ? formatDate(form.repaymentDate) : 'Select repayment date'}
            </Text>
          </TouchableOpacity>
          {errors.repaymentDate && (
            <Text style={{ color: colors.error, fontSize: 14, marginTop: 6 }}>
              {errors.repaymentDate}
            </Text>
          )}
          {showRepaymentDate && (
            <DateTimePicker
              value={form.repaymentDate ? new Date(form.repaymentDate) : new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              maximumDate={new Date()}
              minimumDate={new Date(borrowing.dateBorrowed)}
              onChange={(event, selectedDate) => {
                setShowRepaymentDate(false);
                if (selectedDate) {
                  handleChange('repaymentDate', selectedDate.toISOString().split('T')[0]);
                }
              }}
              themeVariant={isDarkMode ? 'dark' : 'light'}
            />
          )}
        </View>
        
        {/* Action Buttons */}
        <View style={{ flexDirection: 'column', marginTop: 8, marginBottom: 40 }}>
          <TouchableOpacity 
            style={{ 
              backgroundColor: colors.success, 
              padding: 16, 
              borderRadius: 8, 
              alignItems: 'center', 
              flexDirection: 'row', 
              justifyContent: 'center',
              marginBottom: 16,
              ...shadows.sm
            }} 
            onPress={onSave}
          >
            <Ionicons 
              name="checkmark-circle-outline"
              size={22} 
              color={colors.white} 
              style={{ marginRight: 8 }} 
            />
            <Text style={{ color: colors.white, fontWeight: 'bold', fontSize: 18 }}>
              Record Repayment
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={{ 
              backgroundColor: isDarkMode ? colors.lighter : '#f3f4f6', 
              padding: 16, 
              borderRadius: 8, 
              alignItems: 'center', 
              flexDirection: 'row', 
              justifyContent: 'center'
            }} 
            onPress={onClose}
          >
            <Ionicons name="close-circle-outline" size={22} color={isDarkMode ? colors.dark : colors.medium} style={{ marginRight: 8 }} />
            <Text style={{ color: isDarkMode ? colors.dark : colors.medium, fontWeight: 'bold', fontSize: 18 }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

// Modify the main component to use the modal approach
export default function Borrowing() {
  // State management
  const [form, setForm] = useState({
    amount: '',
    lenderName: '',
    lenderNumber: '',
    dateBorrowed: new Date().toISOString().split('T')[0],
    dueDate: '',
    note: '',
    repayment: '',
    repaymentDate: '',
  });
  const [showDateBorrowed, setShowDateBorrowed] = useState(false);
  const [showDueDate, setShowDueDate] = useState(false);
  const [showRepaymentDate, setShowRepaymentDate] = useState(false);
  const [errors, setErrors] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [borrowings, setBorrowings] = useState([]);
  const [loadingBorrowings, setLoadingBorrowings] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'pending', 'repaid'
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest', 'amount'
  const [showModal, setShowModal] = useState(false);
  const [showRepaymentModal, setShowRepaymentModal] = useState(false);
  const [selectedBorrowing, setSelectedBorrowing] = useState(null);
  
  // Animation values
  const slideAnim = useState(new Animated.Value(0))[0];
  const fabAnim = useState(new Animated.Value(1))[0];
  
  // Theme context
  const { isDarkMode } = useTheme();
  const colors = isDarkMode ? Theme.dark.colors : Theme.light.colors;
  const shadows = isDarkMode ? Theme.shadowsDark : Theme.shadows;

  // Data fetching
  useEffect(() => {
    setLoadingBorrowings(true);
    const user = auth.currentUser;
    if (!user) {
      console.error('User not authenticated');
      setLoadingBorrowings(false);
      return;
    }
    
    const q = query(collection(db, 'borrowings'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        const sortedBorrowings = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .sort((a, b) => {
            return new Date(b.dateBorrowed) - new Date(a.dateBorrowed);
          });
        setBorrowings(sortedBorrowings);
        setLoadingBorrowings(false);
      },
      error => {
        console.error('Error with realtime borrowings listener:', error);
        setLoadingBorrowings(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Form handlers
  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  // Data filtering
  const getFilteredBorrowings = useCallback(() => {
    let filtered = [...borrowings];
    
    // Apply search filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(borrowing => 
        (borrowing.lenderName && borrowing.lenderName.toLowerCase().includes(query)) ||
        (borrowing.note && borrowing.note.toLowerCase().includes(query)) ||
        (borrowing.amount && borrowing.amount.toString().includes(query))
      );
    }
    
    // Apply status filter
    if (filterStatus === 'pending') {
      filtered = filtered.filter(borrowing => 
        !borrowing.repayment || parseFloat(borrowing.repayment) < parseFloat(borrowing.amount));
    } else if (filterStatus === 'repaid') {
      filtered = filtered.filter(borrowing => 
        borrowing.repayment && parseFloat(borrowing.repayment) >= parseFloat(borrowing.amount));
    }
    
    // Apply sorting
    if (sortBy === 'newest') {
      filtered.sort((a, b) => new Date(b.dateBorrowed) - new Date(a.dateBorrowed));
    } else if (sortBy === 'oldest') {
      filtered.sort((a, b) => new Date(a.dateBorrowed) - new Date(b.dateBorrowed));
    } else if (sortBy === 'amount') {
      filtered.sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));
    }
    
    return filtered;
  }, [borrowings, searchQuery, filterStatus, sortBy]);

  // Animation for form slide-in
  useEffect(() => {
    if (showForm) {
      // Slide in form
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      // Hide FAB
      Animated.timing(fabAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    } else {
      // Slide out form
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
      // Show FAB
      Animated.timing(fabAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [showForm]);

  // Form validation
  const validate = () => {
    let newErrors = {};
    if (!form.amount || isNaN(parseFloat(form.amount)) || parseFloat(form.amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount';
    }
    if (!form.lenderName || form.lenderName.trim() === '') {
      newErrors.lenderName = 'Please enter the lender name';
    }
    if (!form.dateBorrowed) {
      newErrors.dateBorrowed = 'Please select the date borrowed';
    }
    if (form.repayment && (isNaN(parseFloat(form.repayment)) || parseFloat(form.repayment) < 0)) {
      newErrors.repayment = 'Please enter a valid repayment amount';
    }
    if (form.repayment && !form.repaymentDate) {
      newErrors.repaymentDate = 'Please select the repayment date';
    }
    return newErrors;
  };

  // Save borrowing
  async function onSave() {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }
    
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Prepare data with correct types
      const dataToSave = {
        amount: parseFloat(form.amount),
        lenderName: form.lenderName,
        lenderNumber: form.lenderNumber,
        dateBorrowed: form.dateBorrowed,
        dueDate: form.dueDate,
        note: form.note,
        repayment: form.repayment ? parseFloat(form.repayment) : null,
        repaymentDate: form.repaymentDate,
        userId: user.uid,
        timestamp: serverTimestamp()
      };

      // If editingId exists, update the record instead of creating a new one
      if (editingId) {
        dataToSave.updatedAt = new Date().toISOString();
        await updateDoc(doc(db, 'borrowings', editingId), dataToSave);
        Alert.alert('Success', 'Borrowing details updated successfully!');
      } else {
        dataToSave.createdAt = new Date().toISOString();
        await addDoc(collection(db, 'borrowings'), dataToSave);
        Alert.alert('Success', 'Borrowing details saved successfully!');
      }

      // Reset form and state regardless of create or update
      resetForm();
    } catch (error) {
      console.error('Error saving borrowing:', error);
      Alert.alert('Error', 'Failed to save borrowing.');
    }
  }

  // Reset form to default values
  const resetForm = () => {
    setForm({
      amount: '',
      lenderName: '',
      lenderNumber: '',
      dateBorrowed: new Date().toISOString().split('T')[0],
      dueDate: '',
      note: '',
      repayment: '',
      repaymentDate: '',
    });
    setShowForm(false);
    setEditingId(null);
  };

  // Edit a borrowing record
  const editBorrowing = (borrowing) => {
    setEditingId(borrowing.id);
    setForm({
      amount: borrowing.amount.toString(),
      lenderName: borrowing.lenderName,
      lenderNumber: borrowing.lenderNumber || '',
      dateBorrowed: borrowing.dateBorrowed,
      dueDate: borrowing.dueDate || '',
      note: borrowing.note || '',
      repayment: borrowing.repayment ? borrowing.repayment.toString() : '',
      repaymentDate: borrowing.repaymentDate || '',
    });
    setShowForm(true);
  };

  // Delete a borrowing record
  const deleteBorrowing = (id) => {
    Alert.alert(
      "Delete Borrowing",
      "Are you sure you want to delete this borrowing record?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'borrowings', id));
              Alert.alert('Success', 'Borrowing record deleted successfully');
            } catch (error) {
              console.error('Error deleting borrowing:', error);
              Alert.alert('Error', 'Failed to delete borrowing record');
            }
          }
        }
      ]
    );
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
              handleChange('lenderName', selected.name);
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

  // Calculate stats from borrowings
  const calculateStats = useCallback(() => {
    const totalBorrowed = borrowings.reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0);
    const totalRepaid = borrowings.reduce((sum, b) => sum + (parseFloat(b.repayment) || 0), 0);
    const pendingAmount = totalBorrowed - totalRepaid;
    const totalCount = borrowings.length;
    const pendingCount = borrowings.filter(b => 
      !b.repayment || parseFloat(b.repayment) < parseFloat(b.amount)
    ).length;
    const completedCount = totalCount - pendingCount;
    
    return {
      totalBorrowed,
      totalRepaid,
      pendingAmount,
      totalCount,
      pendingCount,
      completedCount,
      percentRepaid: totalBorrowed > 0 ? (totalRepaid / totalBorrowed) * 100 : 0
    };
  }, [borrowings]);

  // Filtered borrowings
  const filteredBorrowings = getFilteredBorrowings();
  const stats = calculateStats();
  
  // Get upcoming dues
  const getUpcomingDues = () => {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    
    return borrowings.filter(b => {
      if (!b.dueDate) return false;
      const dueDate = new Date(b.dueDate);
      return dueDate >= today && dueDate <= nextWeek && (!b.repayment || parseFloat(b.repayment) < parseFloat(b.amount));
    }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  };
  
  const upcomingDues = getUpcomingDues();

  // Function to handle closing the form modal
  const handleCloseForm = () => {
    setEditingId(null);
    setShowModal(false);
  };

  // New function to handle repayment
  const handleRepayment = (borrowing) => {
    setSelectedBorrowing(borrowing);
    setShowRepaymentModal(true);
  };
  
  // Function to handle closing the repayment form modal
  const handleCloseRepaymentForm = () => {
    setSelectedBorrowing(null);
    setShowRepaymentModal(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDarkMode ? colors.background : colors.background }}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingTop: Platform.OS === 'android' ? 20 : 10,
            paddingBottom: 10,
            borderBottomWidth: 1,
            borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
          }}>
            <Text style={{
              fontSize: 26,
              fontWeight: 'bold',
              color: colors.dark
            }}>
              Borrowing
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                onPress={() => {
                  setEditingId(null);
                  setShowModal(true);
                }}
                style={{ 
                  padding: 8,
                  backgroundColor: colors.primary,
                  borderRadius: 20,
                  marginRight: 10,
                  width: 36,
                  height: 36,
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                <Ionicons name="add" size={22} color={colors.white} />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setIsSearchActive(!isSearchActive)}
                style={{ 
                  padding: 8, 
                  backgroundColor: isSearchActive ? colors.primaryLight : 'transparent',
                  borderRadius: 20
                }}
              >
                <Ionicons 
                  name="search" 
                  size={22} 
                  color={isSearchActive ? colors.primary : colors.medium} 
                />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => {
                  // Show sort options
                  Alert.alert(
                    "Sort By", 
                    "Choose a sorting option",
                    [
                      { text: "Newest First", onPress: () => setSortBy('newest') },
                      { text: "Oldest First", onPress: () => setSortBy('oldest') },
                      { text: "Amount (High to Low)", onPress: () => setSortBy('amount') },
                      { text: "Cancel", style: "cancel" }
                    ]
                  );
                }}
                style={{ padding: 8, marginLeft: 8 }}
              >
                <MaterialCommunityIcons 
                  name="sort" 
                  size={22} 
                  color={colors.medium} 
                />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Search Bar */}
          {isSearchActive && (
            <View style={{
              paddingHorizontal: 20,
              paddingVertical: 10,
              backgroundColor: colors.background
            }}>
              <View style={{
                flexDirection: 'row',
                backgroundColor: isDarkMode ? colors.lighter : '#f3f4f6',
                borderRadius: 12,
                padding: 10,
                alignItems: 'center'
              }}>
                <Ionicons name="search" size={20} color={colors.medium} style={{ marginRight: 8 }} />
                <TextInput
                  placeholder="Search by name, amount, or note..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  style={{ 
                    flex: 1, 
                    color: colors.dark, 
                    fontSize: 16,
                    paddingVertical: 4
                  }}
                  placeholderTextColor={colors.medium}
                  autoFocus
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={20} color={colors.medium} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
          
          {/* Filter Pills */}
          <View style={{
            flexDirection: 'row',
            paddingHorizontal: 20,
            paddingVertical: 10
          }}>
            <TouchableOpacity 
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: filterStatus === 'all' 
                  ? colors.primary 
                  : isDarkMode ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.1)',
                marginRight: 8
              }}
              onPress={() => setFilterStatus('all')}
            >
              <Text style={{
                color: filterStatus === 'all' ? colors.white : colors.primary,
                fontWeight: '600'
              }}>All</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: filterStatus === 'pending' 
                  ? colors.error 
                  : isDarkMode ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
                marginRight: 8
              }}
              onPress={() => setFilterStatus('pending')}
            >
              <Text style={{
                color: filterStatus === 'pending' ? colors.white : colors.error,
                fontWeight: '600'
              }}>Pending</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: filterStatus === 'repaid' 
                  ? colors.success 
                  : isDarkMode ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)'
              }}
              onPress={() => setFilterStatus('repaid')}
            >
              <Text style={{
                color: filterStatus === 'repaid' ? colors.white : colors.success,
                fontWeight: '600'
              }}>Repaid</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
          >
            {/* Stats Cards */}
            <View style={{
              flexDirection: 'row',
              paddingHorizontal: 20,
              paddingTop: 10,
              paddingBottom: 20
            }}>
              {/* Total Borrowed */}
              <View style={{
                flex: 1,
                backgroundColor: colors.card,
                borderRadius: 16,
                padding: 16,
                marginRight: 10,
                ...shadows.sm
              }}>
                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  marginBottom: 10 
                }}>
                  <View style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: isDarkMode ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 8
                  }}>
                    <Ionicons name="wallet" size={18} color={colors.primary} />
                  </View>
                  <Text style={{ color: colors.medium, fontSize: 14 }}>
                    Total Borrowed
                  </Text>
                </View>
                <Text style={{ 
                  fontSize: 20, 
                  fontWeight: 'bold', 
                  color: colors.dark 
                }}>
                  ₹{stats.totalBorrowed.toLocaleString('en-IN', { 
                    maximumFractionDigits: 2,
                    minimumFractionDigits: 0
                  })}
                </Text>
              </View>
              
              {/* Pending Amount */}
              <View style={{
                flex: 1,
                backgroundColor: colors.card,
                borderRadius: 16,
                padding: 16,
                ...shadows.sm
              }}>
                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  marginBottom: 10 
                }}>
                  <View style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 8
                  }}>
                    <Ionicons name="time" size={18} color={colors.error} />
                  </View>
                  <Text style={{ color: colors.medium, fontSize: 14 }}>
                    Pending
                  </Text>
                </View>
                <Text style={{ 
                  fontSize: 20, 
                  fontWeight: 'bold', 
                  color: colors.dark 
                }}>
                  ₹{stats.pendingAmount.toLocaleString('en-IN', { 
                    maximumFractionDigits: 2,
                    minimumFractionDigits: 0 
                  })}
                </Text>
              </View>
            </View>
            
            {/* Progress Bar */}
            <View style={{
              paddingHorizontal: 20,
              marginBottom: 24
            }}>
              <View style={{
                backgroundColor: colors.card,
                borderRadius: 16,
                padding: 16,
                ...shadows.sm
              }}>
                <View style={{ 
                  flexDirection: 'row', 
                  justifyContent: 'space-between', 
                  marginBottom: 10 
                }}>
                  <Text style={{ color: colors.medium, fontSize: 14 }}>
                    Repayment Progress
                  </Text>
                  <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 14 }}>
                    {stats.percentRepaid.toFixed(0)}%
                  </Text>
                </View>
                
                <View style={{
                  height: 8,
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                  borderRadius: 4,
                  overflow: 'hidden'
                }}>
                  <View 
                    style={{
                      height: '100%',
                      width: `${Math.min(stats.percentRepaid, 100)}%`,
                      backgroundColor: colors.primary,
                      borderRadius: 4
                    }}
                  />
                </View>
                
                <View style={{ 
                  flexDirection: 'row', 
                  justifyContent: 'space-between', 
                  marginTop: 12
                }}>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ color: colors.medium, fontSize: 13, marginBottom: 4 }}>
                      Total
                    </Text>
                    <Text style={{ fontWeight: '600', color: colors.dark }}>
                      {stats.totalCount}
                    </Text>
                  </View>
                  
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ color: colors.medium, fontSize: 13, marginBottom: 4 }}>
                      Pending
                    </Text>
                    <Text style={{ fontWeight: '600', color: colors.error }}>
                      {stats.pendingCount}
                    </Text>
                  </View>
                  
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ color: colors.medium, fontSize: 13, marginBottom: 4 }}>
                      Completed
                    </Text>
                    <Text style={{ fontWeight: '600', color: colors.success }}>
                      {stats.completedCount}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            
            {/* Upcoming Dues Section */}
            {upcomingDues.length > 0 && (
              <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
                <Text style={{ 
                  fontSize: 18, 
                  fontWeight: 'bold', 
                  color: colors.dark, 
                  marginBottom: 12 
                }}>
                  Upcoming Dues
                </Text>
                
                {upcomingDues.map((due, index) => (
                  <TouchableOpacity 
                    key={due.id || index}
                    onPress={() => editBorrowing(due)}
                    style={{
                      backgroundColor: colors.card,
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      ...shadows.sm
                    }}
                  >
                    <View style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.1)',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: 12
                    }}>
                      <Ionicons name="alarm-outline" size={20} color={colors.warning} />
                    </View>
                    
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: colors.dark }}>
                        ₹{parseFloat(due.amount).toLocaleString('en-IN')}
                      </Text>
                      <Text style={{ color: colors.medium, fontSize: 14 }}>
                        {due.lenderName}
                      </Text>
                    </View>
                    
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ color: colors.warning, fontWeight: '600' }}>
                        Due {new Date(due.dueDate).toLocaleDateString()}
                      </Text>
                      <Text style={{ color: colors.medium, fontSize: 12 }}>
                        {calculateDaysRemaining(due.dueDate)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            
            {/* Borrowings List */}
            <View style={{ paddingHorizontal: 20 }}>
              <Text style={{ 
                fontSize: 18, 
                fontWeight: 'bold', 
                color: colors.dark, 
                marginBottom: 12 
              }}>
                {filteredBorrowings.length > 0 ? (
                  searchQuery ? 
                    `Search Results (${filteredBorrowings.length})` :
                    filterStatus === 'all' ? 
                      'All Borrowings' : 
                      filterStatus === 'pending' ? 
                        'Pending Borrowings' : 
                        'Repaid Borrowings'
                ) : 'No Borrowings Found'}
              </Text>
              
              {loadingBorrowings ? (
                <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
              ) : filteredBorrowings.length === 0 ? (
                <View style={{
                  backgroundColor: colors.card,
                  borderRadius: 16,
                  padding: 24,
                  alignItems: 'center',
                  ...shadows.sm
                }}>
                  <FontAwesome5 
                    name={
                      searchQuery ? 
                        "search" : 
                        filterStatus === 'pending' ? 
                          "hand-holding-usd" : 
                          "check-circle"
                    } 
                    size={40} 
                    color={colors.medium} 
                    style={{ marginBottom: 12 }} 
                  />
                  <Text style={{ 
                    color: colors.medium, 
                    fontSize: 16, 
                    textAlign: 'center',
                    lineHeight: 22
                  }}>
                    {searchQuery ? 
                      `No borrowings matching "${searchQuery}"` : 
                      filterStatus === 'all' ? 
                        "You haven't recorded any borrowings yet." : 
                        filterStatus === 'pending' ?
                          "No pending borrowings found." :
                          "No repaid borrowings found."
                    }
                  </Text>
                  {!searchQuery && filterStatus === 'all' && (
                    <TouchableOpacity
                      style={{
                        backgroundColor: colors.primary,
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 8,
                        marginTop: 16,
                        flexDirection: 'row',
                        alignItems: 'center'
                      }}
                      onPress={() => {
                        setEditingId(null);
                        setForm({
                          ...form,
                          dateBorrowed: new Date().toISOString().split('T')[0]
                        });
                        setShowForm(true);
                      }}
                    >
                      <Ionicons name="add" size={18} color={colors.white} style={{ marginRight: 8 }} />
                      <Text style={{ color: colors.white, fontWeight: '600' }}>
                        Add Your First Borrowing
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                filteredBorrowings.map((borrowing, index) => (
                  <View 
                    key={borrowing.id || index} 
                    style={{
                      backgroundColor: colors.card,
                      borderRadius: 16,
                      marginBottom: 12,
                      overflow: 'hidden',
                      ...shadows.sm
                    }}
                  >
                    {/* Repayment Status Indicator */}
                    {borrowing.repayment && parseFloat(borrowing.repayment) >= parseFloat(borrowing.amount) ? (
                      <View style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        backgroundColor: colors.success,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderBottomLeftRadius: 8,
                        zIndex: 1
                      }}>
                        <Text style={{ color: colors.white, fontSize: 12, fontWeight: '600' }}>
                          Repaid
                        </Text>
                      </View>
                    ) : borrowing.dueDate && new Date(borrowing.dueDate) < new Date() ? (
                      <View style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        backgroundColor: colors.error,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderBottomLeftRadius: 8,
                        zIndex: 1
                      }}>
                        <Text style={{ color: colors.white, fontSize: 12, fontWeight: '600' }}>
                          Overdue
                        </Text>
                      </View>
                    ) : borrowing.dueDate ? (
                      <View style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        backgroundColor: colors.warning,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderBottomLeftRadius: 8,
                        zIndex: 1
                      }}>
                        <Text style={{ color: colors.white, fontSize: 12, fontWeight: '600' }}>
                          Due Soon
                        </Text>
                      </View>
                    ) : null}
                    
                    <View style={{ padding: 16 }}>
                      {/* Header with amount and actions */}
                      <View style={{ 
                        flexDirection: 'row', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginBottom: 12
                      }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: isDarkMode ? 
                              'rgba(99, 102, 241, 0.2)' : 
                              'rgba(99, 102, 241, 0.1)',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginRight: 12
                          }}>
                            <FontAwesome5 name="rupee-sign" size={16} color={colors.primary} />
                          </View>
                          <View>
                            <Text style={{ 
                              fontSize: 18, 
                              fontWeight: 'bold', 
                              color: colors.dark 
                            }}>
                              ₹{parseFloat(borrowing.amount).toLocaleString('en-IN')}
                            </Text>
                            <Text style={{ color: colors.medium, fontSize: 14 }}>
                              {borrowing.lenderName}
                            </Text>
                          </View>
                        </View>
                        
                        <View style={{ flexDirection: 'row' }}>
                          <TouchableOpacity 
                            onPress={() => editBorrowing(borrowing)}
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 18,
                              backgroundColor: isDarkMode ? 
                                'rgba(99, 102, 241, 0.2)' : 
                                'rgba(99, 102, 241, 0.1)',
                              justifyContent: 'center',
                              alignItems: 'center',
                              marginRight: 8
                            }}
                          >
                            <Ionicons name="pencil" size={18} color={colors.primary} />
                          </TouchableOpacity>
                          <TouchableOpacity 
                            onPress={() => deleteBorrowing(borrowing.id)}
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 18,
                              backgroundColor: isDarkMode ? 
                                'rgba(239, 68, 68, 0.2)' : 
                                'rgba(239, 68, 68, 0.1)',
                              justifyContent: 'center',
                              alignItems: 'center'
                            }}
                          >
                            <Ionicons name="trash-outline" size={18} color={colors.error} />
                          </TouchableOpacity>
                        </View>
                      </View>
                      
                      {/* Dates section */}
                      <View style={{ 
                        flexDirection: 'row', 
                        flexWrap: 'wrap',
                        marginBottom: 10
                      }}>
                        <View style={{ 
                          flexDirection: 'row', 
                          alignItems: 'center', 
                          marginRight: 16,
                          marginBottom: 6
                        }}>
                          <Ionicons name="calendar-outline" size={14} color={colors.medium} style={{ marginRight: 4 }} />
                          <Text style={{ color: colors.medium, fontSize: 14 }}>
                            Borrowed: {formatDate(borrowing.dateBorrowed)}
                          </Text>
                        </View>
                        
                        {borrowing.dueDate && (
                          <View style={{ 
                            flexDirection: 'row', 
                            alignItems: 'center',
                            marginBottom: 6
                          }}>
                            <Ionicons name="alarm-outline" size={14} color={colors.medium} style={{ marginRight: 4 }} />
                            <Text style={{ 
                              color: new Date(borrowing.dueDate) < new Date() && 
                                (!borrowing.repayment || parseFloat(borrowing.repayment) < parseFloat(borrowing.amount)) ? 
                                colors.error : colors.medium, 
                              fontSize: 14 
                            }}>
                              Due: {formatDate(borrowing.dueDate)}
                            </Text>
                          </View>
                        )}
                      </View>
                      
                      {/* Repayment info */}
                      {borrowing.repayment && parseFloat(borrowing.repayment) > 0 && (
                        <View style={{ 
                          backgroundColor: colors.success + '15', 
                          paddingVertical: 8, 
                          paddingHorizontal: 12, 
                          borderRadius: 8,
                          marginBottom: 10,
                          flexDirection: 'row',
                          alignItems: 'center',
                          alignSelf: 'flex-start'
                        }}>
                          <Ionicons name="checkmark-circle" size={16} color={colors.success} style={{ marginRight: 6 }} />
                          <Text style={{ color: colors.success, fontSize: 14 }}>
                            Repaid ₹{parseFloat(borrowing.repayment).toLocaleString('en-IN')} 
                            {borrowing.repaymentDate ? ` on ${formatDate(borrowing.repaymentDate)}` : ''}
                          </Text>
                        </View>
                      )}
                      
                      {/* Note section */}
                      {borrowing.note && (
                        <View style={{
                          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                          padding: 12,
                          borderRadius: 8
                        }}>
                          <Text style={{ 
                            color: colors.medium, 
                            fontSize: 14,
                            fontStyle: 'italic'
                          }}>
                            "{borrowing.note}"
                          </Text>
                        </View>
                      )}
                    </View>
                    
                    {/* Add repayment button */}
                    <View style={{ 
                      borderTopWidth: 1, 
                      borderTopColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                      flexDirection: 'row',
                      padding: 12
                    }}>
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          paddingVertical: 10,
                          backgroundColor: borrowing.repayment && parseFloat(borrowing.repayment) >= parseFloat(borrowing.amount) 
                            ? isDarkMode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)'
                            : isDarkMode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)',
                          borderRadius: 8
                        }}
                        onPress={() => handleRepayment(borrowing)}
                      >
                        <Ionicons 
                          name={
                            borrowing.repayment && parseFloat(borrowing.repayment) >= parseFloat(borrowing.amount)
                              ? "checkmark-circle"
                              : "cash-outline"
                          } 
                          size={20} 
                          color={colors.success} 
                          style={{ marginRight: 8 }}
                        />
                        <Text style={{ color: colors.success, fontWeight: '600' }}>
                          {borrowing.repayment && parseFloat(borrowing.repayment) >= parseFloat(borrowing.amount)
                            ? "Fully Repaid"
                            : borrowing.repayment > 0
                              ? "Add More Repayment"
                              : "Record Repayment"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
          
          {/* Floating Action Button - Removed as it's now in the header */}
        </View>
      </KeyboardAvoidingView>
      
      {/* Modal for Add/Edit Borrowing Form */}
      <Modal
        visible={showModal}
        animationType="slide"
        onRequestClose={handleCloseForm}
      >
        <AddBorrowingForm 
          onClose={handleCloseForm} 
          editingData={editingId ? borrowings.find(b => b.id === editingId) : null} 
        />
      </Modal>
      
      {/* Add the Repayment Modal */}
      <Modal
        visible={showRepaymentModal}
        animationType="slide"
        onRequestClose={handleCloseRepaymentForm}
      >
        {selectedBorrowing && (
          <RepaymentForm 
            borrowing={selectedBorrowing} 
            onClose={handleCloseRepaymentForm}
            onSuccess={() => {
              // Refresh data if needed
            }}
          />
        )}
      </Modal>
      
      <BottomNavBar />
    </SafeAreaView>
  );
}

// Helper component for form fields
const CustomFormField = ({ label, placeholder, value, onChangeText, keyboardType, error, icon, isDarkMode, colors }) => {
  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={{ 
        fontSize: 18, 
        fontWeight: '600', 
        color: isDarkMode ? colors.dark : colors.dark, 
        marginBottom: 12 
      }}>
        {label}
      </Text>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDarkMode ? colors.lighter : colors.lighter,
        borderWidth: 1,
        borderColor: error ? colors.error : isDarkMode ? colors.light : colors.light,
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 16
      }}>
        <Ionicons 
          name={icon} 
          size={22} 
          color={isDarkMode ? colors.medium : colors.medium} 
          style={{ marginRight: 12 }} 
        />
        <TextInput
          style={{ 
            flex: 1, 
            color: isDarkMode ? colors.dark : colors.dark, 
            fontSize: 16
          }}
          placeholder={placeholder}
          placeholderTextColor={isDarkMode ? colors.medium : colors.medium}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType || 'default'}
        />
      </View>
      {error && (
        <Text style={{ color: colors.error, fontSize: 14, marginTop: 6 }}>
          {error}
        </Text>
      )}
    </View>
  );
};

// Helper function to format dates
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

// Helper function to calculate days remaining
const calculateDaysRemaining = (dueDate) => {
  if (!dueDate) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Due today';
  if (diffDays === 1) return 'Due tomorrow';
  if (diffDays > 0) return `${diffDays} days left`;
  if (diffDays === -1) return 'Overdue by 1 day';
  return `Overdue by ${Math.abs(diffDays)} days`;
};