import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../firebase';
import { persistentSignIn, getStoredAuthToken } from '../utils/authUtils';
import styles from '../styles/LoginStyles';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);
  const [error, setError] = useState({
    email: '',
    password: '',
    general: '',
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check for any stored auth tokens first
    const checkStoredAuth = async () => {
      try {
        const token = await getStoredAuthToken();
        if (token && auth.currentUser) {
          router.replace('/');
        }
      } catch (error) {
        console.error('Error checking stored auth:', error);
      }
    };
    
    checkStoredAuth();
    
    // Also listen for auth state changes
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        router.replace('/');
      }
    });
    
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setError({ email: '', password: '', general: '' });

    if (!email.includes('@')) {
      setErrorMessage('Please enter a valid email address');
      setShowErrorModal(true);
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters');
      setShowErrorModal(true);
      return;
    }

    setLoading(true);
    try {
      // Use our persistent sign-in method instead of regular signInWithEmailAndPassword
      await persistentSignIn(email, password);
      setShowSuccess(true); // Show success modal instead of immediate navigation
    } catch (e) {
      if (e.code === 'auth/user-not-found') {
        setErrorMessage('No account found with this email');
      } else if (e.code === 'auth/wrong-password') {
        setErrorMessage('Incorrect password');
      } else {
        setErrorMessage('Login failed. Please try again.');
      }
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  // Add success modal component
  const SuccessModal = () => (
    <Modal
      visible={showSuccess}
      transparent
      animationType="fade"
    >
      <View style={styles.successModal}>
        <View style={styles.successModalContent}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark" size={32} color="#ffffff" />
          </View>
          <Text style={styles.successTitle}>Welcome Back!</Text>
          <Text style={styles.successMessage}>
            You've successfully signed in to your account.
          </Text>
          <TouchableOpacity 
            style={styles.successButton}
            onPress={() => {
              setShowSuccess(false);
              router.replace('/');
            }}
          >
            <Text style={styles.successButtonText}>Continue to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Add error modal component
  const ErrorModal = () => (
    <Modal
      visible={showErrorModal}
      transparent
      animationType="fade"
    >
      <View style={styles.errorModal}>
        <View style={styles.errorModalContent}>
          <View style={styles.errorIcon}>
            <Ionicons name="alert" size={32} color="#ffffff" />
          </View>
          <Text style={styles.errorTitle}>Login Failed</Text>
          <Text style={styles.errorMessage}>
            {errorMessage}
          </Text>
          <TouchableOpacity 
            style={styles.errorButton}
            onPress={() => setShowErrorModal(false)}
          >
            <Text style={styles.errorButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <SuccessModal />
        <ErrorModal />
        
        <ScrollView 
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.logo}>✨</Text>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <TextInput
              style={[
                styles.input,
                focusedInput === 'email' && styles.inputFocused,
                error.email && { borderColor: styles.errorText.color }
              ]}
              placeholder="Enter your email"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              onFocus={() => setFocusedInput('email')}
              onBlur={() => setFocusedInput(null)}
            />
            {error.email ? <Text style={styles.errorText}>{error.email}</Text> : null}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={[
              styles.passwordContainer,
              focusedInput === 'password' && styles.inputFocused,
              error.password && { borderColor: styles.errorText.color }
            ]}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter your password"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocusedInput('password')}
                onBlur={() => setFocusedInput(null)}
              />
              <TouchableOpacity 
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons 
                  name={showPassword ? 'eye-off' : 'eye'} 
                  size={20} 
                  color="#6b7280" 
                />
              </TouchableOpacity>
            </View>
            {error.password ? <Text style={styles.errorText}>{error.password}</Text> : null}
          </View>

          {error.general ? <Text style={styles.errorText}>{error.general}</Text> : null}

          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account?</Text>
            <TouchableOpacity onPress={() => router.push('/signup')}>
              <Text style={styles.linkText}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
