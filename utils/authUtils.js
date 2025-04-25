import { signInWithEmailAndPassword, getIdToken } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../firebase';
import { Platform } from 'react-native';

// Constants for auth storage keys
const AUTH_TOKEN_KEY = 'financepal_auth_token';
const AUTH_USER_KEY = 'financepal_user_email';
const AUTH_ID_TOKEN_KEY = 'financepal_id_token';
const AUTH_REFRESH_TOKEN_KEY = 'financepal_refresh_token';
const AUTH_SESSION_TIMESTAMP = 'financepal_session_timestamp';
const AUTH_USER_CREDS = 'financepal_user_credentials'; // For Android auto-login

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
      // Get the ID token
      const idToken = await getIdToken(userCredential.user, true);
      
      const userData = {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        refreshToken: userCredential.user.refreshToken || '',
        lastLogin: new Date().toISOString(),
        platform: Platform.OS,
      };
      
      // Store all auth data in AsyncStorage
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify(userData));
      await AsyncStorage.setItem(AUTH_USER_KEY, email);
      await AsyncStorage.setItem(AUTH_ID_TOKEN_KEY, idToken);
      await AsyncStorage.setItem(AUTH_REFRESH_TOKEN_KEY, userCredential.user.refreshToken || '');
      await AsyncStorage.setItem(AUTH_SESSION_TIMESTAMP, new Date().toISOString());
      
      // For Android, store credentials for auto-login (safely encrypted by AsyncStorage)
      if (Platform.OS === 'android') {
        await AsyncStorage.setItem(AUTH_USER_CREDS, JSON.stringify({
          email,
          // We don't store the actual password, just a flag that credentials exist
          hasCredentials: true
        }));
      }
      
      console.log(`[Auth] Session saved for ${Platform.OS}`);
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
    const idToken = await AsyncStorage.getItem(AUTH_ID_TOKEN_KEY);
    const refreshToken = await AsyncStorage.getItem(AUTH_REFRESH_TOKEN_KEY);
    const sessionTimestamp = await AsyncStorage.getItem(AUTH_SESSION_TIMESTAMP);
    
    if (!userData) {
      console.log('[Auth] No stored user data found');
      return null;
    }
    
    const parsedData = JSON.parse(userData);
    
    // Check if we have a current Firebase user that matches the stored data
    const currentUser = auth.currentUser;
    if (!currentUser && parsedData.uid) {
      console.log('[Auth] Stored auth token exists but no current user in Firebase');
    }
    
    // Check session age (optional)
    if (sessionTimestamp) {
      const sessionDate = new Date(sessionTimestamp);
      const now = new Date();
      const sessionAgeMs = now.getTime() - sessionDate.getTime();
      const sessionAgeDays = sessionAgeMs / (1000 * 60 * 60 * 24);
      
      // If session is older than 30 days, consider logging this for debugging
      if (sessionAgeDays > 30) {
        console.log(`[Auth] Session is older than 30 days (${sessionAgeDays.toFixed(1)} days old)`);
      }
    }
    
    return {
      ...parsedData,
      idToken,
      refreshToken,
      sessionTimestamp
    };
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

/**
 * Gets the stored user credentials for auto-login
 * @returns {Promise<Object|null>} The stored credentials or null
 */
export const getStoredCredentials = async () => {
  try {
    const credsData = await AsyncStorage.getItem(AUTH_USER_CREDS);
    if (!credsData) return null;
    
    return JSON.parse(credsData);
  } catch (error) {
    console.error('Error getting stored credentials:', error);
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
    await AsyncStorage.removeItem(AUTH_ID_TOKEN_KEY);
    await AsyncStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
    await AsyncStorage.removeItem(AUTH_SESSION_TIMESTAMP);
    await AsyncStorage.removeItem(AUTH_USER_CREDS);
    console.log('[Auth] All auth tokens cleared');
  } catch (error) {
    console.error('Error clearing auth token:', error);
  }
};

/**
 * Try to auto-login by checking if Firebase persistence restored the session.
 * @returns {Promise<boolean>} Success flag (true if auth.currentUser is set after a delay)
 */
export const tryAutoLogin = async () => {
  try {
    // Give Firebase persistence some time to initialize and restore the session.
    // Adjust the delay based on testing; 1-2 seconds might be needed on slower devices/networks.
    console.log('[Auth] Waiting for Firebase persistence to initialize...');
    await new Promise(resolve => setTimeout(resolve, 1500)); // e.g., 1.5 seconds

    // Check the definitive source: auth.currentUser
    if (auth.currentUser) {
      console.log('[Auth] Firebase automatically restored session. User:', auth.currentUser.uid);
      // Optional: Could force a token refresh here if needed, but often not necessary
      // try {
      //   await auth.currentUser.getIdToken(true);
      //   console.log('[Auth] Token verified/refreshed.');
      // } catch (tokenError) {
      //   console.error('[Auth] Auto-login failed during token refresh:', tokenError);
      //   // Consider clearing stored tokens if refresh fails
      //   // await clearStoredAuthToken(); 
      //   return false; 
      // }
      return true;
    } else {
      console.log('[Auth] No active Firebase session found after initialization delay.');
      // Don't try manual credential checks here, rely on Firebase persistence.
      // If persistence fails, the user needs to log in manually.
      // Consider clearing potentially stale tokens if currentUser is null after delay.
      // await clearStoredAuthToken(); // Uncomment cautiously if stale tokens are suspected
      return false;
    }
  } catch (error) {
    console.error('Error during tryAutoLogin:', error);
    // Ensure we clear potentially corrupted stored data on error
    // await clearStoredAuthToken(); // Consider clearing tokens on error
    return false;
  }
};