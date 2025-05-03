import { Stack } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import { View, Text, ActivityIndicator, useColorScheme, TouchableOpacity, AppState, Image, StyleSheet, Dimensions } from 'react-native';
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
import { LinearGradient } from 'expo-linear-gradient';

// Wrap the Stack with ThemeContext
function AppNavigator() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const { isDarkMode } = useTheme();
  
  const appState = useRef(AppState.currentState);
  const [appLockEnabled, setAppLockEnabled] = useState(false);

  // Get theme-specific colors and styles
  const colors = isDarkMode ? Theme.dark.colors : Theme.light.colors;
  const shadows = isDarkMode ? Theme.shadowsDark : Theme.shadows;

  // Authenticate the user using biometrics
  const authenticateUser = async () => {
    try {
      const authResult = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to unlock FinancePal',
        fallbackLabel: 'Use passcode to unlock',
        disableDeviceFallback: false,
      });
      
      console.log('Authentication result:', authResult);
      
      if (authResult.success) {
        setLocked(false);
      } else if (authResult.error === 'user_cancel') {
        // User cancelled, keep locked
        console.log('User cancelled authentication');
        setLocked(true);
      } else {
        // Hardware/system error, don't lock user out
        console.log('Auth error:', authResult.error);
        setLocked(false);
      }
    } catch (error) {
      console.log('Error with authentication:', error);
      // In case of error, unlock to prevent permanent lockout
      setLocked(false);
    }
  };

  // Check if device supports biometrics
  const checkBiometricCapability = async () => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = compatible ? await LocalAuthentication.isEnrolledAsync() : false;
    console.log('Biometric capability:', { compatible, enrolled });
    
    if (!compatible || !enrolled) {
      console.log('Device not compatible with biometrics or no biometrics enrolled');
      setLocked(false);
      setLoading(false);
      
      // Disable app lock if device is no longer compatible
      if (appLockEnabled) {
        console.log('Disabling app lock due to lack of biometric capability');
        await AsyncStorage.setItem('appLockEnabled', 'false');
        setAppLockEnabled(false);
      }
      return false;
    }
    return true;
  };

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async nextAppState => {
      if (user && appLockEnabled) {
        // App goes to background
        if (appState.current.match(/active/) && nextAppState.match(/inactive|background/)) {
          console.log('App has gone to background, locking...');
          setLocked(true);
        }
        
        // App comes back to foreground and is locked - authenticate
        if (nextAppState === 'active' && appState.current.match(/inactive|background/) && locked) {
          console.log('App has come to foreground, triggering authentication');
          // Check biometric capability before authenticating
          const canAuthenticate = await checkBiometricCapability();
          if (canAuthenticate) {
            authenticateUser();
          }
        }
      }
      
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [user, appLockEnabled, locked]);

  // Check authentication state and app lock settings
  useEffect(() => {
    // Check authentication state
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        // Add a small delay to ensure Firebase is fully initialized
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Check if app lock is enabled
        const storedAppLockEnabled = await AsyncStorage.getItem('appLockEnabled');
        const isAppLockEnabled = storedAppLockEnabled === 'true';
        console.log('App lock value in storage:', storedAppLockEnabled);
        setAppLockEnabled(isAppLockEnabled);
        
        if (isAppLockEnabled) {
          // Check device biometric capability first
          const canAuthenticate = await checkBiometricCapability();
          if (!canAuthenticate) {
            setLoading(false);
            return;
          }
          
          // User is logged in and app lock is enabled, now authenticate
          try {
            await authenticateUser();
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
      <View style={[styles.lockContainer, { backgroundColor: isDarkMode ? colors.darker : colors.primary }]}> 
        <StatusBar style={isDarkMode ? 'light' : 'light'} />
        <LinearGradient
          colors={isDarkMode 
            ? ['rgba(30, 30, 40, 0.9)', 'rgba(15, 15, 25, 1)'] 
            : ['rgba(139, 92, 246, 0.9)', 'rgba(79, 70, 229, 1)']}
          style={styles.gradientBackground}
        >
          <View style={styles.lockContentContainer}>
            <View style={styles.lockIconContainer}>
              <Ionicons name="lock-closed" size={50} color="#fff" />
            </View>
            
            <Text style={styles.lockTitle}>App Locked</Text>
            
            <Text style={[styles.lockMessage, { color: isDarkMode ? '#a3a3c2' : '#ede9fe' }]}>
              For your security, please verify your identity to continue using FinancePal.
            </Text>
            
            {loading ? (
              <ActivityIndicator size="large" color="#ffffff" style={styles.loader} />
            ) : (
              <TouchableOpacity
                style={styles.authButton}
                onPress={authenticateUser}
              >
                <Ionicons name="finger-print" size={28} color={isDarkMode ? colors.primary : '#4f46e5'} style={{ marginRight: 10 }} />
                <Text style={styles.authButtonText}>
                  Unlock with Biometrics
                </Text>
              </TouchableOpacity>
            )}
            
            <View style={styles.securityNotice}>
              <Ionicons name="shield-checkmark" size={16} color={isDarkMode ? '#a3a3c2' : '#ede9fe'} />
              <Text style={[styles.securityNoticeText, { color: isDarkMode ? '#a3a3c2' : '#ede9fe' }]}>
                Your data is secure and protected
              </Text>
            </View>
          </View>
        </LinearGradient>
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

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  lockContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockContentContainer: {
    width: width * 0.85,
    maxWidth: 360,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  lockIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  lockTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
  },
  lockMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  authButton: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  authButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4f46e5',
  },
  loader: {
    marginVertical: 20,
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 40,
  },
  securityNoticeText: {
    marginLeft: 8,
    fontSize: 14,
  },
});