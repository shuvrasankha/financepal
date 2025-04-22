import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { StyleSheet } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Theme from '../constants/Theme';

export default function RootLayout() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    // Check authentication state
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        // Check if app lock is enabled
        const appLockEnabled = await AsyncStorage.getItem('appLockEnabled');
        if (appLockEnabled === 'true') {
          // User is logged in and app lock is enabled, now authenticate
          try {
            const { success } = await LocalAuthentication.authenticateAsync({
              promptMessage: 'Authenticate to unlock FinancePal',
              fallbackLabel: 'Use passcode to unlock',
            });
            setLocked(!success);
            setLoading(false);
          } catch (error) {
            console.log('Error with local authentication:', error);
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
      <View style={[styles.container, { backgroundColor: Theme.colors.primary }]}> 
        <View style={{ alignItems: 'center' }}>
          <View style={{ backgroundColor: Theme.colors.white, borderRadius: 60, padding: 18, marginBottom: 24 }}>
            <Text style={{ fontSize: 40, color: Theme.colors.primary, fontWeight: 'bold' }}>🔒</Text>
          </View>
          <Text style={{ fontSize: 28, color: Theme.colors.white, fontWeight: '700', marginBottom: 8 }}>App Locked</Text>
          <Text style={{ color: Theme.colors.primaryLight, fontSize: 16, marginBottom: 24, textAlign: 'center', maxWidth: 260 }}>
            For your security, please authenticate to continue using FinancePal.
          </Text>
          <ActivityIndicator size="large" color={Theme.colors.white} />
        </View>
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerStyle: {
          backgroundColor: Theme.colors.background,
        },
        headerShadowVisible: false,
        headerBackTitle: 'Back',
        headerTintColor: Theme.colors.primary,
        contentStyle: {
          backgroundColor: Theme.colors.background
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});