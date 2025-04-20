import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView, ActivityIndicator, Image, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as LocalAuthentication from 'expo-local-authentication';
import styles from '../styles/SettingsStyles';
import BottomNavBar from './components/BottomNavBar';

export default function Settings() {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [lockEnabled, setLockEnabled] = useState(false);
  const user = auth.currentUser;

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      setProfileLoading(true);
      setProfileError('');
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
        } else {
          setProfileError('User profile not found.');
        }
      } catch (err) {
        setProfileError('Failed to load user profile.');
      } finally {
        setProfileLoading(false);
      }
    };
    fetchUserProfile();
  }, [user]);

  useEffect(() => {
    // Load lockEnabled from local storage
    (async () => {
      const value = await LocalAuthentication.getEnrolledLevelAsync();
      // Optionally, load from AsyncStorage if you want persistent toggle
      // setLockEnabled(value === LocalAuthentication.SecurityLevel.BIOMETRIC);
    })();
  }, []);

  const handleToggleLock = async (value) => {
    if (value) {
      // Check if device supports authentication
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        Alert.alert('Not Supported', 'Your device does not support biometric authentication.');
        return;
      }
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        Alert.alert('Not Set Up', 'No biometrics or PIN are set up on this device.');
        return;
      }
    }
    setLockEnabled(value);
    // Optionally, save to AsyncStorage for persistence
  };

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut(auth);
              router.replace('/login');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Export expenses as CSV
  const handleExportExpenses = async () => {
    setExporting(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'You must be logged in to export expenses.');
        setExporting(false);
        return;
      }
      const expensesQuery = query(
        collection(db, 'expenses'),
        where('userId', '==', user.uid)
      );
      const snapshot = await getDocs(expensesQuery);
      if (snapshot.empty) {
        Alert.alert('No Data', 'No expenses found to export.');
        setExporting(false);
        return;
      }
      // Prepare CSV header
      const csvRows = [
        'Date,Category,Amount,Description'
      ];
      snapshot.forEach(doc => {
        const data = doc.data();
        // Escape commas and quotes in description
        const description = (data.note || '').replace(/"/g, '""').replace(/,/g, ' ');
        csvRows.push(`"${data.date}","${data.category || ''}","${data.amount}","${description}"`);
      });
      const csvString = csvRows.join('\n');
      // Save to file
      const fileUri = FileSystem.cacheDirectory + `expenses_${Date.now()}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csvString, { encoding: FileSystem.EncodingType.UTF8 });
      // Share the file
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export Expenses as CSV',
        UTI: 'public.comma-separated-values-text',
      });
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Failed to export expenses.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <ScrollView>
        <View style={styles.container}>
          <View style={styles.profileSection}>
            {profileLoading ? (
              <ActivityIndicator size="small" color="#6366f1" />
            ) : profileError ? (
              <Text style={{ color: '#ef4444' }}>{profileError}</Text>
            ) : (
              <>
                <Image
                  source={{ uri: user?.photoURL || 'https://ui-avatars.com/api/?name=' + (userProfile?.firstName || userProfile?.email || 'User') }}
                  style={styles.avatar}
                />
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>{userProfile?.firstName || ''} {userProfile?.lastName || ''}</Text>
                  <Text style={styles.profileEmail}>{userProfile?.email || user?.email || ''}</Text>
                </View>
              </>
            )}
          </View>

          <Text style={styles.sectionHeader}>Account</Text>
          <View style={styles.card}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleExportExpenses}
              disabled={exporting}
            >
              <Ionicons name="download-outline" size={22} color="#6366f1" />
              <Text style={styles.actionText}>Export Expenses as CSV</Text>
              {exporting && <ActivityIndicator size="small" color="#6366f1" style={{ marginLeft: 8 }} />}
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={22} color="#ef4444" />
              <Text style={[styles.actionText, { color: '#ef4444' }]}>Logout</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionHeader}>Security</Text>
          <View style={styles.card}>
            <View style={styles.actionButton}>
              <Ionicons name="lock-closed-outline" size={22} color="#6366f1" />
              <Text style={styles.actionText}>App Lock</Text>
              <Switch
                style={{ marginLeft: 'auto' }}
                value={lockEnabled}
                onValueChange={handleToggleLock}
              />
            </View>
          </View>
        </View>
      </ScrollView>
      <BottomNavBar />
    </>
  );
}