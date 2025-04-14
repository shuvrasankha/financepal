// firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

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
const auth = getAuth(app);
const db = getFirestore(app);

export { db, auth };