import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Platform, useWindowDimensions } from 'react-native';
import { useNavigation, useRoute, NavigationContainer } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import Theme from '../../constants/Theme';

const WebNavBar = () => {
  // Use try/catch to handle cases when not inside a navigator
  let nav;
  let route;
  let active = 'index'; // Default to index if no route

  try {
    nav = useNavigation();
    route = useRoute();
    active = route?.name || 'index';
  } catch (error) {
    console.log('Navigation context not available:', error);
    // We'll use default navigation functions below
  }

  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const dimensions = useWindowDimensions();
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Get theme-specific colors
  const colors = isDarkMode ? Theme.dark.colors : Theme.light.colors;

  // Navigation items with matching icons from the screenshot
  const navItems = [
    { name: 'index', icon: 'home-outline', activeIcon: 'home', label: 'Home' },
    { name: 'expense', icon: 'wallet-outline', activeIcon: 'wallet', label: 'Expense' },
    { name: 'budget', icon: 'grid-outline', activeIcon: 'grid', label: 'Budget' },
    { name: 'investment', icon: 'trending-up-outline', activeIcon: 'trending-up', label: 'Invest' },
    { name: 'settings', icon: 'settings-outline', activeIcon: 'settings', label: 'More' },
  ];

  // Safe navigation function
  const navigateTo = (screenName) => {
    if (nav) {
      nav.navigate(screenName);
    } else {
      // Fallback for when navigation is not available
      window.location.href = `/${screenName === 'index' ? '' : screenName}`;
    }
  };

  // Determine if we're on a mobile or desktop view
  const isDesktop = dimensions.width > 768;
  const isMobile = dimensions.width <= 768;

  // For mobile view with hamburger menu
  const renderMobileNav = () => {
    return (
      <View style={styles.navContainer}>
        <View style={[
          styles.mobileTopBar,
          { backgroundColor: '#1a2235' }
        ]}>
          <Text style={styles.brandText}>FinancePal</Text>
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={() => setMenuOpen(!menuOpen)}
          >
            <Ionicons 
              name={menuOpen ? "close-outline" : "menu-outline"} 
              size={28} 
              color={'rgba(255,255,255,0.9)'} 
            />
          </TouchableOpacity>
        </View>
        
        {menuOpen && (
          <View style={[
            styles.mobileMenu,
            { backgroundColor: '#1a2235' }
          ]}>
            {navItems.map(item => {
              const isActive = active === item.name;
              return (
                <TouchableOpacity
                  key={item.name}
                  onPress={() => {
                    navigateTo(item.name);
                    setMenuOpen(false);
                  }}
                  accessibilityLabel={item.label}
                  style={[
                    styles.mobileMenuItem,
                    isActive && { backgroundColor: `rgba(99, 102, 241, 0.15)` }
                  ]}
                >
                  <Ionicons
                    name={isActive ? item.activeIcon : item.icon}
                    size={22}
                    color={isActive ? '#6366f1' : 'rgba(255,255,255,0.7)'}
                    style={styles.mobileMenuIcon}
                  />
                  <Text style={[
                    styles.mobileMenuText,
                    { color: isActive ? '#6366f1' : 'rgba(255,255,255,0.8)' }
                  ]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  // For desktop view, render a horizontal top navigation matching the screenshot
  const renderDesktopNav = () => {
    return (
      <View style={[styles.desktopTopBar]}>
        <View style={styles.desktopTopBarContent}>
          <Text style={styles.brandText}>FinancePal</Text>
          
          <View style={styles.desktopNavItems}>
            {navItems.map(item => {
              const isActive = active === item.name;
              return (
                <TouchableOpacity
                  key={item.name}
                  onPress={() => navigateTo(item.name)}
                  accessibilityLabel={item.label}
                  style={[
                    styles.desktopNavItem,
                    isActive && styles.desktopNavItemActive
                  ]}
                >
                  <Ionicons
                    name={isActive ? item.activeIcon : item.icon}
                    size={20}
                    color={isActive ? '#6366f1' : 'rgba(255,255,255,0.7)'}
                    style={styles.desktopIcon}
                  />
                  <Text style={[
                    styles.desktopNavLabel,
                    { color: isActive ? '#6366f1' : 'rgba(255,255,255,0.7)' }
                  ]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    );
  };

  // Determine which navigation style to render based on screen width
  return isDesktop ? renderDesktopNav() : renderMobileNav();
};

const styles = StyleSheet.create({
  // Mobile styles (hamburger menu)
  navContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  mobileTopBar: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1000,
  },
  brandText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  menuButton: {
    padding: 8,
  },
  mobileMenu: {
    position: 'fixed',
    top: 60, // Below the top bar
    left: 0,
    right: 0,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  mobileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  mobileMenuIcon: {
    marginRight: 16,
  },
  mobileMenuText: {
    fontSize: 16,
    fontWeight: '500',
  },
  
  // Desktop styles (full top navigation - matching the screenshot)
  desktopTopBar: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: 54,
    backgroundColor: '#1a2235',
    zIndex: 1000,
  },
  desktopTopBarContent: {
    maxWidth: 1280,
    margin: '0 auto',
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '100%',
  },
  desktopNavItems: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  desktopNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 24,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  desktopNavItemActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  desktopIcon: {
    marginRight: 8,
  },
  desktopNavLabel: {
    fontSize: 15,
    fontWeight: '500',
  }
});

export default WebNavBar;