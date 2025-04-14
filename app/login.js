import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { Ionicons } from '@expo/vector-icons';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState({
    email: '',
    password: '',
    general: '',
  });

  const handleLogin = async () => {
    setError({ email: '', password: '', general: '' });

    if (!email.includes('@')) {
      setError((prev) => ({ ...prev, email: 'Invalid email format.' }));
      return;
    }

    if (password.length < 6) {
      setError((prev) => ({ ...prev, password: 'Password must be at least 6 characters.' }));
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/');
    } catch (e) {
      let message = e.message;

      if (message.includes('auth/user-not-found')) {
        setError((prev) => ({ ...prev, email: 'No account found with this email.' }));
      } else if (message.includes('auth/wrong-password')) {
        setError((prev) => ({ ...prev, password: 'Incorrect password.' }));
      } else {
        setError((prev) => ({ ...prev, general: 'Login failed. Please try again.' }));
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔐 Login</Text>

      <TextInput
        style={[styles.input, error.email && styles.errorInput]}
        placeholder="Email"
        placeholderTextColor="#aaa"
        keyboardType="email-address"
        autoCapitalize="none"
        onChangeText={setEmail}
      />
      {error.email ? <Text style={styles.errorText}>{error.email}</Text> : null}

      <View style={[styles.passwordContainer, error.password && styles.errorInput]}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Password"
          placeholderTextColor="#aaa"
          secureTextEntry={!showPassword}
          onChangeText={setPassword}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color="#777" />
        </TouchableOpacity>
      </View>
      {error.password ? <Text style={styles.errorText}>{error.password}</Text> : null}

      {error.general ? <Text style={styles.errorText}>{error.general}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Log In</Text>
      </TouchableOpacity>

      <Text style={styles.link} onPress={() => router.push('/signup')}>
        Don’t have an account? <Text style={styles.linkBold}>Sign up</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 32,
    alignSelf: 'center',
  },
  input: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginTop: 16,
    backgroundColor: '#fff',
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
  },
  errorInput: {
    borderColor: '#ff4d4f',
  },
  errorText: {
    color: '#ff4d4f',
    fontSize: 13,
    marginTop: 6,
    marginBottom: 6,
    marginLeft: 4,
  },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  link: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 15,
    color: '#444',
  },
  linkBold: {
    fontWeight: 'bold',
    color: '#007bff',
  },
});
