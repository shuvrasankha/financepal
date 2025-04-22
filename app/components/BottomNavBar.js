import React from 'react';
import { View, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Theme from '../../constants/Theme';

const BottomNavBar = () => {
  const nav = useNavigation();
  const route = useRoute();
  const active = route.name;

  const navItems = [
    { name: 'index', icon: 'home', label: 'Home' },
    { name: 'expense', icon: 'wallet', label: 'Expenses' },
    { name: 'expenseAnalysis', icon: 'bar-chart', label: 'Analysis' },
    { name: 'investment', icon: 'trending-up', label: 'Investment' },
    { name: 'settings', icon: 'settings', label: 'Settings' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        style={styles.container}
        colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 1)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        {navItems.map(item => (
          <TouchableOpacity
            key={item.name}
            onPress={() => nav.navigate(item.name)}
            accessibilityLabel={item.label}
            style={[
              styles.navButton,
              active === item.name && styles.activeNavButton
            ]}
          >
            <Ionicons
              name={item.icon}
              size={24}
              color={active === item.name ? Theme.colors.white : Theme.colors.primary}
            />
          </TouchableOpacity>
        ))}
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 70,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 6,
    backgroundColor: 'transparent',
  },
  navButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    borderRadius: 16,
    paddingVertical: 6,
    backgroundColor: 'transparent',
    marginHorizontal: 6,
  },
  activeNavButton: {
    backgroundColor: Theme.colors.primary,
    shadowColor: Theme.colors.primary,
    shadowOpacity: 0.12,
    shadowRadius: 8,
  }
});

export default BottomNavBar;
