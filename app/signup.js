import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import styles from '../styles/SignupStyles';

export default function Signup() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [focusedInput, setFocusedInput] = useState(null);
  const [errors, setErrors] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  });
  const [showSuccess, setShowSuccess] = useState(false);

  const validateForm = () => {
    let isValid = true;
    const newErrors = {};

    if (!firstName.trim()) {
      newErrors.firstName = 'First name is required';
      isValid = false;
    }

    if (!lastName.trim()) {
      newErrors.lastName = 'Last name is required';
      isValid = false;
    }

    if (!email.includes('@')) {
      newErrors.email = 'Please enter a valid email';
      isValid = false;
    }

    if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      setShowSuccess(true); // Show success modal instead of Alert
    } catch (error) {
      let errorMessage = 'An error occurred during signup';
      if (error.code === 'auth/email-already-in-use') {
        setErrors(prev => ({ ...prev, email: 'This email is already registered' }));
      } else {
        Alert.alert("Error", errorMessage);
      }
    }
  };

  // Add this success modal component
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
          <Text style={styles.successTitle}>Welcome Aboard!</Text>
          <Text style={styles.successMessage}>
            Your account has been created successfully. Let's start managing your finances!
          </Text>
          <TouchableOpacity 
            style={styles.successButton}
            onPress={() => {
              setShowSuccess(false);
              router.replace('/');
            }}
          >
            <Text style={styles.successButtonText}>Get Started</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Add the SuccessModal component */}
      <SuccessModal />
      
      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.logo}>✨</Text>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join us today</Text>
        </View>

        <View style={styles.formRow}>
          <View style={[styles.inputContainer, styles.inputHalf]}>
            <Text style={styles.inputLabel}>First Name</Text>
            <TextInput
              style={[
                styles.input,
                focusedInput === 'firstName' && styles.inputFocused,
                errors.firstName && { borderColor: '#ef4444' }
              ]}
              placeholder="John"
              value={firstName}
              onChangeText={setFirstName}
              onFocus={() => setFocusedInput('firstName')}
              onBlur={() => setFocusedInput(null)}
            />
            {errors.firstName ? 
              <Text style={styles.errorText}>{errors.firstName}</Text> : null}
          </View>

          <View style={[styles.inputContainer, styles.inputHalf]}>
            <Text style={styles.inputLabel}>Last Name</Text>
            <TextInput
              style={[
                styles.input,
                focusedInput === 'lastName' && styles.inputFocused,
                errors.lastName && { borderColor: '#ef4444' }
              ]}
              placeholder="Doe"
              value={lastName}
              onChangeText={setLastName}
              onFocus={() => setFocusedInput('lastName')}
              onBlur={() => setFocusedInput(null)}
            />
            {errors.lastName ? 
              <Text style={styles.errorText}>{errors.lastName}</Text> : null}
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Email Address</Text>
          <TextInput
            style={[
              styles.input,
              focusedInput === 'email' && styles.inputFocused,
              errors.email && { borderColor: '#ef4444' }
            ]}
            placeholder="your@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            onFocus={() => setFocusedInput('email')}
            onBlur={() => setFocusedInput(null)}
          />
          {errors.email ? 
            <Text style={styles.errorText}>{errors.email}</Text> : null}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Password</Text>
          <TextInput
            style={[
              styles.input,
              focusedInput === 'password' && styles.inputFocused,
              errors.password && { borderColor: '#ef4444' }
            ]}
            placeholder="Min. 6 characters"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            onFocus={() => setFocusedInput('password')}
            onBlur={() => setFocusedInput(null)}
          />
          {errors.password ? 
            <Text style={styles.errorText}>{errors.password}</Text> : null}
        </View>

        <TouchableOpacity style={styles.button} onPress={handleSignup}>
          <Text style={styles.buttonText}>Create Account</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => router.push('/login')}>
            <Text style={styles.linkText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}