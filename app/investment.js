import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomNavBar from './components/BottomNavBar';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { db, auth } from '../firebase';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { useTheme } from '../contexts/ThemeContext';
import Theme from '../constants/Theme';

const ASSET_TYPES = [
  { type: 'Stocks', color: '#6366f1', icon: 'trending-up-outline', value: 120000 },
  { type: 'Mutual Funds', color: '#10b981', icon: 'pie-chart-outline', value: 80000 },
  { type: 'Gold', color: '#f59e0b', icon: 'sparkles-outline', value: 30000 },
  { type: 'Fixed Deposit', color: '#ef4444', icon: 'cash-outline', value: 50000 },
  { type: 'Others', color: '#3b82f6', icon: 'cube-outline', value: 10000 },
  { type: 'Crypto', color: '#a855f7', icon: 'logo-bitcoin', value: 20000 },
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
      await addDoc(collection(db, 'investments'), {
        userId: user.uid,
        amount: Number(form.amount),
        type: form.investmentType, // Changed to 'type' to match Firebase rules
        investmentType: form.investmentType, // Keep this for backward compatibility
        dateInvested: form.dateInvested,
        note: form.note,
        stockName: form.stockName,
        mfName: form.mfName,
        createdAt: new Date().toISOString(), // Store as ISO string with full datetime
      });
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

export default function Investment() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedAssetIdx, setSelectedAssetIdx] = useState(0);
  const [investments, setInvestments] = useState([]);
  const [refresh, setRefresh] = useState(false); // Add a refresh state

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
      const q = query(collection(db, 'investments'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        ...doc.data(),
        createdAt: doc.data().createdAt || '',
      }));

      // Group investments by category
      const grouped = {};
      data.forEach(inv => {
        const type = inv.investmentType;
        if (!grouped[type]) grouped[type] = [];
        grouped[type].push(inv);
      });

      // For each category, filter to only those with valid createdAt, then pick the one with the latest createdAt
      const latestInvestments = Object.values(grouped).map(invs => {
        const valid = invs.filter(inv => inv.createdAt && !isNaN(Date.parse(inv.createdAt)));
        if (valid.length === 0) return null;
        return valid.reduce((latest, inv) => new Date(inv.createdAt) > new Date(latest.createdAt) ? inv : latest, valid[0]);
      }).filter(Boolean);

      setInvestments(latestInvestments);
    } catch (e) {
      setInvestments([]);
    }
  };

  React.useEffect(() => {
    fetchInvestments();
  }, []);

  // Calculate total portfolio value from fetched investments
  const totalValue = investments.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);

  // Calculate asset allocation from fetched investments
  const assetAlloc = ASSET_TYPES.map(asset => {
    // Find the latest investment for this asset type
    const inv = investments.find(i => i.investmentType === asset.type);
    return {
      ...asset,
      value: inv ? Number(inv.amount) : 0
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
      return investments.filter(inv => inv.investmentType === asset.type && inv.dateInvested?.startsWith(year))
        .reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
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
        {/* Yearly Line Graph */}
        <Text style={[styles.sectionTitle, { color: colors.dark }]}>Yearly Portfolio Growth</Text>
        <LineChart
          data={{
            labels: years,
            datasets: [
              {
                data: years.map(year =>
                  investments.filter(inv => inv.dateInvested?.startsWith(year)).reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0)
                ),
                color: () => colors.primary,
                strokeWidth: 2,
              },
            ],
          }}
          width={Dimensions.get('window').width - 40}
          height={220}
          yAxisLabel="₹"
          yAxisSuffix=""
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
          style={{ marginVertical: 12, borderRadius: 12, ...shadows.sm }}
        />
        {/* Asset Allocation Cards */}
        <Text style={[styles.sectionTitle, { color: colors.dark }]}>Asset Allocation</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {assetAlloc.map((asset, idx) => (
            <View key={asset.type} style={{ width: '48%', marginBottom: 14 }}>
              <View style={[styles.assetCard, { backgroundColor: colors.card, ...shadows.sm }]}>
                <View style={[styles.assetIcon, { backgroundColor: asset.color + '22' }]}> 
                  <Ionicons name={asset.icon} size={24} color={asset.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.assetType, { color: colors.dark }]}>{asset.type}</Text>
                  <Text style={[styles.assetValue, { color: colors.primary }]}>₹{asset.value.toLocaleString('en-IN')}</Text>
                </View>
              </View>
            </View>
          ))}
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
        {/* Toggleable Line Graph for Each Asset Type */}
        <Text style={[styles.sectionTitle, { color: colors.dark }]}>Asset Type Trend</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
          {assetAlloc.map((asset, idx) => (
            <TouchableOpacity
              key={asset.type}
              style={{
                backgroundColor: selectedAssetIdx === idx ? asset.color : isDarkMode ? 'rgba(255,255,255,0.1)' : '#f3f4f6',
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: 20,
                marginRight: 8,
                marginBottom: 8,
                flexDirection: 'row',
                alignItems: 'center',
              }}
              onPress={() => setSelectedAssetIdx(idx)}
            >
              <Ionicons name={asset.icon} size={16} color={selectedAssetIdx === idx ? '#fff' : asset.color} style={{ marginRight: 6 }} />
              <Text style={{ color: selectedAssetIdx === idx ? '#fff' : isDarkMode ? colors.light : '#222', fontWeight: 'bold', fontSize: 14 }}>{asset.type}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <LineChart
          data={{
            labels: years,
            datasets: [
              {
                data: assetYearData[selectedAssetIdx],
                color: () => assetAlloc[selectedAssetIdx]?.color || colors.primary,
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
            color: (opacity = 1) => (assetAlloc[selectedAssetIdx]?.color || colors.primary) + Math.floor(opacity * 255).toString(16),
            labelColor: (opacity = 1) => `rgba(${isDarkMode ? '255, 255, 255' : '31, 41, 55'}, ${opacity})`,
            style: { borderRadius: 16 },
            propsForDots: {
              r: '5',
              strokeWidth: '2',
              stroke: assetAlloc[selectedAssetIdx]?.color || colors.primary,
            },
          }}
          bezier
          style={{ marginVertical: 8, borderRadius: 12, ...shadows.sm }}
        />
      </ScrollView>
      
      {/* Add Investment Modal */}
      <Modal visible={showAddModal} animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <AddInvestmentForm onClose={() => setShowAddModal(false)} onAdded={fetchInvestments} />
      </Modal>
      <BottomNavBar />
      {/* Add some empty space at the bottom for better scroll padding */}
      <View style={{ height: 110 }} />
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
});