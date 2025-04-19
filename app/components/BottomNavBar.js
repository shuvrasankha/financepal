import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const BottomNavBar = () => {
  const nav = useNavigation();
  return (
    <View style={{
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      height: 60,
      backgroundColor: '#fff',
      borderTopWidth: 1,
      borderTopColor: '#e5e7eb',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 8,
    }}>
      <TouchableOpacity onPress={() => nav.navigate('index')} accessibilityLabel="Home">
        <Ionicons name="home-outline" size={28} color="#6366f1" />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => nav.navigate('expense')} accessibilityLabel="Expenses">
        <Ionicons name="wallet-outline" size={28} color="#6366f1" />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => nav.navigate('expenseAnalysis')} accessibilityLabel="Analysis">
        <Ionicons name="bar-chart-outline" size={28} color="#6366f1" />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => nav.navigate('settings')} accessibilityLabel="Settings">
        <Ionicons name="settings-outline" size={28} color="#6366f1" />
      </TouchableOpacity>
    </View>
  );
};

export default BottomNavBar;
