import { signInWithEmailAndPassword } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../firebase';

// Key for storing auth token
const AUTH_TOKEN_KEY = 'financepal_auth_token';
const AUTH_USER_KEY = 'financepal_user_email';

/**
 * Performs login and stores credentials for persistence
 * @param {string} email User's email
 * @param {string} password User's password
 * @returns {Promise} Firebase auth user credential
 */
export const persistentSignIn = async (email, password) => {
  try {
    // Perform regular login
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Store auth data in AsyncStorage
    if (userCredential.user) {
      const userData = {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        refreshToken: userCredential.user.refreshToken || '',
      };
      
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify(userData));
      await AsyncStorage.setItem(AUTH_USER_KEY, email);
    }
    
    return userCredential;
  } catch (error) {
    console.error('Error during persistent sign in:', error);
    throw error;
  }
};

/**
 * Checks if user has stored auth data
 * @returns {Promise<Object|null>} The stored auth data or null
 */
export const getStoredAuthToken = async () => {
  try {
    const userData = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

/**
 * Gets the stored user email if available
 * @returns {Promise<string|null>} The stored user email or null
 */
export const getStoredUserEmail = async () => {
  try {
    return await AsyncStorage.getItem(AUTH_USER_KEY);
  } catch (error) {
    console.error('Error getting stored user email:', error);
    return null;
  }
};

/**
 * Removes all stored auth data
 * @returns {Promise<void>}
 */
export const clearStoredAuthToken = async () => {
  try {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    await AsyncStorage.removeItem(AUTH_USER_KEY);
  } catch (error) {
    console.error('Error clearing auth token:', error);
  }
};