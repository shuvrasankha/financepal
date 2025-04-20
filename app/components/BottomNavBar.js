import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

const BottomNavBar = () => {
  const nav = useNavigation();
  const route = useRoute();
  const active = route.name;
  const navItems = [
    { name: 'index', icon: 'home-outline', label: 'Home' },
    { name: 'expense', icon: 'wallet-outline', label: 'Expenses' },
    { name: 'expenseAnalysis', icon: 'bar-chart-outline', label: 'Analysis' },
    { name: 'settings', icon: 'settings-outline', label: 'Settings' },
  ];
  return (
    <LinearGradient
      colors={["#e0e7ffcc", "#f0fdf4cc"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        height: 70,
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        marginHorizontal: 10,
        marginBottom: 8,
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.10,
        shadowRadius: 12,
        elevation: 12,
        backgroundColor: 'transparent',
      }}
    >
      {navItems.map(item => (
        <TouchableOpacity
          key={item.name}
          onPress={() => nav.navigate(item.name)}
          accessibilityLabel={item.label}
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            borderRadius: 16,
            paddingVertical: 6,
            backgroundColor: active === item.name ? '#6366f1' : 'transparent',
            marginHorizontal: 6,
            shadowColor: active === item.name ? '#6366f1' : 'transparent',
            shadowOpacity: active === item.name ? 0.12 : 0,
            shadowRadius: 8,
          }}
        >
          <Ionicons
            name={item.icon}
            size={28}
            color={active === item.name ? '#fff' : '#6366f1'}
          />
        </TouchableOpacity>
      ))}
    </LinearGradient>
  );
};

export default BottomNavBar;
