import { setPersistence, browserLocalPersistence, inMemoryPersistence, signInWithEmailAndPassword } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../firebase';

// Key for storing auth token
const AUTH_TOKEN_KEY = 'financepal_auth_token';

/**
 * Sets up Firebase Auth persistence and performs login
 * @param {string} email User's email
 * @param {string} password User's password
 * @returns {Promise} Firebase auth user credential
 */
export const persistentSignIn = async (email, password) => {
  try {
    // Enable persistent auth state (survives app restarts and background)
    await setPersistence(auth, browserLocalPersistence);
    
    // Perform regular login
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Store auth token in AsyncStorage
    if (userCredential.user && userCredential.user.refreshToken) {
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, userCredential.user.refreshToken);
    }
    
    return userCredential;
  } catch (error) {
    console.error('Error during persistent sign in:', error);
    throw error;
  }
};

/**
 * Checks if user has a stored auth token
 * @returns {Promise<string|null>} The stored auth token or null
 */
export const getStoredAuthToken = async () => {
  try {
    return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

/**
 * Removes the stored auth token
 * @returns {Promise<void>}
 */
export const clearStoredAuthToken = async () => {
  try {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
  } catch (error) {
    console.error('Error clearing auth token:', error);
  }
};