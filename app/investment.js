import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomNavBar from './components/BottomNavBar';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

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
function AddInvestmentForm({ onClose }) {
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

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = () => {
    if (!form.amount || !form.investmentType) {
      alert('Amount and Investment Type are required.');
      return;
    }
    // Here you would save the investment (API or state update)
    alert('Investment added!');
    onClose();
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', padding: 24 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 18 }}>Add Investment</Text>
      <Text style={{ marginBottom: 8, fontSize: 18 }}>Amount</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
        <Text style={{ fontSize: 20, marginRight: 4 }}>₹</Text>
        <TextInput
          style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, flex: 1, fontSize: 18 }}
          keyboardType="numeric"
          value={form.amount}
          onChangeText={text => handleChange('amount', text.replace(/[^0-9.]/g, ''))}
          placeholder="5000"
        />
      </View>
      <Text style={{ marginBottom: 8, fontSize: 18 }}>Investment Type</Text>
      <TouchableOpacity
        style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 14, marginBottom: 20 }}
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
          <Text style={{ color: form.investmentType ? '#222' : '#aaa', fontSize: 18 }}>
            {form.investmentType || 'Select Investment Type'}
          </Text>
        </View>
      </TouchableOpacity>
      <Modal visible={showTypeModal} transparent animationType="fade">
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setShowTypeModal(false)}>
          <View style={{ backgroundColor: '#fff', borderRadius: 8, padding: 18, width: 280 }}>
            {INVESTMENT_TYPES.map(type => (
              <TouchableOpacity key={type.label} style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }} onPress={() => { handleChange('investmentType', type.label); setShowTypeModal(false); }}>
                <Ionicons name={type.icon} size={22} color={type.color} style={{ marginRight: 14 }} />
                <Text style={{ fontSize: 18 }}>{type.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
      {/* Show Stock Name input if Stock is selected */}
      {form.investmentType === 'Stocks' && (
        <View style={{ marginBottom: 20 }}>
          <Text style={{ marginBottom: 8, fontSize: 18 }}>Stock Name</Text>
          <TextInput
            style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, fontSize: 18 }}
            value={form.stockName}
            onChangeText={text => handleChange('stockName', text)}
            placeholder="Enter stock name"
          />
        </View>
      )}
      {/* Show Mutual Fund Name input if Mutual Funds is selected */}
      {form.investmentType === 'Mutual Funds' && (
        <View style={{ marginBottom: 20 }}>
          <Text style={{ marginBottom: 8, fontSize: 18 }}>Mutual Fund Name</Text>
          <TextInput
            style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, fontSize: 18 }}
            value={form.mfName}
            onChangeText={text => handleChange('mfName', text)}
            placeholder="Enter mutual fund name"
          />
        </View>
      )}
      <Text style={{ marginBottom: 8, fontSize: 18 }}>Date Invested</Text>
      <TouchableOpacity
        style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 14, marginBottom: 20 }}
        onPress={() => setShowDatePicker(true)}
      >
        <Text style={{ color: '#222', fontSize: 18 }}>{form.dateInvested}</Text>
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
      <Text style={{ marginBottom: 8, fontSize: 18 }}>Note (optional)</Text>
      <TextInput
        style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, marginBottom: 28, fontSize: 18 }}
        value={form.note}
        onChangeText={text => handleChange('note', text)}
        placeholder="Any note..."
        multiline
      />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: '#6366f1', padding: 16, borderRadius: 8, alignItems: 'center', marginRight: 10, flexDirection: 'row', justifyContent: 'center' }} onPress={handleSubmit}>
          <Ionicons name="checkmark-circle-outline" size={22} color="#fff" style={{ marginRight: 8 }} />
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>Save</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose} style={{ flex: 1, backgroundColor: '#fee2e2', padding: 16, borderRadius: 8, alignItems: 'center', marginLeft: 10, flexDirection: 'row', justifyContent: 'center' }}>
          <Ionicons name="close-circle-outline" size={22} color="#ef4444" style={{ marginRight: 8 }} />
          <Text style={{ color: '#ef4444', fontWeight: 'bold', fontSize: 18 }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function Investment() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedAssetIdx, setSelectedAssetIdx] = useState(0);

  // Calculate total portfolio value
  const totalValue = ASSET_TYPES.reduce((sum, asset) => sum + asset.value, 0);

  // Example yearly data (replace with real data as needed)
  const yearlyLabels = [
    '2019', '2020', '2021', '2022', '2023', '2024', '2025'
  ];
  const yearlyData = [
    20000, 40000, 70000, 120000, 180000, 250000, 290000
  ];

  // Example asset-specific yearly data (replace with real data as needed)
  const assetYearLabels = [
    '2019', '2020', '2021', '2022', '2023', '2024', '2025'
  ];
  const assetYearData = [
    [5000, 10000, 20000, 40000, 60000, 80000, 100000], // Stocks
    [3000, 6000, 12000, 24000, 36000, 48000, 60000], // Mutual Funds
    [1000, 2000, 4000, 8000, 12000, 16000, 20000], // Gold
    [2000, 4000, 8000, 16000, 24000, 32000, 40000], // Fixed Deposit
    [500, 1000, 2000, 4000, 6000, 8000, 10000], // Others
    [1000, 2000, 4000, 8000, 12000, 16000, 20000], // Crypto
  ];

  return (
    <>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Investments</Text>
        {/* Portfolio Value Card */}
        <View style={styles.portfolioCard}>
          <Text style={styles.portfolioLabel}>Portfolio Value</Text>
          <Text style={styles.portfolioValue}>₹{totalValue.toLocaleString('en-IN')}</Text>
        </View>
        {/* Yearly Line Graph */}
        <Text style={styles.sectionTitle}>Yearly Portfolio Growth</Text>
        <LineChart
          data={{
            labels: yearlyLabels,
            datasets: [
              {
                data: yearlyData,
                color: () => '#6366f1',
                strokeWidth: 2,
              },
            ],
          }}
          width={Dimensions.get('window').width - 40}
          height={220}
          yAxisLabel="₹"
          yAxisSuffix=""
          chartConfig={{
            backgroundColor: '#fff',
            backgroundGradientFrom: '#f9f9f9',
            backgroundGradientTo: '#f9f9f9',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(31, 41, 55, ${opacity})`,
            style: { borderRadius: 16 },
            propsForDots: {
              r: '5',
              strokeWidth: '2',
              stroke: '#6366f1',
            },
          }}
          bezier
          style={{ marginVertical: 12, borderRadius: 12 }}
        />
        {/* Asset Allocation Cards */}
        <Text style={styles.sectionTitle}>Asset Allocation</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {ASSET_TYPES.map((asset, idx) => (
            <View key={asset.type} style={{ width: '48%', marginBottom: 14 }}>
              <View style={styles.assetCard}>
                <View style={[styles.assetIcon, { backgroundColor: asset.color + '22' }]}> 
                  <Ionicons name={asset.icon} size={24} color={asset.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.assetType}>{asset.type}</Text>
                  <Text style={styles.assetValue}>₹{asset.value.toLocaleString('en-IN')}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
        {/* Pie Chart for Asset Allocation */}
        <Text style={styles.sectionTitle}>Asset Allocation Breakdown</Text>
        <PieChart
          data={ASSET_TYPES.map(asset => ({
            name:
              asset.type === 'Mutual Funds' ? 'MF'
              : asset.type === 'Fixed Deposit' ? 'FD'
              : asset.type,
            population: asset.value,
            color: asset.color,
            legendFontColor: '#333',
            legendFontSize: 13,
          }))}
          width={Dimensions.get('window').width - 100}
          height={160}
          chartConfig={{
            color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
            propsForLabels: { numberOfLines: 2, fontSize: 13 },
          }}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="0"
          absolute
          hasLegend={true}
          avoidFalseZero
        />
        {/* Toggleable Line Graph for Each Asset Type */}
        <Text style={styles.sectionTitle}>Asset Type Trend</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
          {ASSET_TYPES.map((asset, idx) => (
            <TouchableOpacity
              key={asset.type}
              style={{
                backgroundColor: selectedAssetIdx === idx ? asset.color : '#f3f4f6',
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
              <Text style={{ color: selectedAssetIdx === idx ? '#fff' : '#222', fontWeight: 'bold', fontSize: 14 }}>{asset.type}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <LineChart
          data={{
            labels: assetYearLabels,
            datasets: [
              {
                data: assetYearData[selectedAssetIdx],
                color: () => ASSET_TYPES[selectedAssetIdx].color,
                strokeWidth: 2,
              },
            ],
          }}
          width={Dimensions.get('window').width - 40}
          height={200}
          yAxisLabel="₹"
          chartConfig={{
            backgroundColor: '#fff',
            backgroundGradientFrom: '#f9f9f9',
            backgroundGradientTo: '#f9f9f9',
            decimalPlaces: 0,
            color: (opacity = 1) => ASSET_TYPES[selectedAssetIdx].color + Math.floor(opacity * 255).toString(16),
            labelColor: (opacity = 1) => `rgba(31, 41, 55, ${opacity})`,
            style: { borderRadius: 16 },
            propsForDots: {
              r: '5',
              strokeWidth: '2',
              stroke: ASSET_TYPES[selectedAssetIdx].color,
            },
          }}
          bezier
          style={{ marginVertical: 8, borderRadius: 12 }}
        />
      </ScrollView>
      {/* Floating Add Button */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
      {/* Add Investment Modal */}
      <Modal visible={showAddModal} animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <AddInvestmentForm onClose={() => setShowAddModal(false)} />
      </Modal>
      <BottomNavBar />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  portfolioCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  portfolioLabel: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 6,
  },
  portfolioValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#1f2937',
  },
  assetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
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
    color: '#333',
  },
  assetValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6366f1',
    marginTop: 2,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 80,
    backgroundColor: '#6366f1',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
});