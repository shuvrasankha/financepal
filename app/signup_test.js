import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  TextInput, 
  Alert, 
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { signupStyles, colors } from '../styles/SignupStyles';

export default function Signup() {
  const router = useRouter();
  
  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);
  
  // Validation state
  const [errors, setErrors] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password) => {
    // At least 8 characters, one uppercase, one lowercase, one number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return passwordRegex.test(password);
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = { ...errors };

    // First name validation
    if (!firstName.trim()) {
      newErrors.firstName = 'First name is required';
      isValid = false;
    } else {
      newErrors.firstName = '';
    }

    // Last name validation
    if (!lastName.trim()) {
      newErrors.lastName = 'Last name is required';
      isValid = false;
    } else {
      newErrors.lastName = '';
    }

    // Email validation
    if (!email.trim()) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email';
      isValid = false;
    } else {
      newErrors.email = '';
    }

    // Password validation
    if (!password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (!validatePassword(password)) {
      newErrors.password = 'Password must be at least 8 characters with uppercase, lowercase, and number';
      isValid = false;
    } else {
      newErrors.password = '';
    }

    // Confirm password validation
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
      isValid = false;
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    } else {
      newErrors.confirmPassword = '';
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSignup = async () => {
    if (!validateForm()) {
      return;
    }
  
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Here you would typically store the additional user data (first name, last name)
      // to Firestore or another database
      // Example: await setDoc(doc(db, "users", userCredential.user.uid), { firstName, lastName });
      
      // Show success message first
      Alert.alert(
        "Success",
        "Account created successfully!",
        [{ 
          text: "Continue", 
          onPress: () => {
            // Try different navigation approaches
            try {
              // Option 1: Use replace - make sure we're not building a stack
              router.replace('/');
            } catch (navError) {
              try {
                // Option 2: Use push as fallback
                router.push('/');
              } catch (pushError) {
                try {
                  // Option 3: Use navigate if available (some router implementations)
                  router.navigate('/');
                } catch (navError2) {
                  console.error("Navigation failed:", navError2);
                  // Last resort - if nothing works, at least clear the form
                  setFirstName('');
                  setLastName('');
                  setEmail('');
                  setPassword('');
                  setConfirmPassword('');
                }
              }
            }
          }
        }]
      );
    } catch (error) {
      // Error handling code remains the same
      // ...
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={signupStyles.container}
    >
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={signupStyles.contentContainer}
      >
        <View style={signupStyles.header}>
          <Text style={signupStyles.logo}>✨</Text>
          <Text style={signupStyles.title}>Create an Account</Text>
          <Text style={signupStyles.subtitle}>Join our community today</Text>
        </View>

        <View style={signupStyles.formRow}>
          <View style={[signupStyles.inputContainer, signupStyles.inputHalf]}>
            <Text style={signupStyles.inputLabel}>First Name</Text>
            <TextInput
              style={[
                signupStyles.input,
                focusedInput === 'firstName' && signupStyles.inputFocused,
                errors.firstName ? { borderColor: colors.error } : null
              ]}
              placeholder="John"
              value={firstName}
              onChangeText={setFirstName}
              onFocus={() => setFocusedInput('firstName')}
              onBlur={() => setFocusedInput(null)}
              autoCapitalize="words"
            />
            {errors.firstName ? <Text style={signupStyles.errorText}>{errors.firstName}</Text> : null}
          </View>

          <View style={[signupStyles.inputContainer, signupStyles.inputHalf]}>
            <Text style={signupStyles.inputLabel}>Last Name</Text>
            <TextInput
              style={[
                signupStyles.input,
                focusedInput === 'lastName' && signupStyles.inputFocused,
                errors.lastName ? { borderColor: colors.error } : null
              ]}
              placeholder="Doe"
              value={lastName}
              onChangeText={setLastName}
              onFocus={() => setFocusedInput('lastName')}
              onBlur={() => setFocusedInput(null)}
              autoCapitalize="words"
            />
            {errors.lastName ? <Text style={signupStyles.errorText}>{errors.lastName}</Text> : null}
          </View>
        </View>

        <View style={signupStyles.inputContainer}>
          <Text style={signupStyles.inputLabel}>Email</Text>
          <TextInput
            style={[
              signupStyles.input,
              focusedInput === 'email' && signupStyles.inputFocused,
              errors.email ? { borderColor: colors.error } : null
            ]}
            placeholder="email@example.com"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            onFocus={() => setFocusedInput('email')}
            onBlur={() => setFocusedInput(null)}
            autoCapitalize="none"
          />
          {errors.email ? <Text style={signupStyles.errorText}>{errors.email}</Text> : null}
        </View>

        <View style={signupStyles.inputContainer}>
          <Text style={signupStyles.inputLabel}>Password</Text>
          <TextInput
            style={[
              signupStyles.input,
              focusedInput === 'password' && signupStyles.inputFocused,
              errors.password ? { borderColor: colors.error } : null
            ]}
            placeholder="Enter your password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            onFocus={() => setFocusedInput('password')}
            onBlur={() => setFocusedInput(null)}
          />
          {errors.password ? <Text style={signupStyles.errorText}>{errors.password}</Text> : null}
        </View>

        <View style={signupStyles.inputContainer}>
          <Text style={signupStyles.inputLabel}>Confirm Password</Text>
          <TextInput
            style={[
              signupStyles.input,
              focusedInput === 'confirmPassword' && signupStyles.inputFocused,
              errors.confirmPassword ? { borderColor: colors.error } : null
            ]}
            placeholder="Re-enter your password"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            onFocus={() => setFocusedInput('confirmPassword')}
            onBlur={() => setFocusedInput(null)}
          />
          {errors.confirmPassword ? <Text style={signupStyles.errorText}>{errors.confirmPassword}</Text> : null}
        </View>

        <TouchableOpacity
          style={[
            signupStyles.button,
            loading && signupStyles.buttonDisabled
          ]}
          onPress={handleSignup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={signupStyles.buttonText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <View style={signupStyles.footer}>
          <Text>Already have an account?</Text>
          <TouchableOpacity onPress={() => router.push('/login')}>
            <Text style={signupStyles.link}>Log In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}