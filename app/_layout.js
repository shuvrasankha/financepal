import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, useColorScheme, TouchableOpacity } from 'react-native';
import { StyleSheet } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import Theme from '../constants/Theme';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { ExpenseProvider } from '../contexts/ExpenseContext';
import { BudgetProvider } from '../contexts/BudgetContext';
import { ErrorProvider } from '../contexts/ErrorContext';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import ResponsiveNavBar from './components/ResponsiveNavBar';
import { Platform } from 'react-native';

// Wrap the Stack with ThemeContext
function AppNavigator() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { isDarkMode } = useTheme();
  const isWeb = Platform.OS === 'web';
  
  // Get theme-specific colors and styles
  const colors = isDarkMode ? Theme.dark.colors : Theme.light.colors;
  const shadows = isDarkMode ? Theme.shadowsDark : Theme.shadows;

  useEffect(() => {
    // Check authentication state
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    // Show a simple loading indicator while checking auth state
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const StackNavigator = () => (
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

  // For web, wrap the Stack with ResponsiveNavBar
  if (isWeb && user) {
    return (
      <ResponsiveNavBar>
        <StackNavigator />
      </ResponsiveNavBar>
    );
  }
  
  // For non-web or non-authenticated, just return the Stack
  return <StackNavigator />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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