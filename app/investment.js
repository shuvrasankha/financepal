import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomNavBar from './components/BottomNavBar';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { db, auth } from '../firebase';
import { collection, addDoc, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { useTheme } from '../contexts/ThemeContext';
import Theme from '../constants/Theme';

const ASSET_TYPES = [
  { type: 'Stocks', color: '#6366f1', icon: 'trending-up-outline', value: 0 },
  { type: 'Mutual Funds', color: '#10b981', icon: 'pie-chart-outline', value: 0 },
  { type: 'Gold', color: '#f59e0b', icon: 'sparkles-outline', value: 0 },
  { type: 'Fixed Deposit', color: '#ef4444', icon: 'cash-outline', value: 0 },
  { type: 'Real Estate', color: '#a16207', icon: 'home-outline', value: 0 },
  { type: 'Others', color: '#3b82f6', icon: 'cube-outline', value: 0 },
  { type: 'Crypto', color: '#a855f7', icon: 'logo-bitcoin', value: 0 },
];

const INVESTMENT_TYPES = [
  { label: 'Stocks', icon: 'trending-up-outline', color: '#6366f1' },
  { label: 'Mutual Funds', icon: 'pie-chart-outline', color: '#10b981' },
  { label: 'Fixed Deposit', icon: 'cash-outline', color: '#ef4444' },
  { label: 'Real Estate', icon: 'home-outline', color: '#a16207' },
  { label: 'Gold', icon: 'sparkles-outline', color: '#f59e0b' },
  { label: 'Others', icon: 'cube-outline', color: '#3b82f6' },
  { label: 'Crypto', icon: 'logo-bitcoin', color: '#a855f7' },
];

// AddInvestmentForm component for modal
function AddInvestmentForm({ onClose, onAdded }) {
  const [form, setForm] = useState({
    amount: '',
    currentValue: '', // Add current value field
    investmentType: '',
    dateInvested: new Date().toISOString().split('T')[0],
    note: '',
    stockName: '',
    mfName: '',
  });
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Get theme colors
  const { isDarkMode } = useTheme();
  const colors = isDarkMode ? Theme.dark.colors : Theme.light.colors;
  const shadows = isDarkMode ? Theme.shadowsDark : Theme.shadows;

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!form.amount || !form.investmentType) {
      alert('Amount and Investment Type are required.');
      return;
    }
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not logged in');
      
      console.log('Form data before submission:', form); // Log form data to debug

      // Use current value if provided, otherwise use investment amount as current value
      const initialAmount = Number(form.amount);
      const currentValue = form.currentValue && form.currentValue !== '' ? 
                            Number(form.currentValue) : 
                            initialAmount;
      
      console.log('Initial amount:', initialAmount);
      console.log('Current value:', currentValue);
      
      // Calculate profit/loss percentage
      const profitLossPercentage = initialAmount > 0 
        ? ((currentValue - initialAmount) / initialAmount) * 100 
        : 0;
      
      const investmentData = {
        userId: user.uid,
        amount: initialAmount,
        currentValue: currentValue,
        profitLossPercentage: parseFloat(profitLossPercentage.toFixed(2)),
        type: form.investmentType, // Match Firebase rules
        investmentType: form.investmentType, // Keep for backward compatibility
        dateInvested: form.dateInvested,
        note: form.note,
        stockName: form.stockName,
        mfName: form.mfName,
        createdAt: new Date().toISOString(), // Store as ISO string with full datetime
      };
      
      console.log('Saving investment data:', investmentData);
      
      await addDoc(collection(db, 'investments'), investmentData);
      
      alert('Investment added!');
      onClose();
      if (onAdded) onAdded();
    } catch (e) {
      alert('Failed to add investment: ' + e.message);
      console.error('Error adding investment:', e); // Added logging for debugging
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background, padding: 10 }}>
    <View style={{ flex: 1, backgroundColor: colors.background, padding: 24 }}>
      {/* Header with Cancel Button */}
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 24,
        marginTop: 46
      }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.dark }}>Add Investment</Text>
        <TouchableOpacity
          onPress={onClose}
          style={{
            padding: 8,
            borderRadius: 8,
            backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2'
          }}
        >
          <Ionicons name="close-circle-outline" size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <Text style={{ marginBottom: 8, fontSize: 18, color: colors.dark }}>Amount</Text>
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
          onChangeText={text => handleChange('amount', text.replace(/[^0-9.]/g, ''))}
          placeholder="₹5000"
          placeholderTextColor={isDarkMode ? colors.medium : "#aaa"}
        />
      </View>
      <Text style={{ marginBottom: 8, fontSize: 18, color: colors.dark }}>Current Value</Text>
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
          value={form.currentValue}
          onChangeText={text => handleChange('currentValue', text.replace(/[^0-9.]/g, ''))}
          placeholder="₹5000"
          placeholderTextColor={isDarkMode ? colors.medium : "#aaa"}
        />
      </View>
      <Text style={{ marginBottom: 8, fontSize: 18, color: colors.dark }}>Investment Type</Text>
      <TouchableOpacity
        style={{ 
          borderWidth: 1, 
          borderColor: isDarkMode ? colors.light : '#e5e7eb', 
          borderRadius: 8, 
          padding: 14, 
          marginBottom: 20,
          backgroundColor: colors.card 
        }}
        onPress={() => setShowTypeModal(true)}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {form.investmentType && (
            <Ionicons
              name={INVESTMENT_TYPES.find(t => t.label === form.investmentType)?.icon || 'ellipse-outline'}
              size={22}
              color={INVESTMENT_TYPES.find(t => t.label === form.investmentType)?.color || '#aaa'}
              style={{ marginRight: 10 }}
            />
          )}
          <Text style={{ color: form.investmentType ? colors.dark : isDarkMode ? colors.medium : '#aaa', fontSize: 18 }}>
            {form.investmentType || 'Select Investment Type'}
          </Text>
        </View>
      </TouchableOpacity>
      <Modal visible={showTypeModal} transparent animationType="fade">
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setShowTypeModal(false)}>
          <View style={{ backgroundColor: colors.card, borderRadius: 8, padding: 18, width: 280 }}>
            {INVESTMENT_TYPES.map(type => (
              <TouchableOpacity key={type.label} style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }} onPress={() => { handleChange('investmentType', type.label); setShowTypeModal(false); }}>
                <Ionicons name={type.icon} size={22} color={type.color} style={{ marginRight: 14 }} />
                <Text style={{ fontSize: 18, color: colors.dark }}>{type.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
      {/* Show Stock Name input if Stock is selected */}
      {form.investmentType === 'Stocks' && (
        <View style={{ marginBottom: 20 }}>
          <Text style={{ marginBottom: 8, fontSize: 18, color: colors.dark }}>Stock Name</Text>
          <TextInput
            style={{ 
              borderWidth: 1, 
              borderColor: isDarkMode ? colors.light : '#e5e7eb', 
              borderRadius: 8, 
              padding: 10, 
              fontSize: 18,
              color: colors.dark,
              backgroundColor: colors.card 
            }}
            value={form.stockName}
            onChangeText={text => handleChange('stockName', text)}
            placeholder="Enter stock name"
            placeholderTextColor={isDarkMode ? colors.medium : "#aaa"}
          />
        </View>
      )}
      {/* Show Mutual Fund Name input if Mutual Funds is selected */}
      {form.investmentType === 'Mutual Funds' && (
        <View style={{ marginBottom: 20 }}>
          <Text style={{ marginBottom: 8, fontSize: 18, color: colors.dark }}>Mutual Fund Name</Text>
          <TextInput
            style={{ 
              borderWidth: 1, 
              borderColor: isDarkMode ? colors.light : '#e5e7eb', 
              borderRadius: 8, 
              padding: 10, 
              fontSize: 18,
              color: colors.dark,
              backgroundColor: colors.card 
            }}
            value={form.mfName}
            onChangeText={text => handleChange('mfName', text)}
            placeholder="Enter mutual fund name"
            placeholderTextColor={isDarkMode ? colors.medium : "#aaa"}
          />
        </View>
      )}
      <Text style={{ marginBottom: 8, fontSize: 18, color: colors.dark }}>Date Invested</Text>
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
        <Text style={{ color: colors.dark, fontSize: 18 }}>{form.dateInvested}</Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={form.dateInvested ? new Date(form.dateInvested) : new Date()}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              handleChange('dateInvested', selectedDate.toISOString().split('T')[0]);
            }
          }}
        />
      )}
      <Text style={{ marginBottom: 8, fontSize: 18, color: colors.dark }}>Note</Text>
      <TextInput
        style={{ 
          borderWidth: 1, 
          borderColor: isDarkMode ? colors.light : '#e5e7eb', 
          borderRadius: 8, 
          padding: 10, 
          marginBottom: 28, 
          fontSize: 18,
          color: colors.dark,
          backgroundColor: colors.card 
        }}
        value={form.note}
        onChangeText={text => handleChange('note', text)}
        placeholder="Any note..."
        placeholderTextColor={isDarkMode ? colors.medium : "#aaa"}
      />
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

