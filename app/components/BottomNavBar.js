import React from 'react';
import { View, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Theme from '../../constants/Theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';

const BottomNavBar = () => {
  const nav = useNavigation();
  const route = useRoute();
  const active = route.name;
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  
  // Get theme-specific colors
  const colors = isDarkMode ? Theme.dark.colors : Theme.light.colors;

  const navItems = [
    { name: 'index', icon: 'home', label: 'Home' },
    { name: 'expense', icon: 'wallet', label: 'Expenses' },
    { name: 'budget', icon: 'calculator', label: 'Budget' },
    { name: 'expenseAnalysis', icon: 'bar-chart', label: 'Analysis' },
    { name: 'investment', icon: 'trending-up', label: 'Investment' },
    { name: 'settings', icon: 'settings', label: 'Settings' },
  ];

  const bottomPadding = Platform.OS === 'ios' ? Math.max(insets.bottom, 20) : 0;

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'position' : undefined}
      style={styles.keyboardAvoid}
    >
      <View 
        style={[
          styles.container, 
          { 
            paddingBottom: bottomPadding,
            height: 70 + bottomPadding,
            backgroundColor: colors.card,
            borderTopColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
          }
        ]}
      >
        <LinearGradient
          style={styles.gradient}
          colors={isDarkMode 
            ? [colors.card + 'ee', colors.card] 
            : ['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 1)']}
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
                active === item.name && [
                  styles.activeNavButton,
                  { backgroundColor: colors.primary }
                ]
              ]}
            >
              <Ionicons
                name={item.icon}
                size={24}
                color={active === item.name ? colors.white : colors.primary}
              />
            </TouchableOpacity>
          ))}
        </LinearGradient>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardAvoid: {
    width: '100%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 999,
  },
  container: {
    width: '100%',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 6,
    borderTopWidth: 1,
  },
  gradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
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
    shadowOpacity: 0.12,
    shadowRadius: 8,
  }
});

export default BottomNavBar;
