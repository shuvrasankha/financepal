import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, useColorScheme, TouchableOpacity } from 'react-native';
import { StyleSheet } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
// Remove LocalAuthentication import
// import * as LocalAuthentication from 'expo-local-authentication';
// Remove AsyncStorage import if no longer needed elsewhere, or keep if used for other things
// import AsyncStorage from '@react-native-async-storage/async-storage';
import Theme from '../constants/Theme';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { ExpenseProvider } from '../contexts/ExpenseContext';
import { BudgetProvider } from '../contexts/BudgetContext';
import { ErrorProvider } from '../contexts/ErrorContext';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

// Wrap the Stack with ThemeContext
function AppNavigator() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // Remove locked state
  // const [locked, setLocked] = useState(false);
  const { isDarkMode } = useTheme();
  
  // Get theme-specific colors and styles
  const colors = isDarkMode ? Theme.dark.colors : Theme.light.colors;
  const shadows = isDarkMode ? Theme.shadowsDark : Theme.shadows;

  useEffect(() => {
    // Check authentication state
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      // Remove app lock logic
      setLoading(false); // Directly set loading to false after auth check
    });

    return unsubscribe;
  }, []);

  // Remove the locked screen logic
  if (loading) {
    // Show a simple loading indicator while checking auth state
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="index" />
            <Stack.Screen name="expense" />
            <Stack.Screen name="budget" />
            <Stack.Screen name="lending" />
            <Stack.Screen name="investment" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="expenseAnalysis" />
          </>
        ) : (
          <>
            <Stack.Screen name="login" />
            <Stack.Screen name="signup" />
          </>
        )}
      </Stack>
    </>
  );
}

// ... rest of the file (styles, RootLayoutNav) remains the same
// Make sure to remove the styles related to the locked screen if they exist

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Remove locked screen styles if they exist
});

export default function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider>
      <ErrorProvider>
        <ExpenseProvider>
          <BudgetProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <AppNavigator />
            </GestureHandlerRootView>
          </BudgetProvider>
        </ExpenseProvider>
      </ErrorProvider>
    </ThemeProvider>
  );
}