// UpdateInvestmentValueForm component for updating current values by asset type
function UpdateInvestmentValueForm({ onClose, onUpdated, assetType }) {
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatedValues, setUpdatedValues] = useState({});
  
  // Get theme colors
  const { isDarkMode } = useTheme();
  const colors = isDarkMode ? Theme.dark.colors : Theme.light.colors;
  const shadows = isDarkMode ? Theme.shadowsDark : Theme.shadows;

  // Fetch investments of the selected asset type
  useEffect(() => {
    const fetchAssetInvestments = async () => {
      try {
        setLoading(true);
        const user = auth.currentUser;
        if (!user) return;
        
        const q = query(
          collection(db, 'investments'), 
          where('userId', '==', user.uid),
          where('type', '==', assetType)
        );
        
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => {
          const docData = doc.data();
          return {
            id: doc.id,
            ...docData,
            amount: Number(docData.amount) || 0,
            currentValue: Number(docData.currentValue) || Number(docData.amount) || 0
          };
        });
        
        // Initialize updatedValues with current values
        const initialValues = {};
        data.forEach(inv => {
          initialValues[inv.id] = inv.currentValue.toString();
        });
        
        setInvestments(data);
        setUpdatedValues(initialValues);
      } catch (e) {
        console.error('Error fetching investments for update:', e);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAssetInvestments();
  }, [assetType]);

  // Handle changes to the current value inputs
  const handleValueChange = (id, value) => {
    setUpdatedValues(prev => ({
      ...prev,
      [id]: value.replace(/[^0-9.]/g, '')
    }));
  };

  // Submit updated values to Firestore
  const handleSubmit = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) throw new Error('Not logged in');
      
      // Process each investment that has been updated
      const updatePromises = investments.map(async (investment) => {
        const newValue = Number(updatedValues[investment.id]);
        
        // Skip if value hasn't changed
        if (newValue === investment.currentValue) return null;
        
        // Calculate new profit/loss percentage
        const initialAmount = investment.amount;
        const profitLossPercentage = initialAmount > 0 
          ? ((newValue - initialAmount) / initialAmount) * 100 
          : 0;
        
        console.log(`Updating investment ${investment.id}: Current value from ${investment.currentValue} to ${newValue}, P/L: ${profitLossPercentage.toFixed(2)}%`);
        
        // Update the document in Firestore
        const docRef = doc(db, 'investments', investment.id);
        return updateDoc(docRef, {
          currentValue: newValue,
          profitLossPercentage: parseFloat(profitLossPercentage.toFixed(2))
        });
      });
      
      // Wait for all updates to complete
      await Promise.all(updatePromises.filter(Boolean));
      
      alert('Investment values updated successfully!');
      if (onUpdated) onUpdated();
      onClose();
    } catch (e) {
      alert('Failed to update investment values: ' + e.message);
      console.error('Error updating investment values:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ 
      flex: 1, 
      backgroundColor: colors.background,
    }}>
      {/* Enhanced Header with Close Button */}
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 16,
        backgroundColor: colors.primary,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        ...shadows.md
      }}>
        <Text style={{ 
          fontSize: 22, 
          fontWeight: 'bold', 
          color: colors.white 
        }}>
          Update {assetType} Values
        </Text>
        <TouchableOpacity
          onPress={onClose}
          style={{
            padding: 10,
            borderRadius: 20,
            backgroundColor: 'rgba(255,255,255,0.2)',
          }}
        >
          <Ionicons name="close" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ 
          padding: 16,
          paddingBottom: 40
        }}
      >
        {loading ? (
          <View style={{ padding: 20, alignItems: 'center', justifyContent: 'center', height: 200 }}>
            <Text style={{ color: colors.medium, marginBottom: 10 }}>Loading investments...</Text>
          </View>
        ) : investments.length === 0 ? (
          <View style={{ 
            padding: 20, 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: 300,
            backgroundColor: colors.card,
            borderRadius: 12,
            ...shadows.sm
          }}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.medium} style={{ marginBottom: 16 }} />
            <Text style={{ color: colors.medium, fontSize: 16, textAlign: 'center' }}>
              No {assetType} investments found.
            </Text>
            <TouchableOpacity
              style={{
                marginTop: 24,
                backgroundColor: colors.primary,
                paddingVertical: 10,
                paddingHorizontal: 16,
                borderRadius: 8,
              }}
              onPress={onClose}
            >
              <Text style={{ color: colors.white, fontWeight: '500' }}>Go Back</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={{ 
              marginBottom: 16, 
              fontSize: 16, 
              color: colors.medium,
              textAlign: 'center'
            }}>
              Update the current values of your {assetType} investments:
            </Text>
            
            {investments.map(investment => (
              <View key={investment.id} style={{ 
                backgroundColor: colors.card, 
                borderRadius: 16, 
                padding: 20, 
                marginBottom: 16,
                ...shadows.sm
              }}>
                <View style={{ 
                  flexDirection: 'row', 
                  justifyContent: 'space-between', 
                  marginBottom: 12,
                  alignItems: 'center'
                }}>
                  <Text style={{ 
                    fontSize: 18, 
                    fontWeight: '600', 
                    color: colors.dark,
                    flex: 1
                  }}>
                    {investment.stockName || investment.mfName || assetType}
                  </Text>
                  <View style={{
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                    padding: 8,
                    borderRadius: 8
                  }}>
                    <Text style={{ 
                      fontSize: 14, 
                      color: colors.medium,
                      fontWeight: '500'
                    }}>
                      {new Date(investment.dateInvested).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                
                <View style={{ 
                  flexDirection: 'row', 
                  justifyContent: 'space-between', 
                  marginBottom: 16,
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                  padding: 12,
                  borderRadius: 8
                }}>
                  <Text style={{ fontSize: 15, color: colors.medium }}>Initial Investment:</Text>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: colors.dark }}>
                    ₹{investment.amount.toLocaleString('en-IN')}
                  </Text>
                </View>
                
                <Text style={{ 
                  marginBottom: 8, 
                  fontSize: 15, 
                  color: colors.dark,
                  fontWeight: '500' 
                }}>
                  Current Value:
                </Text>
                
                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center',
                  backgroundColor: colors.background,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderWidth: 1,
                  borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
                }}>
                  <Text style={{ 
                    fontSize: 20, 
                    fontWeight: 'bold',
                    marginRight: 8,
                    color: colors.primary
                  }}>₹</Text>
                  <TextInput
                    style={{ 
                      flex: 1, 
                      fontSize: 20,
                      color: colors.dark,
                      padding: 8,
                      fontWeight: '500'
                    }}
                    keyboardType="numeric"
                    value={updatedValues[investment.id]}
                    onChangeText={text => handleValueChange(investment.id, text)}
                    placeholder={investment.currentValue.toString()}
                    placeholderTextColor={isDarkMode ? colors.medium : "rgba(0,0,0,0.3)"}
                  />
                </View>
                
                {updatedValues[investment.id] && Number(updatedValues[investment.id]) !== investment.currentValue && (
                  <View style={{ 
                    marginTop: 12, 
                    flexDirection: 'row', 
                    alignItems: 'center',
                    justifyContent: 'flex-end'
                  }}>
                    {(() => {
                      const newValue = Number(updatedValues[investment.id]);
                      const plPercentage = investment.amount > 0 
                        ? ((newValue - investment.amount) / investment.amount) * 100 
                        : 0;
                      const isProfit = plPercentage >= 0;
                      
                      return (
                        <View style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: isProfit ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          paddingVertical: 4,
                          paddingHorizontal: 12,
                          borderRadius: 16
                        }}>
                          <Ionicons 
                            name={isProfit ? "trending-up" : "trending-down"} 
                            size={16} 
                            color={isProfit ? '#10b981' : '#ef4444'} 
                            style={{ marginRight: 4 }}
                          />
                          <Text style={{ 
                            fontSize: 14, 
                            fontWeight: '600',
                            color: isProfit ? '#10b981' : '#ef4444'
                          }}>
                            {isProfit ? '+' : ''}{plPercentage.toFixed(2)}%
                          </Text>
                        </View>
                      );
                    })()}
                  </View>
                )}
              </View>
            ))}
            
            <TouchableOpacity 
              style={{ 
                backgroundColor: colors.primary, 
                paddingVertical: 16, 
                borderRadius: 12, 
                alignItems: 'center', 
                flexDirection: 'row', 
                justifyContent: 'center',
                marginTop: 8,
                ...shadows.sm
              }} 
              onPress={handleSubmit}
              disabled={loading}
            >
              <Ionicons 
                name="checkmark-circle" 
                size={24} 
                color={colors.white} 
                style={{ marginRight: 8 }} 
              />
              <Text style={{ 
                color: colors.white, 
                fontWeight: 'bold', 
                fontSize: 18 
              }}>
                {loading ? 'Updating...' : 'Update Values'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

export default function Investment() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedAssetType, setSelectedAssetType] = useState('');
  const [selectedAssetIdx, setSelectedAssetIdx] = useState(0);
  const [investments, setInvestments] = useState([]);
  const [refresh, setRefresh] = useState(false); // Add a refresh state
  const [totalProfit, setTotalProfit] = useState(0);
  const [totalProfitPercentage, setTotalProfitPercentage] = useState(0);

  // Get theme colors
  const { isDarkMode } = useTheme();
  // Force theme update with useEffect
  const colors = isDarkMode ? Theme.dark.colors : Theme.light.colors;
  const shadows = isDarkMode ? Theme.shadowsDark : Theme.shadows;

  // Force the component to re-render when isDarkMode changes
  useEffect(() => {
    setRefresh(prev => !prev);
  }, [isDarkMode]);

  const fetchInvestments = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      console.log('Fetching investments for user:', user.uid);
      const q = query(collection(db, 'investments'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      
      console.log('Found investments:', snapshot.docs.length);
      
      const data = snapshot.docs.map(doc => {
        const docData = doc.data();
        console.log('Investment data:', docData);
        return {
          id: doc.id,
          ...docData,
          // Ensure we have standard naming between type and investmentType
          type: docData.type || docData.investmentType,
          investmentType: docData.investmentType || docData.type,
          // Ensure created date is handled properly
          createdAt: docData.createdAt || '',
          // Make sure amount and currentValue are numbers
          amount: Number(docData.amount) || 0,
          currentValue: Number(docData.currentValue) || Number(docData.amount) || 0
        };
      });

      // Calculate total investment amount and current value
      let totalInvestmentAmount = 0;
      let totalCurrentValue = 0;

      // Process all investments
      data.forEach(inv => {
        totalInvestmentAmount += inv.amount;
        totalCurrentValue += inv.currentValue;
      });

      // Calculate overall profit/loss
      const overallProfit = totalCurrentValue - totalInvestmentAmount;
      const overallProfitPercentage = totalInvestmentAmount > 0 
        ? (overallProfit / totalInvestmentAmount) * 100 
        : 0;
      
      console.log('Total investment amount:', totalInvestmentAmount);
      console.log('Total current value:', totalCurrentValue);
      console.log('Overall profit:', overallProfit);
      console.log('Overall profit percentage:', overallProfitPercentage);
      
      setTotalProfit(overallProfit);
      setTotalProfitPercentage(parseFloat(overallProfitPercentage.toFixed(2)));
      setInvestments(data);
    } catch (e) {
      console.error('Error fetching investments:', e);
      setInvestments([]);
      setTotalProfit(0);
      setTotalProfitPercentage(0);
    }
  };

  React.useEffect(() => {
    fetchInvestments();
  }, []);

  // Calculate total portfolio value from fetched investments
  const totalValue = investments.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);

  // Calculate asset allocation from fetched investments
  const assetAlloc = ASSET_TYPES.map(assetType => {
    // Find all investments of this type
    const typeInvestments = investments.filter(inv => 
      inv.investmentType === assetType.type || inv.type === assetType.type
    );
    
    // Calculate total value for this asset type
    const totalAmount = typeInvestments.reduce((sum, inv) => sum + Number(inv.amount), 0);
    
    return {
      ...assetType,
      value: totalAmount
    };
  });

  // Pie chart and asset trend data from fetched investments
  // Pie chart: assetAlloc
  // Asset trend: build yearly data for each asset type
  const currentYear = new Date().getFullYear();
  const years = Array.from({length: 7}, (_, i) => (currentYear - 6 + i).toString());
  // For each asset type, build an array of yearly totals
  const assetYearData = assetAlloc.map(asset => {
    return years.map(year => {
      return investments.filter(inv => 
        (inv.investmentType === asset.type || inv.type === asset.type) && 
        inv.dateInvested?.startsWith(year)
      ).reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
    });
  });

  return (
    <>
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: 12,
          paddingTop: 46
        }}>
          <Text style={{ fontSize: 28, fontWeight: 'bold', color: colors.dark, letterSpacing: 0.5 }}>Investments</Text>
          
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
              ...shadows.sm
            }} 
            onPress={() => setShowAddModal(true)}
          >
            <Ionicons name="add" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>
        
        {/* Portfolio Value Card */}
        <View style={[styles.portfolioCard, { backgroundColor: colors.card, ...shadows.sm }]}>
          <Text style={[styles.portfolioLabel, { color: colors.medium }]}>Portfolio Value</Text>
          <Text style={[styles.portfolioValue, { color: colors.primary }]}>₹{totalValue.toLocaleString('en-IN')}</Text>
        </View>
        {/* Yearly Portfolio Growth - Redesigned */}
        <View style={{
          marginVertical: 20,
          backgroundColor: colors.card,
          borderRadius: 16,
          padding: 20,
          ...shadows.sm
        }}>
          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: 16
          }}>
            <Text style={{ 
              fontSize: 18, 
              fontWeight: '600', 
              color: colors.dark 
            }}>
              Yearly Portfolio Growth
            </Text>
            
            <View style={{ 
              backgroundColor: colors.primary + '20',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
              flexDirection: 'row',
              alignItems: 'center'
            }}>
              <Ionicons name="calendar-outline" size={14} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={{ color: colors.primary, fontWeight: '500', fontSize: 13 }}>
                {years[0]}-{years[years.length-1]}
              </Text>
            </View>
          </View>
          
          {/* Calculate growth rate year over year */}
          {(() => {
            const yearlyValues = years.map(year =>
              investments.filter(inv => inv.dateInvested?.startsWith(year))
                .reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0)
            );
            
            // Calculate growth from first to last year
            const firstYearValue = yearlyValues[0] || 0;
            const lastYearValue = yearlyValues[yearlyValues.length - 1] || 0;
            const totalGrowth = firstYearValue > 0 
              ? ((lastYearValue - firstYearValue) / firstYearValue) * 100 
              : 0;
            
            // Calculate CAGR (Compound Annual Growth Rate)
            const yearsPassed = years.length - 1;
            const cagr = yearsPassed > 0 && firstYearValue > 0 
              ? (Math.pow((lastYearValue / firstYearValue), 1 / yearsPassed) - 1) * 100 
              : 0;
            
            return (
              <View style={{ 
                flexDirection: 'row', 
                marginBottom: 16,
                justifyContent: 'space-between'
              }}>
                <View style={{ 
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.02)',
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 12,
                  flex: 1,
                  marginRight: 8
                }}>
                  <Text style={{ fontSize: 12, color: colors.medium, marginBottom: 2 }}>
                    Total Growth
                  </Text>
                  <Text style={{ 
                    fontSize: 16, 
                    fontWeight: 'bold',
                    color: totalGrowth >= 0 ? '#10b981' : '#ef4444'
                  }}>
                    {totalGrowth >= 0 ? '+' : ''}{totalGrowth.toFixed(1)}%
                  </Text>
                </View>
                
                <View style={{ 
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.02)',
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 12,
                  flex: 1
                }}>
                  <Text style={{ fontSize: 12, color: colors.medium, marginBottom: 2 }}>
                    CAGR
                  </Text>
                  <Text style={{ 
                    fontSize: 16, 
                    fontWeight: 'bold',
                    color: cagr >= 0 ? '#10b981' : '#ef4444'
                  }}>
                    {cagr >= 0 ? '+' : ''}{cagr.toFixed(1)}%
                  </Text>
                </View>
              </View>
            );
          })()}
          
          <LineChart
            data={{
              labels: years,
              datasets: [
                {
                  data: years.map(year =>
                    investments.filter(inv => inv.dateInvested?.startsWith(year))
                      .reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0)
                  ),
                  color: (opacity = 1) => colors.primary,
                  strokeWidth: 2,
                },
              ],
            }}
            width={Dimensions.get('window').width - 80}
            height={200}
            yAxisLabel="₹"
            yAxisSuffix=""
            chartConfig={{
              backgroundColor: 'transparent',
              backgroundGradientFrom: colors.card,
              backgroundGradientTo: colors.card,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(${isDarkMode ? '255, 255, 255' : '31, 41, 55'}, ${opacity})`,
              propsForDots: {
                r: '6',
                strokeWidth: '2',
                stroke: colors.primary,
              },
              propsForBackgroundLines: {
                strokeDasharray: '6, 6',
                stroke: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              },
              fillShadowGradient: colors.primary,
              fillShadowGradientOpacity: 0.2,
            }}
            bezier
            withInnerLines={false}
            withOuterLines={true}
            withVerticalLabels={true}
            withHorizontalLabels={true}
            style={{ 
              borderRadius: 8,
            }}
          />
          
          {/* Add Max and Min Values */}
          {(() => {
            const yearlyValues = years.map(year =>
              investments.filter(inv => inv.dateInvested?.startsWith(year))
                .reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0)
            );
            
            const maxValue = Math.max(...yearlyValues);
            const minValue = Math.min(...yearlyValues.filter(v => v > 0)) || 0;
            const maxYear = years[yearlyValues.indexOf(maxValue)];
            const minYear = yearlyValues.some(v => v > 0) ? years[yearlyValues.indexOf(minValue)] : null;
            
            return (
              <View style={{ 
                flexDirection: 'row', 
                justifyContent: 'space-between',
                marginTop: 16
              }}>
                {maxValue > 0 && (
                  <View style={{ alignItems: 'flex-start' }}>
                    <Text style={{ color: colors.medium, fontSize: 12 }}>Max ({maxYear})</Text>
                    <Text style={{ 
                      color: colors.dark, 
                      fontWeight: 'bold', 
                      fontSize: 16 
                    }}>
                      ₹{maxValue.toLocaleString('en-IN')}
                    </Text>
                  </View>
                )}
                
                {minValue > 0 && (
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: colors.medium, fontSize: 12 }}>Min ({minYear})</Text>
                    <Text style={{ 
                      color: colors.dark, 
                      fontWeight: 'bold', 
                      fontSize: 16 
                    }}>
                      ₹{minValue.toLocaleString('en-IN')}
                    </Text>
                  </View>
                )}
              </View>
            );
          })()}
        </View>
        {/* Asset Allocation Cards */}
        <Text style={[styles.sectionTitle, { color: colors.dark }]}>Asset Allocation</Text>
        {/* Overall Profit/Loss Card */}
        <View style={[styles.profitLossCard, { backgroundColor: colors.card, ...shadows.sm }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.profitLossLabel, { color: colors.medium }]}>Overall Profit/Loss</Text>
            <Text style={[styles.profitLossValue, { color: totalProfit >= 0 ? '#10b981' : '#ef4444' }]}>
              ₹{totalProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Text>
          </View>
          <View style={[
            styles.percentageBadge, 
            { backgroundColor: totalProfitPercentage >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }
          ]}>
            <Text style={{ 
              color: totalProfitPercentage >= 0 ? '#10b981' : '#ef4444',
              fontWeight: 'bold'
            }}>
              {totalProfitPercentage >= 0 ? '+' : ''}{totalProfitPercentage.toFixed(2)}%
            </Text>
          </View>
        </View>
        
        {/* Asset Allocation Grid - Redesigned */}
        <View style={{ marginVertical: 10 }}>
          <Text style={[styles.sectionTitle, { color: colors.dark, marginBottom: 16 }]}>Asset Portfolio</Text>
          
          <View style={{ 
            flexDirection: 'row', 
            flexWrap: 'wrap', 
            justifyContent: 'space-between',
            paddingHorizontal: 4,
          }}>
            {assetAlloc.map((asset, idx) => {
              // Find all investments of this type
              const assetInvestments = investments.filter(inv => 
                inv.investmentType === asset.type || inv.type === asset.type
              );
              
              // Calculate total invested amount and current value for this asset type
              const investedAmount = assetInvestments.reduce((sum, inv) => sum + Number(inv.amount), 0);
              const currentValue = assetInvestments.reduce((sum, inv) => sum + Number(inv.currentValue || inv.amount), 0);
              
              // Calculate profit/loss and percentage
              const profit = currentValue - investedAmount;
              const profitPercentage = investedAmount > 0 ? (profit / investedAmount) * 100 : 0;
              
              // Calculate percentage of total portfolio
              const portfolioPercentage = totalValue > 0 ? (investedAmount / totalValue) * 100 : 0;
              
              return (
                <View key={asset.type} style={{ width: '48%', marginBottom: 16 }}>
                  <TouchableOpacity 
                    style={{
                      backgroundColor: colors.card,
                      borderRadius: 16,
                      padding: 16,
                      ...shadows.sm,
                      minHeight: 150,
                      position: 'relative',
                    }}
                    onPress={() => {
                      // Only show update modal if there are investments of this type
                      if (assetInvestments.length > 0) {
                        setSelectedAssetType(asset.type);
                        setShowUpdateModal(true);
                      } else {
                        alert(`No ${asset.type} investments to update.`);
                      }
                    }}
                  >
                    <View style={{ 
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginBottom: 14
                    }}>
                      <View style={{ 
                        width: 40, 
                        height: 40, 
                        borderRadius: 12, 
                        backgroundColor: asset.color + '20',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: 10
                      }}> 
                        <Ionicons name={asset.icon} size={20} color={asset.color} />
                      </View>
                      
                      <Text style={{ 
                        fontSize: 16, 
                        fontWeight: '600', 
                        color: colors.dark,
                        flex: 1,
                      }}>
                        {asset.type}
                      </Text>
                    </View>
                    
                    <Text style={{ 
                      fontSize: 22, 
                      fontWeight: 'bold', 
                      color: colors.primary, 
                      marginBottom: 10 
                    }}>
                      ₹{currentValue.toLocaleString('en-IN')}
                    </Text>
                    
                    {investedAmount > 0 && (
                      <>
                        <View style={{ 
                          flexDirection: 'row', 
                          alignItems: 'center', 
                          justifyContent: 'space-between'
                        }}>
                          <View style={{ 
                            backgroundColor: profitPercentage >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 12,
                            flexDirection: 'row',
                            alignItems: 'center',
                          }}>
                            <Ionicons 
                              name={profitPercentage >= 0 ? "trending-up" : "trending-down"} 
                              size={14} 
                              color={profitPercentage >= 0 ? '#10b981' : '#ef4444'} 
                              style={{ marginRight: 4 }}
                            />
                            <Text style={{ 
                              fontSize: 13, 
                              fontWeight: '600',
                              color: profitPercentage >= 0 ? '#10b981' : '#ef4444',
                            }}>
                              {profitPercentage >= 0 ? '+' : ''}{profitPercentage.toFixed(1)}%
                            </Text>
                          </View>
                        </View>
                      </>
                    )}
                    
                    {assetInvestments.length > 0 && (
                      <TouchableOpacity 
                        style={{ 
                          backgroundColor: '#38bdf8', // Changed from colors.primary to sky blue
                          width: 28,
                          height: 28,
                          borderRadius: 14,
                          justifyContent: 'center',
                          alignItems: 'center',
                          position: 'absolute',
                          bottom: 16,
                          right: 16,
                        }}
                        onPress={(e) => {
                          e.stopPropagation();
                          setSelectedAssetType(asset.type);
                          setShowUpdateModal(true);
                        }}
                      >
                        <Ionicons name="refresh-outline" size={16} color={colors.white} />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </View>
        {/* Pie Chart for Asset Allocation */}
        <Text style={[styles.sectionTitle, { color: colors.dark }]}>Asset Allocation Breakdown</Text>
        <PieChart
          data={assetAlloc.map(asset => ({
            name:
              asset.type === 'Mutual Funds' ? 'MF'
              : asset.type === 'Fixed Deposit' ? 'FD'
              : asset.type,
            population: asset.value,
            color: asset.color,
            legendFontColor: isDarkMode ? colors.light : '#333',
            legendFontSize: 13,
          }))}
          width={Dimensions.get('window').width - 100}
          height={160}
          chartConfig={{
            color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
            propsForLabels: { numberOfLines: 2, fontSize: 13 },
            propsForBackgroundLines: {},
            propsForDots: {},
            decimalPlaces: 0,
            percentage: true,
          }}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="0"
          absolute
          hasLegend={true}
          avoidFalseZero
          showValuesOnAbsolute={false}
          center={[0, 0]}
        />
        {/* Asset Type Trend - Redesigned */}
        <View style={{
          backgroundColor: colors.card,
          borderRadius: 16,
          padding: 20,
          marginTop: 24,
          marginBottom: 120,
          ...shadows.sm
        }}>
          <Text style={{ 
            fontSize: 18, 
            fontWeight: '600', 
            color: colors.dark,
            marginBottom: 16
          }}>
            Asset Type Trend
          </Text>

          {/* Asset Type Selector */}
          <ScrollView 
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ 
              paddingBottom: 10,
              marginBottom: 10 
            }}
          >
            {assetAlloc.map((asset, idx) => (
              <TouchableOpacity
                key={asset.type}
                style={{
                  backgroundColor: selectedAssetIdx === idx 
                    ? asset.color 
                    : isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.03)',
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  borderRadius: 24,
                  marginRight: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  ...selectedAssetIdx === idx ? shadows.sm : {}
                }}
                onPress={() => setSelectedAssetIdx(idx)}
              >
                <View style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: selectedAssetIdx === idx 
                    ? 'rgba(255,255,255,0.2)' 
                    : (asset.color + '20'),
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 8
                }}>
                  <Ionicons 
                    name={asset.icon} 
                    size={16} 
                    color={selectedAssetIdx === idx ? '#fff' : asset.color} 
                  />
                </View>
                <Text style={{ 
                  color: selectedAssetIdx === idx ? '#fff' : isDarkMode ? colors.light : colors.dark, 
                  fontWeight: '600', 
                  fontSize: 14 
                }}>
                  {asset.type}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          {/* Asset Summary */}
          {(() => {
            const selectedAsset = assetAlloc[selectedAssetIdx];
            const assetInvestments = investments.filter(inv => 
              inv.investmentType === selectedAsset.type || inv.type === selectedAsset.type
            );
            
            const totalInvested = assetInvestments.reduce((sum, inv) => sum + Number(inv.amount), 0);
            const currentValue = assetInvestments.reduce((sum, inv) => sum + Number(inv.currentValue || inv.amount), 0);
            const profit = currentValue - totalInvested;
            const profitPercentage = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;
            
            return (
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginBottom: 20,
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                borderRadius: 12,
                padding: 16
              }}>
                <View>
                  <Text style={{ fontSize: 13, color: colors.medium, marginBottom: 4 }}>Total Invested</Text>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.dark }}>
                    ₹{totalInvested.toLocaleString('en-IN')}
                  </Text>
                </View>
                
                {totalInvested > 0 && (
                  <View style={{
                    backgroundColor: profitPercentage >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    alignSelf: 'flex-start'
                  }}>
                    <Ionicons 
                      name={profitPercentage >= 0 ? "trending-up" : "trending-down"} 
                      size={16} 
                      color={profitPercentage >= 0 ? '#10b981' : '#ef4444'} 
                      style={{ marginRight: 6 }}
                    />
                    <Text style={{ 
                      fontSize: 14, 
                      fontWeight: '600',
                      color: profitPercentage >= 0 ? '#10b981' : '#ef4444',
                    }}>
                      {profitPercentage >= 0 ? '+' : ''}{profitPercentage.toFixed(1)}%
                    </Text>
                  </View>
                )}
              </View>
            );
          })()}
          
          {/* Line Chart */}
          <LineChart
            data={{
              labels: years,
              datasets: [
                {
                  data: assetYearData[selectedAssetIdx]?.filter(value => value !== undefined) || [0],
                  color: () => assetAlloc[selectedAssetIdx]?.color || colors.primary,
                  strokeWidth: 2.5,
                },
              ],
            }}
            width={Dimensions.get('window').width - 80}
            height={220}
            yAxisLabel="₹"
            chartConfig={{
              backgroundColor: 'transparent',
              backgroundGradientFrom: colors.card,
              backgroundGradientTo: colors.card,
              decimalPlaces: 0,
              color: (opacity = 1) => assetAlloc[selectedAssetIdx]?.color || colors.primary,
              labelColor: (opacity = 1) => `rgba(${isDarkMode ? '255, 255, 255' : '31, 41, 55'}, ${opacity})`,
              style: { borderRadius: 16 },
              propsForDots: {
                r: '6',
                strokeWidth: '2',
                stroke: assetAlloc[selectedAssetIdx]?.color || colors.primary,
              },
              propsForBackgroundLines: {
                strokeDasharray: '6, 6',
                stroke: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              },
              fillShadowGradient: assetAlloc[selectedAssetIdx]?.color || colors.primary,
              fillShadowGradientOpacity: 0.2,
            }}
            bezier
            withVerticalLines={false}
            withHorizontalLines={true}
            withInnerLines={false}
            withOuterLines={true}
            style={{ 
              borderRadius: 8,
              marginBottom: 10
            }}
          />
          
          {/* Year Range Stats */}
          {(() => {
            const yearData = assetYearData[selectedAssetIdx] || [0];
            const yearValues = yearData.filter(v => v > 0);
            
            // Skip if no data
            if (yearValues.length === 0) {
              return (
                <View style={{
                  padding: 16,
                  alignItems: 'center',
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                  borderRadius: 12,
                  marginTop: 15
                }}>
                  <Text style={{ color: colors.medium, fontSize: 14 }}>No investment data available</Text>
                </View>
              );
            }
            
            const startVal = yearValues[0] || 0;
            const endVal = yearValues[yearValues.length - 1] || 0;
            const maxVal = Math.max(...yearValues);
            const maxYear = years[yearData.indexOf(maxVal)];
            
            // Calculate growth
            const growth = startVal > 0 ? ((endVal - startVal) / startVal) * 100 : 0;
            
            return (
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginTop: 20,
              }}>
                <View style={{
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                  borderRadius: 12,
                  padding: 12,
                  flex: 1,
                  marginRight: 8
                }}>
                  <Text style={{ fontSize: 13, color: colors.medium, marginBottom: 2 }}>Peak ({maxYear})</Text>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.dark }}>
                    ₹{maxVal.toLocaleString('en-IN')}
                  </Text>
                </View>
                
                <View style={{
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                  borderRadius: 12,
                  padding: 12,
                  flex: 1
                }}>
                  <Text style={{ fontSize: 13, color: colors.medium, marginBottom: 2 }}>Growth</Text>
                  <Text style={{ 
                    fontSize: 16, 
                    fontWeight: 'bold', 
                    color: growth >= 0 ? '#10b981' : '#ef4444'
                  }}>
                    {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
                  </Text>
                </View>
              </View>
            );
          })()}
        </View>
      </ScrollView>
      
      {/* Add Investment Modal */}
      <Modal visible={showAddModal} animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <AddInvestmentForm onClose={() => setShowAddModal(false)} onAdded={fetchInvestments} />
      </Modal>
      <BottomNavBar />
      {/* Add some empty space at the bottom for better scroll padding */}
      <View style={{ height: 100 }} />
      {/* Update Investment Modal */}
      <Modal visible={showUpdateModal} animationType="slide" onRequestClose={() => setShowUpdateModal(false)}>
        <UpdateInvestmentValueForm onClose={() => setShowUpdateModal(false)} onUpdated={fetchInvestments} assetType={selectedAssetType} />
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  portfolioCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  portfolioLabel: {
    fontSize: 16,
    marginBottom: 6,
  },
  portfolioValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 20,
  },
  assetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
  },
  assetIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  assetType: {
    fontSize: 16,
    fontWeight: '500',
  },
  assetValue: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 2,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 80,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profitLossCard: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profitLossLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  profitLossValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  percentageBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});