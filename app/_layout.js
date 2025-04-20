import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { Stack } from 'expo-router';
import { auth } from '../firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';

export default function RootLayout() {
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    const checkLock = async () => {
      const lockEnabled = await AsyncStorage.getItem('appLockEnabled');
      if (lockEnabled === 'true') {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Unlock FinancePal',
          fallbackLabel: 'Enter device PIN',
        });
        setLocked(!result.success);
      } else {
        setLocked(false);
      }
    };
    checkLock();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading || locked) {
    return (
      <View style={[styles.container, { backgroundColor: '#6366f1' }]}> 
        <View style={{ alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 60, padding: 18, marginBottom: 24 }}>
            <Text style={{ fontSize: 40, color: '#6366f1', fontWeight: 'bold' }}>🔒</Text>
          </View>
          <Text style={{ fontSize: 28, color: '#fff', fontWeight: '700', marginBottom: 8 }}>App Locked</Text>
          <Text style={{ color: '#e0e7ff', fontSize: 16, marginBottom: 24, textAlign: 'center', maxWidth: 260 }}>
            For your security, please authenticate to continue using FinancePal.
          </Text>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerStyle: {
          backgroundColor: '#f9f9f9',
        },
        headerShadowVisible: false,
        headerBackTitle: 'Back',
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
    </Stack>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
});