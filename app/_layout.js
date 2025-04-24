import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, useColorScheme, TouchableOpacity } from 'react-native';
import { StyleSheet } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  const [locked, setLocked] = useState(false);
  const { isDarkMode } = useTheme();
  
  // Get theme-specific colors and styles
  const colors = isDarkMode ? Theme.dark.colors : Theme.light.colors;
  const shadows = isDarkMode ? Theme.shadowsDark : Theme.shadows;

  useEffect(() => {
    // Check authentication state
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        // Check if app lock is enabled
        const appLockEnabled = await AsyncStorage.getItem('appLockEnabled');
        if (appLockEnabled === 'true') {
          // Check if device has biometric hardware before attempting authentication
          const compatible = await LocalAuthentication.hasHardwareAsync();
          if (!compatible) {
            console.log('Device does not support biometric authentication');
            setLocked(false);
            setLoading(false);
            return;
          }
          
          // Check if user has enrolled biometrics
          const enrolled = await LocalAuthentication.isEnrolledAsync();
          if (!enrolled) {
            console.log('No biometrics enrolled on this device');
            setLocked(false);
            setLoading(false);
            return;
          }
          
          // User is logged in and app lock is enabled, now authenticate
          try {
            const authResult = await LocalAuthentication.authenticateAsync({
              promptMessage: 'Authenticate to unlock FinancePal',
              fallbackLabel: 'Use passcode to unlock',
              disableDeviceFallback: false,
            });
            
            console.log('Authentication result:', authResult);
            setLocked(!authResult.success);
            setLoading(false);
          } catch (error) {
            console.log('Error with local authentication:', error);
            // In case of error, we should not lock the user out
            setLocked(false);
            setLoading(false);
          }
        } else {
          // App lock is not enabled, so don't lock
          setLocked(false);
          setLoading(false);
        }
      } else {
        // Not logged in, so don't lock
        setLocked(false);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  if (loading || locked) {
    return (
      <View style={[styles.container, { backgroundColor: colors.primary }]}> 
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <View style={{ alignItems: 'center' }}>
          <View style={{ backgroundColor: colors.white, borderRadius: 60, padding: 18, marginBottom: 24 }}>
            <Text style={{ fontSize: 40, color: colors.primary, fontWeight: 'bold' }}>🔒</Text>
          </View>
          <Text style={{ fontSize: 28, color: colors.dark, fontWeight: '700', marginBottom: 8 }}>App Locked</Text>
          <Text style={{ color: isDarkMode ? colors.medium : colors.primaryLight, fontSize: 16, marginBottom: 24, textAlign: 'center', maxWidth: 260 }}>
            For your security, please authenticate to continue using FinancePal.
          </Text>
          
          {loading ? (
            <ActivityIndicator size="large" color={colors.dark} />
          ) : (
            <TouchableOpacity
              style={{
                backgroundColor: colors.white,
                paddingVertical: 12,
                paddingHorizontal: 24,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
              }}
              onPress={async () => {
                try {
                  const authResult = await LocalAuthentication.authenticateAsync({
                    promptMessage: 'Authenticate to unlock FinancePal',
                    fallbackLabel: 'Use passcode to unlock',
                    disableDeviceFallback: false,
                  });
                  
                  setLocked(!authResult.success);
                } catch (error) {
                  console.log('Error with retry authentication:', error);
                  // In case of error, keep the locked state
                }
              }}
            >
              <Ionicons name="finger-print-outline" size={24} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 16 }}>
                Retry Authentication
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerShadowVisible: false,
          headerBackTitle: 'Back',
          headerTintColor: colors.primary,
          contentStyle: {
            backgroundColor: colors.background
          }
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: 'Dashboard',
          }}
        />
        <Stack.Screen
          name="expense"
          options={{
            title: 'Expenses',
          }}
        />
        <Stack.Screen
          name="expenseAnalysis"
          options={{
            title: 'Expense Analysis',
          }}
        />
        <Stack.Screen
          name="login"
          options={{
            title: 'Login',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="signup"
          options={{
            title: 'Sign Up',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="borrowing"
          options={{
            title: 'Borrowing',
          }}
        />
        <Stack.Screen
          name="investment"
          options={{
            title: 'Investment',
          }}
        />
        <Stack.Screen
          name="lending"
          options={{
            title: 'Lending',
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            title: 'Settings',
          }}
        />
      </Stack>
    </>
  );
}

// Root component that provides all context providers
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <ErrorProvider>
          <ExpenseProvider>
            <BudgetProvider>
              <AppNavigator />
            </BudgetProvider>
          </ExpenseProvider>
        </ErrorProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});