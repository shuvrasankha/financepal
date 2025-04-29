// firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

// Import auth functions conditionally based on platform
import { 
  initializeAuth, 
  getReactNativePersistence,
  getAuth,
  browserLocalPersistence,
  setPersistence
} from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// Your Firebase configuration object
// Make sure all these values are correctly set
const firebaseConfig = {
  apiKey: "AIzaSyBle1GefKYvaY4VKbg2UwG1Qpe6yjQ2wyA",
  authDomain: "financepal-a743e.firebaseapp.com",
  projectId: "financepal-a743e",
  storageBucket: "financepal-a743e.firebasestorage.app",
  messagingSenderId: "31415694327",
  appId: "1:31415694327:web:3e1d5843ec0331a8a0b4f2",
  measurementId: "G-38L5VNMWRW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with platform-specific persistence
let auth;

// Use different persistence mechanisms based on platform
if (Platform.OS === 'web') {
  // For web, use standard getAuth and set persistence separately
  auth = getAuth(app);
  setPersistence(auth, browserLocalPersistence)
    .catch((error) => {
      console.error("Error setting auth persistence for web:", error);
    });
} else {
  // For native platforms, use React Native persistence
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
  });
}

// Initialize Firestore
const db = getFirestore(app);

export { db, auth };