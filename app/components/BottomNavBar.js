import React from 'react';
import { View, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Text } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Theme from '../../constants/Theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import ResponsiveNavBar from './ResponsiveNavBar';

// For backward compatibility, BottomNavBar is now just a wrapper around ResponsiveNavBar
const BottomNavBar = () => {
  // If this is web, we'll use the WebNavBar via ResponsiveNavBar
  if (Platform.OS === 'web') {
    return <ResponsiveNavBar />;
  }
  
  // Otherwise, we'll continue to use the original BottomNavBar implementation
  const nav = useNavigation();
  const route = useRoute();
  const active = route.name;
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  
  // Get theme-specific colors
  const colors = isDarkMode ? Theme.dark.colors : Theme.light.colors;

  const navItems = [
    { name: 'index', icon: 'home-outline', activeIcon: 'home', label: 'Home' },
    { name: 'expense', icon: 'wallet-outline', activeIcon: 'wallet-outline', label: 'Expense' },
    { name: 'budget', icon: 'calculator-outline', activeIcon: 'calculator-outline', label: 'Budget' },
    { name: 'investment', icon: 'trending-up-outline', activeIcon: 'trending-up-outline', label: 'Invest' },
    { name: 'settings', icon: 'settings-outline', activeIcon: 'settings-outline', label: 'More' },
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
            backgroundColor: isDarkMode ? colors.card : '#FFFFFF',
            borderTopColor: isDarkMode ? colors.borderLight : 'rgba(0,0,0,0.05)',
          }
        ]}
      >
        <LinearGradient
          style={styles.gradient}
          colors={isDarkMode 
            ? [colors.card + 'ee', colors.card] 
            : ['#FFFFFF', '#FFFFFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          {navItems.map(item => {
            const isActive = active === item.name;
            return (
              <TouchableOpacity
                key={item.name}
                onPress={() => nav.navigate(item.name)}
                accessibilityLabel={item.label}
                style={styles.navButton}
              >
                <Ionicons
                  name={isActive ? item.activeIcon : item.icon}
                  size={24}
                  color={isActive ? colors.primary : isDarkMode ? colors.medium : '#9E9E9E'}
                />
                <Text style={[
                  styles.navLabel,
                  { 
                    color: isActive ? colors.primary : isDarkMode ? colors.medium : '#9E9E9E',
                    opacity: isActive ? 1 : 0.8
                  }
                ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
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
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 5,
    borderTopWidth: 0.5,
  },
  gradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 5,
  },
  navButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
    paddingVertical: 8,
  },
  navLabel: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  activeNavLabel: {
    fontWeight: '600',
  }
});

export default BottomNavBar;
