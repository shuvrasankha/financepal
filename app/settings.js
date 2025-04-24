import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView, ActivityIndicator, Image, Switch, Modal, StyleSheet, StatusBar, SafeAreaView, Platform, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import styles from '../styles/SettingsStyles';
import BottomNavBar from './components/BottomNavBar';
import { useTheme } from '../contexts/ThemeContext';
import { useError, ERROR_TYPES } from '../contexts/ErrorContext';
import { useExpenses } from '../contexts/ExpenseContext';
import { clearStoredAuthToken } from '../utils/authUtils';
import Theme from '../constants/Theme';
import Button from './components/Button';
import Input from './components/Input';

export default function Settings() {
  const router = useRouter();
  const { isDarkMode, toggleTheme } = useTheme();
  const { showError } = useError();
  const { expenses, refreshExpenses } = useExpenses();
  
  const [exporting, setExporting] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [lockEnabled, setLockEnabled] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv');
  const [exportDateRange, setExportDateRange] = useState('all'); // 'all', 'currentMonth', 'currentYear', 'custom'
  
  // Password Change States
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  
  // Profile Edit States
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
  });
  const [profileFormErrors, setProfileFormErrors] = useState({});
  const [profileUpdateLoading, setProfileUpdateLoading] = useState(false);
  const [profileUpdateSuccess, setProfileUpdateSuccess] = useState(false);
  
  const user = auth.currentUser;
  
  // Get theme-specific colors and styles
  const colors = isDarkMode ? Theme.dark.colors : Theme.light.colors;
  const commonStyles = Theme.getCommonStyles(isDarkMode);
  const shadows = isDarkMode ? Theme.shadowsDark : Theme.shadows;

  // Check if app lock is enabled
  useEffect(() => {
    const checkAppLock = async () => {
      try {
        const appLockEnabled = await AsyncStorage.getItem('appLockEnabled');
        setLockEnabled(appLockEnabled === 'true');
      } catch (err) {
        console.log('Error checking app lock:', err);
      }
    };
    
    checkAppLock();
  }, []);

  // Toggle app lock
  const handleToggleLock = async (value) => {
    try {
      // If enabling lock, check device compatibility first
      if (value) {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        if (!compatible) {
          Alert.alert(
            'Incompatible Device',
            'Your device doesn\'t support biometric authentication.'
          );
          return;
        }
        
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        if (!enrolled) {
          Alert.alert(
            'Biometrics Not Set Up',
            'Please set up biometric authentication in your device settings first.'
          );
          return;
        }
      }
      
      await AsyncStorage.setItem('appLockEnabled', value ? 'true' : 'false');
      setLockEnabled(value);
    } catch (err) {
      console.log('Error toggling app lock:', err);
      Alert.alert('Error', 'Failed to toggle app lock. Please try again.');
    }
  };

  // Fetch user profile data
  useEffect(() => {
    const fetchProfile = async () => {
      setProfileLoading(true);
      setProfileError('');
      
      try {
        if (!user) {
          setProfileLoading(false);
          return;
        }
        
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
        }
      } catch (err) {
        console.log('Error fetching profile:', err);
        setProfileError('Failed to load profile');
      } finally {
        setProfileLoading(false);
      }
    };
    
    fetchProfile();
  }, [user]);

  // Update profile fields when opening modal
  useEffect(() => {
    if (showProfileModal && userProfile) {
      setProfileForm({
        firstName: userProfile.firstName || '',
        lastName: userProfile.lastName || '',
        phoneNumber: userProfile.phoneNumber || '',
      });
    }
  }, [showProfileModal, userProfile]);

  // Handle profile update
  const handleUpdateProfile = async () => {
    // Reset errors and success
    setProfileFormErrors({});
    setProfileUpdateSuccess(false);
    
    // Validate inputs
    let hasError = false;
    const errors = {};
    
    if (!profileForm.firstName.trim()) {
      errors.firstName = 'First name is required';
      hasError = true;
    }
    
    if (hasError) {
      setProfileFormErrors(errors);
      return;
    }
    
    // Update profile in Firebase
    setProfileUpdateLoading(true);
    
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // Get a reference to the user document
      const userDocRef = doc(db, 'users', user.uid);
      
      // Only include fields that are not empty
      const profileData = {
        firstName: profileForm.firstName.trim(),
        updatedAt: new Date().toISOString(),
      };
      
      // Only add lastName and phoneNumber if they're not empty
      if (profileForm.lastName.trim()) {
        profileData.lastName = profileForm.lastName.trim();
      }
      
      if (profileForm.phoneNumber.trim()) {
        profileData.phoneNumber = profileForm.phoneNumber.trim();
      }
      
      // Update the document in Firestore
      await updateDoc(userDocRef, profileData);
      
      // Update local state
      setUserProfile(prev => ({
        ...prev,
        ...profileData
      }));
      
      // Show success message
      setProfileUpdateSuccess(true);
      
      // Close modal after delay
      setTimeout(() => {
        setShowProfileModal(false);
        setProfileUpdateSuccess(false);
      }, 2000);
      
    } catch (error) {
      console.error('Error updating profile:', error);
      setProfileFormErrors({ 
        general: 'Failed to update profile. Please try again.' 
      });
    } finally {
      setProfileUpdateLoading(false);
    }
  };

  // Handle user logout
  const handleLogout = async () => {
    try {
      // Clear the stored auth token
      await clearStoredAuthToken();
      // Sign out from Firebase
      await signOut(auth);
      router.replace('/login');
    } catch (err) {
      showError(ERROR_TYPES.AUTH, 'Failed to sign out. Please try again.');
    }
  };
  
  // Export expenses
  const handleExportExpenses = async () => {
    if (!expenses || expenses.length === 0) {
      Alert.alert('No Data', 'There are no expenses to export.');
      return;
    }
    
    setExporting(true);
    
    try {
      // Filter expenses based on date range
      let filteredExpenses = [...expenses];
      const today = new Date();
      
      if (exportDateRange === 'currentMonth') {
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        filteredExpenses = expenses.filter(exp => {
          const expDate = new Date(exp.date);
          return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
        });
      } else if (exportDateRange === 'currentYear') {
        const currentYear = today.getFullYear();
        filteredExpenses = expenses.filter(exp => {
          const expDate = new Date(exp.date);
          return expDate.getFullYear() === currentYear;
        });
      } else if (exportDateRange === 'custom') {
        // Last 90 days
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(today.getDate() - 90);
        filteredExpenses = expenses.filter(exp => {
          const expDate = new Date(exp.date);
          return expDate >= ninetyDaysAgo;
        });
      }
      
      if (filteredExpenses.length === 0) {
        Alert.alert('No Data', 'There are no expenses in the selected date range.');
        setExporting(false);
        return;
      }
      
      let exportData;
      let fileName;
      let mimeType;
      
      if (exportFormat === 'csv') {
        // Create CSV data
        const headers = 'Date,Category,Amount,Note\n';
        const rows = filteredExpenses.map(exp => 
          `${exp.date},${exp.category},${exp.amount},"${exp.note || ''}"`
        ).join('\n');
        exportData = headers + rows;
        fileName = `expenses_${today.toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv';
      } else {
        // Create JSON data
        exportData = JSON.stringify(filteredExpenses, null, 2);
        fileName = `expenses_${today.toISOString().split('T')[0]}.json`;
        mimeType = 'application/json';
      }
      
      // Save file
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, exportData);
      
      // Share file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType,
          UTI: mimeType === 'text/csv' ? 'public.comma-separated-values-text' : 'public.json',
        });
      } else {
        Alert.alert(
          'Sharing Not Available',
          'Sharing is not available on this device.'
        );
      }
    } catch (err) {
      console.log('Export error:', err);
      Alert.alert('Export Failed', 'Failed to export expenses. Please try again.');
    } finally {
      setExporting(false);
      setShowExportModal(false);
    }
  };

  // Handle password change
  const handleChangePassword = async () => {
    // Reset errors and success
    setPasswordErrors({});
    setPasswordSuccess(false);
    
    // Validate the inputs
    let hasError = false;
    const errors = {};
    
    if (!currentPassword) {
      errors.currentPassword = 'Current password is required';
      hasError = true;
    }
    
    if (!newPassword) {
      errors.newPassword = 'New password is required';
      hasError = true;
    } else if (newPassword.length < 6) {
      errors.newPassword = 'Password must be at least 6 characters';
      hasError = true;
    }
    
    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password';
      hasError = true;
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
      hasError = true;
    }
    
    if (hasError) {
      setPasswordErrors(errors);
      return;
    }
    
    // Update the password with Firebase
    setPasswordLoading(true);
    
    try {
      // Create credential with the current password
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );
      
      // Reauthenticate the user
      await reauthenticateWithCredential(user, credential);
      
      // Update the password
      await updatePassword(user, newPassword);
      
      // Success!
      setPasswordSuccess(true);
      
      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Close modal after 2 seconds
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess(false);
      }, 2000);
      
    } catch (error) {
      console.log('Password update error:', error);
      
      if (error.code === 'auth/wrong-password') {
        setPasswordErrors({ currentPassword: 'Incorrect current password' });
      } else if (error.code === 'auth/too-many-requests') {
        setPasswordErrors({ general: 'Too many attempts. Please try again later.' });
      } else if (error.code === 'auth/requires-recent-login') {
        Alert.alert(
          'Session Expired',
          'Your login session has expired. Please log out and log in again before changing your password.',
          [{ text: 'OK' }]
        );
      } else {
        setPasswordErrors({ general: 'Failed to update password. Please try again.' });
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      <ScrollView 
        style={[{ backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={newStyles.header}>
          <Text style={[newStyles.headerTitle, { color: colors.dark }]}>Settings</Text>
        </View>
        
        {/* User Profile Card */}
        <View style={[newStyles.profileCard, { 
          backgroundColor: colors.card,
          shadowColor: colors.dark,
        }]}>
          {profileLoading ? (
            <View style={newStyles.profileLoadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : profileError ? (
            <Text style={[newStyles.errorText, { color: colors.error }]}>{profileError}</Text>
          ) : (
            <View style={newStyles.profileWrapper}>
              <View style={newStyles.profileAvatarSection}>
                <Image
                  source={{ uri: user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent((userProfile?.firstName || userProfile?.email || 'User').charAt(0))}&background=8B5CF6&color=fff&bold=true&size=128` }}
                  style={[newStyles.avatar, { borderColor: `#8B5CF630` }]}
                />
                <TouchableOpacity 
                  style={newStyles.profileEdit}
                  onPress={() => setShowProfileModal(true)}
                >
                  <MaterialCommunityIcons name="pencil" size={14} color="#fff" />
                </TouchableOpacity>
              </View>
              <View style={newStyles.profileInfoContainer}>
                <Text style={[newStyles.profileName, { color: colors.dark }]}>
                  {userProfile?.firstName || ''} {userProfile?.lastName || ''}
                </Text>
                <Text style={[newStyles.profileEmail, { color: colors.medium }]}>
                  {userProfile?.email || user?.email || ''}
                </Text>
                <View style={newStyles.memberSinceContainer}>
                  <Text style={[newStyles.memberSinceText, { color: colors.medium }]}>
                    Member since {user?.metadata?.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'N/A'}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
        
        {/* Settings Sections */}
        <View style={newStyles.settingsSections}>
          {/* Account Section */}
          <View style={newStyles.settingsSection}>
            <Text style={[newStyles.sectionHeader, { color: colors.primary }]}>
              Account
            </Text>
            
            <View style={[newStyles.card, { 
              backgroundColor: colors.card,
              shadowColor: colors.dark,
            }]}>
              <TouchableOpacity 
                style={newStyles.settingItem}
                onPress={() => setShowProfileModal(true)}
              >
                <View style={newStyles.settingIconContainer}>
                  <Ionicons name="person-outline" size={22} color={colors.primary} />
                </View>
                <View style={newStyles.settingTextContainer}>
                  <Text style={[newStyles.settingTitle, { color: colors.dark }]}>
                    Account Details
                  </Text>
                  <Text style={[newStyles.settingDescription, { color: colors.medium }]}>
                    Update your profile information
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.medium} />
              </TouchableOpacity>
              
              <View style={newStyles.separator} />
              
              <TouchableOpacity 
                style={newStyles.settingItem}
                onPress={() => setShowExportModal(true)}
                disabled={exporting}
              >
                <View style={newStyles.settingIconContainer}>
                  <Ionicons name="download-outline" size={22} color={colors.primary} />
                </View>
                <View style={newStyles.settingTextContainer}>
                  <Text style={[newStyles.settingTitle, { color: colors.dark }]}>
                    Export Expenses
                  </Text>
                  <Text style={[newStyles.settingDescription, { color: colors.medium }]}>
                    Save your transaction history
                  </Text>
                </View>
                {exporting ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name="chevron-forward" size={20} color={colors.medium} />
                )}
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Appearance Section */}
          <View style={newStyles.settingsSection}>
            <Text style={[newStyles.sectionHeader, { color: colors.primary }]}>
              Appearance
            </Text>
            
            <View style={[newStyles.card, { 
              backgroundColor: colors.card,
              shadowColor: colors.dark,
            }]}>
              <View style={newStyles.settingItem}>
                <View style={newStyles.settingIconContainer}>
                  <Ionicons name={isDarkMode ? "moon" : "sunny"} size={22} color={colors.primary} />
                </View>
                <View style={newStyles.settingTextContainer}>
                  <Text style={[newStyles.settingTitle, { color: colors.dark }]}>
                    Dark Mode
                  </Text>
                  <Text style={[newStyles.settingDescription, { color: colors.medium }]}>
                    Switch between light and dark themes
                  </Text>
                </View>
                <Switch
                  value={isDarkMode}
                  onValueChange={toggleTheme}
                  trackColor={{ false: '#d1d5db', true: `${colors.primary}80` }}
                  thumbColor={isDarkMode ? colors.primary : '#f3f4f6'}
                  ios_backgroundColor="#d1d5db"
                  style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                />
              </View>
            </View>
          </View>
          
          {/* Security Section */}
          <View style={newStyles.settingsSection}>
            <Text style={[newStyles.sectionHeader, { color: colors.primary }]}>
              Security
            </Text>
            
            <View style={[newStyles.card, { 
              backgroundColor: colors.card,
              shadowColor: colors.dark,
            }]}>
              <View style={newStyles.settingItem}>
                <View style={newStyles.settingIconContainer}>
                  <Ionicons name="lock-closed-outline" size={22} color={colors.primary} />
                </View>
                <View style={newStyles.settingTextContainer}>
                  <Text style={[newStyles.settingTitle, { color: colors.dark }]}>
                    Biometric Lock
                  </Text>
                  <Text style={[newStyles.settingDescription, { color: colors.medium }]}>
                    Secure app with fingerprint or face ID
                  </Text>
                </View>
                <Switch
                  value={lockEnabled}
                  onValueChange={handleToggleLock}
                  trackColor={{ false: '#d1d5db', true: `${colors.primary}80` }}
                  thumbColor={lockEnabled ? colors.primary : '#f3f4f6'}
                  ios_backgroundColor="#d1d5db"
                  style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                />
              </View>
              
              <View style={newStyles.separator} />
              
              <TouchableOpacity 
                style={newStyles.settingItem}
                onPress={() => setShowPasswordModal(true)}
              >
                <View style={newStyles.settingIconContainer}>
                  <Ionicons name="key-outline" size={22} color={colors.primary} />
                </View>
                <View style={newStyles.settingTextContainer}>
                  <Text style={[newStyles.settingTitle, { color: colors.dark }]}>
                    Change Password
                  </Text>
                  <Text style={[newStyles.settingDescription, { color: colors.medium }]}>
                    Update your account password
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.medium} />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* About Section */}
          <View style={newStyles.settingsSection}>
            <Text style={[newStyles.sectionHeader, { color: colors.primary }]}>
              About
            </Text>
            
            <View style={[newStyles.card, { 
              backgroundColor: colors.card,
              shadowColor: colors.dark,
            }]}>
              <TouchableOpacity 
                style={newStyles.settingItem}
                onPress={() => {/* Navigate to help page */}}
              >
                <View style={newStyles.settingIconContainer}>
                  <Ionicons name="help-circle-outline" size={22} color={colors.primary} />
                </View>
                <View style={newStyles.settingTextContainer}>
                  <Text style={[newStyles.settingTitle, { color: colors.dark }]}>
                    Help & Support
                  </Text>
                  <Text style={[newStyles.settingDescription, { color: colors.medium }]}>
                    Get assistance with the app
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.medium} />
              </TouchableOpacity>
              
              <View style={newStyles.separator} />
              
              <TouchableOpacity 
                style={newStyles.settingItem}
                onPress={() => {/* Navigate to about page */}}
              >
                <View style={newStyles.settingIconContainer}>
                  <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
                </View>
                <View style={newStyles.settingTextContainer}>
                  <Text style={[newStyles.settingTitle, { color: colors.dark }]}>
                    About FinancePal
                  </Text>
                  <Text style={[newStyles.settingDescription, { color: colors.medium }]}>
                    Version 1.0.0
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.medium} />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Tips Card */}
          <View style={[newStyles.tipsCard, { 
            backgroundColor: isDarkMode ? colors.card : colors.card,
            shadowColor: colors.dark,
          }]}>
            <View style={newStyles.tipsHeader}>
              <View style={newStyles.tipsIconContainer}>
                <Ionicons name="bulb-outline" size={20} color="#fff" />
              </View>
              <Text style={[newStyles.tipsTitle, { color: colors.primary }]}>Pro Tips</Text>
            </View>
            
            <View style={newStyles.tipsList}>
              <View style={newStyles.tipItem}>
                <View style={newStyles.tipIconContainer}>
                  <Ionicons name="checkmark" size={14} color="#fff" />
                </View>
                <Text style={[newStyles.tipText, { color: colors.mediumDark || colors.dark }]}>
                  Use the year selector to view historical finances
                </Text>
              </View>
              
              <View style={newStyles.tipItem}>
                <View style={newStyles.tipIconContainer}>
                  <Ionicons name="checkmark" size={14} color="#fff" />
                </View>
                <Text style={[newStyles.tipText, { color: colors.mediumDark || colors.dark }]}>
                  Enable dark mode for better night-time viewing
                </Text>
              </View>
              
              <View style={newStyles.tipItem}>
                <View style={newStyles.tipIconContainer}>
                  <Ionicons name="checkmark" size={14} color="#fff" />
                </View>
                <Text style={[newStyles.tipText, { color: colors.mediumDark || colors.dark }]}>
                  Export your data regularly for backup purposes
                </Text>
              </View>
            </View>
          </View>
          
          {/* Logout Button */}
          <TouchableOpacity 
            style={[newStyles.logoutButton, { 
              backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.1)' : '#f5e1e1',
            }]}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text style={[newStyles.logoutText, { color: '#ef4444' }]}>Logout</Text>
          </TouchableOpacity>
          
          <Text style={[newStyles.copyrightText, { color: colors.medium }]}>
            © 2025 FinancePal. All rights reserved.
          </Text>
        </View>
      </ScrollView>
      
      {/* Export Options Modal */}
      <Modal
        visible={showExportModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowExportModal(false)}
      >
        <View style={modalStyles.modalOverlay}>
          <View style={[modalStyles.modalContainer, { 
            backgroundColor: colors.card,
          }]}>
            <View style={modalStyles.modalHeader}>
              <Text style={[modalStyles.modalTitle, { color: colors.dark }]}>Export Options</Text>
              <TouchableOpacity 
                style={[modalStyles.closeButton, { backgroundColor: `${colors.error}20` }]} 
                onPress={() => setShowExportModal(false)}
              >
                <Ionicons name="close" size={22} color={colors.error} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={modalStyles.modalContent}>
              <Text style={[modalStyles.sectionTitle, { color: colors.dark }]}>Export Format</Text>
              
              <View style={modalStyles.optionsContainer}>
                <TouchableOpacity 
                  style={[
                    modalStyles.optionButton, 
                    exportFormat === 'csv' && { 
                      backgroundColor: `${colors.primary}20`,
                      borderColor: colors.primary 
                    }
                  ]}
                  onPress={() => setExportFormat('csv')}
                >
                  <Ionicons 
                    name="document-text-outline" 
                    size={22} 
                    color={exportFormat === 'csv' ? colors.primary : colors.medium} 
                  />
                  <View style={modalStyles.optionTextContainer}>
                    <Text style={[
                      modalStyles.optionText, 
                      { color: exportFormat === 'csv' ? colors.primary : colors.dark }
                    ]}>
                      CSV Format
                    </Text>
                    <Text style={[modalStyles.optionDescription, { color: colors.medium }]}>
                      Export as CSV spreadsheet (most compatible)
                    </Text>
                  </View>
                  {exportFormat === 'csv' && (
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    modalStyles.optionButton, 
                    exportFormat === 'json' && { 
                      backgroundColor: `${colors.primary}20`,
                      borderColor: colors.primary 
                    }
                  ]}
                  onPress={() => setExportFormat('json')}
                >
                  <Ionicons 
                    name="code-outline" 
                    size={22} 
                    color={exportFormat === 'json' ? colors.primary : colors.medium} 
                  />
                  <View style={modalStyles.optionTextContainer}>
                    <Text style={[
                      modalStyles.optionText, 
                      { color: exportFormat === 'json' ? colors.primary : colors.dark }
                    ]}>
                      JSON Format
                    </Text>
                    <Text style={[modalStyles.optionDescription, { color: colors.medium }]}>
                      Export as JSON for developers or data processing
                    </Text>
                  </View>
                  {exportFormat === 'json' && (
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                  )}
                </TouchableOpacity>
              </View>
              
              <Text style={[modalStyles.sectionTitle, { color: colors.dark, marginTop: 24 }]}>
                Date Range
              </Text>
              
              <View style={modalStyles.optionsContainer}>
                <TouchableOpacity 
                  style={[
                    modalStyles.optionButton, 
                    exportDateRange === 'all' && { 
                      backgroundColor: `${colors.primary}20`,
                      borderColor: colors.primary 
                    }
                  ]}
                  onPress={() => setExportDateRange('all')}
                >
                  <Ionicons 
                    name="calendar" 
                    size={22} 
                    color={exportDateRange === 'all' ? colors.primary : colors.medium} 
                  />
                  <View style={modalStyles.optionTextContainer}>
                    <Text style={[
                      modalStyles.optionText, 
                      { color: exportDateRange === 'all' ? colors.primary : colors.dark }
                    ]}>
                      All Time
                    </Text>
                    <Text style={[modalStyles.optionDescription, { color: colors.medium }]}>
                      Export all your expense records
                    </Text>
                  </View>
                  {exportDateRange === 'all' && (
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    modalStyles.optionButton, 
                    exportDateRange === 'currentMonth' && { 
                      backgroundColor: `${colors.primary}20`,
                      borderColor: colors.primary 
                    }
                  ]}
                  onPress={() => setExportDateRange('currentMonth')}
                >
                  <Ionicons 
                    name="today-outline" 
                    size={22} 
                    color={exportDateRange === 'currentMonth' ? colors.primary : colors.medium} 
                  />
                  <View style={modalStyles.optionTextContainer}>
                    <Text style={[
                      modalStyles.optionText, 
                      { color: exportDateRange === 'currentMonth' ? colors.primary : colors.dark }
                    ]}>
                      Current Month
                    </Text>
                    <Text style={[modalStyles.optionDescription, { color: colors.medium }]}>
                      Export only this month's expenses
                    </Text>
                  </View>
                  {exportDateRange === 'currentMonth' && (
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    modalStyles.optionButton, 
                    exportDateRange === 'currentYear' && { 
                      backgroundColor: `${colors.primary}20`,
                      borderColor: colors.primary 
                    }
                  ]}
                  onPress={() => setExportDateRange('currentYear')}
                >
                  <Ionicons 
                    name="calendar-outline" 
                    size={22} 
                    color={exportDateRange === 'currentYear' ? colors.primary : colors.medium} 
                  />
                  <View style={modalStyles.optionTextContainer}>
                    <Text style={[
                      modalStyles.optionText, 
                      { color: exportDateRange === 'currentYear' ? colors.primary : colors.dark }
                    ]}>
                      Current Year
                    </Text>
                    <Text style={[modalStyles.optionDescription, { color: colors.medium }]}>
                      Export only this year's expenses
                    </Text>
                  </View>
                  {exportDateRange === 'currentYear' && (
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    modalStyles.optionButton, 
                    exportDateRange === 'custom' && { 
                      backgroundColor: `${colors.primary}20`,
                      borderColor: colors.primary 
                    }
                  ]}
                  onPress={() => setExportDateRange('custom')}
                >
                  <Ionicons 
                    name="calendar-number-outline" 
                    size={22} 
                    color={exportDateRange === 'custom' ? colors.primary : colors.medium} 
                  />
                  <View style={modalStyles.optionTextContainer}>
                    <Text style={[
                      modalStyles.optionText, 
                      { color: exportDateRange === 'custom' ? colors.primary : colors.dark }
                    ]}>
                      Last 90 Days
                    </Text>
                    <Text style={[modalStyles.optionDescription, { color: colors.medium }]}>
                      Export expenses from the last 90 days
                    </Text>
                  </View>
                  {exportDateRange === 'custom' && (
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
            
            <View style={modalStyles.footer}>
              <Button
                title="Export Now"
                onPress={handleExportExpenses}
                loading={exporting}
                variant="primary"
                leftIcon="download-outline"
                fullWidth
              />
            </View>
          </View>
        </View>
      </Modal>
      
      <BottomNavBar />

      {/* Password Change Modal */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={modalStyles.modalOverlay}>
          <View style={[passwordModalStyles.modalContainer, { 
            backgroundColor: colors.card,
          }]}>
            <View style={modalStyles.modalHeader}>
              <Text style={[modalStyles.modalTitle, { color: colors.dark }]}>Change Password</Text>
              <TouchableOpacity 
                style={[modalStyles.closeButton, { backgroundColor: `${colors.error}20` }]} 
                onPress={() => {
                  setShowPasswordModal(false);
                  // Clear form and errors when closing
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setPasswordErrors({});
                  setPasswordSuccess(false);
                }}
              >
                <Ionicons name="close" size={22} color={colors.error} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={modalStyles.modalContent}>
              {passwordSuccess ? (
                <View style={passwordModalStyles.successContainer}>
                  <View style={[passwordModalStyles.successIcon, { backgroundColor: Theme.colors.success }]}>
                    <Ionicons name="checkmark" size={28} color="#ffffff" />
                  </View>
                  <Text style={[passwordModalStyles.successTitle, { color: colors.dark }]}>
                    Password Updated
                  </Text>
                  <Text style={[passwordModalStyles.successMessage, { color: colors.medium }]}>
                    Your password has been changed successfully.
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={[passwordModalStyles.modalDescription, { color: colors.medium }]}>
                    Update your account password. For security, you'll need to enter your current password first.
                  </Text>
                  
                  {passwordErrors.general && (
                    <View style={passwordModalStyles.errorContainer}>
                      <Text style={passwordModalStyles.errorText}>{passwordErrors.general}</Text>
                    </View>
                  )}
                  
                  <View style={passwordModalStyles.inputContainer}>
                    <Text style={[passwordModalStyles.inputLabel, { color: colors.dark }]}>
                      Current Password
                    </Text>
                    <View style={[
                      passwordModalStyles.passwordInput, 
                      passwordErrors.currentPassword && { borderColor: colors.error }
                    ]}>
                      <TextInput
                        secureTextEntry={true}
                        placeholder="Enter your current password"
                        placeholderTextColor={colors.medium}
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        style={{ 
                          flex: 1, 
                          padding: 14, 
                          color: colors.dark,
                          fontSize: 16,
                        }}
                      />
                    </View>
                    {passwordErrors.currentPassword && (
                      <Text style={passwordModalStyles.fieldError}>
                        {passwordErrors.currentPassword}
                      </Text>
                    )}
                  </View>
                  
                  <View style={passwordModalStyles.inputContainer}>
                    <Text style={[passwordModalStyles.inputLabel, { color: colors.dark }]}>
                      New Password
                    </Text>
                    <View style={[
                      passwordModalStyles.passwordInput, 
                      passwordErrors.newPassword && { borderColor: colors.error }
                    ]}>
                      <TextInput
                        secureTextEntry={true}
                        placeholder="Enter new password (min. 6 characters)"
                        placeholderTextColor={colors.medium}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        style={{ 
                          flex: 1, 
                          padding: 14, 
                          color: colors.dark,
                          fontSize: 16,
                        }}
                      />
                    </View>
                    {passwordErrors.newPassword && (
                      <Text style={passwordModalStyles.fieldError}>
                        {passwordErrors.newPassword}
                      </Text>
                    )}
                  </View>
                  
                  <View style={passwordModalStyles.inputContainer}>
                    <Text style={[passwordModalStyles.inputLabel, { color: colors.dark }]}>
                      Confirm New Password
                    </Text>
                    <View style={[
                      passwordModalStyles.passwordInput, 
                      passwordErrors.confirmPassword && { borderColor: colors.error }
                    ]}>
                      <TextInput
                        secureTextEntry={true}
                        placeholder="Confirm your new password"
                        placeholderTextColor={colors.medium}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        style={{ 
                          flex: 1, 
                          padding: 14, 
                          color: colors.dark,
                          fontSize: 16,
                        }}
                      />
                    </View>
                    {passwordErrors.confirmPassword && (
                      <Text style={passwordModalStyles.fieldError}>
                        {passwordErrors.confirmPassword}
                      </Text>
                    )}
                  </View>
                </>
              )}
            </ScrollView>
            
            {!passwordSuccess && (
              <View style={modalStyles.footer}>
                <Button
                  title="Update Password"
                  onPress={handleChangePassword}
                  loading={passwordLoading}
                  variant="primary"
                  leftIcon="lock-closed-outline"
                  fullWidth
                />
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Profile Edit Modal */}
      <Modal
        visible={showProfileModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowProfileModal(false)}
      >
        <View style={modalStyles.modalOverlay}>
          <View style={[profileModalStyles.modalContainer, { 
            backgroundColor: colors.card,
          }]}>
            <View style={modalStyles.modalHeader}>
              <Text style={[modalStyles.modalTitle, { color: colors.dark }]}>Edit Profile</Text>
              <TouchableOpacity 
                style={[modalStyles.closeButton, { backgroundColor: `${colors.error}20` }]} 
                onPress={() => {
                  setShowProfileModal(false);
                  // Reset form and errors
                  setProfileFormErrors({});
                  setProfileUpdateSuccess(false);
                }}
              >
                <Ionicons name="close" size={22} color={colors.error} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={modalStyles.modalContent}>
              {profileUpdateSuccess ? (
                <View style={profileModalStyles.successContainer}>
                  <View style={[profileModalStyles.successIcon, { backgroundColor: Theme.colors.success }]}>
                    <Ionicons name="checkmark" size={28} color="#ffffff" />
                  </View>
                  <Text style={[profileModalStyles.successTitle, { color: colors.dark }]}>
                    Profile Updated
                  </Text>
                  <Text style={[profileModalStyles.successMessage, { color: colors.medium }]}>
                    Your profile information has been updated successfully.
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={[profileModalStyles.modalDescription, { color: colors.medium }]}>
                    Update your personal information below.
                  </Text>
                  
                  {profileFormErrors.general && (
                    <View style={profileModalStyles.errorContainer}>
                      <Text style={profileModalStyles.errorText}>{profileFormErrors.general}</Text>
                    </View>
                  )}
                  
                  <View style={profileModalStyles.profileImageSection}>
                    <Image
                      source={{ uri: user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent((profileForm.firstName || 'U').charAt(0))}&background=${colors.primary.replace('#', '')}&color=fff&bold=true&size=128` }}
                      style={profileModalStyles.profileImage}
                    />
                    {/* Note: Profile image update would require additional storage handling */}
                  </View>
                  
                  <View style={profileModalStyles.inputContainer}>
                    <Text style={[profileModalStyles.inputLabel, { color: colors.dark }]}>
                      First Name <Text style={{ color: colors.error }}>*</Text>
                    </Text>
                    <View style={[
                      profileModalStyles.textInput, 
                      profileFormErrors.firstName && { borderColor: colors.error }
                    ]}>
                      <TextInput
                        placeholder="Enter your first name"
                        placeholderTextColor={colors.medium}
                        value={profileForm.firstName}
                        onChangeText={(text) => setProfileForm(prev => ({ ...prev, firstName: text }))}
                        style={{ 
                          flex: 1, 
                          padding: 14, 
                          color: colors.dark,
                          fontSize: 16,
                        }}
                      />
                    </View>
                    {profileFormErrors.firstName && (
                      <Text style={profileModalStyles.fieldError}>
                        {profileFormErrors.firstName}
                      </Text>
                    )}
                  </View>
                  
                  <View style={profileModalStyles.inputContainer}>
                    <Text style={[profileModalStyles.inputLabel, { color: colors.dark }]}>
                      Last Name
                    </Text>
                    <View style={profileModalStyles.textInput}>
                      <TextInput
                        placeholder="Enter your last name"
                        placeholderTextColor={colors.medium}
                        value={profileForm.lastName}
                        onChangeText={(text) => setProfileForm(prev => ({ ...prev, lastName: text }))}
                        style={{ 
                          flex: 1, 
                          padding: 14, 
                          color: colors.dark,
                          fontSize: 16,
                        }}
                      />
                    </View>
                  </View>
                  
                  <View style={profileModalStyles.inputContainer}>
                    <Text style={[profileModalStyles.inputLabel, { color: colors.dark }]}>
                      Phone Number
                    </Text>
                    <View style={profileModalStyles.textInput}>
                      <TextInput
                        placeholder="Enter your phone number"
                        placeholderTextColor={colors.medium}
                        value={profileForm.phoneNumber}
                        onChangeText={(text) => setProfileForm(prev => ({ ...prev, phoneNumber: text }))}
                        keyboardType="phone-pad"
                        style={{ 
                          flex: 1, 
                          padding: 14, 
                          color: colors.dark,
                          fontSize: 16,
                        }}
                      />
                    </View>
                  </View>
                  
                  <View style={profileModalStyles.inputContainer}>
                    <Text style={[profileModalStyles.inputLabel, { color: colors.dark }]}>
                      Email
                    </Text>
                    <View style={[profileModalStyles.textInput, { backgroundColor: isDarkMode ? colors.darker : '#f3f4f6' }]}>
                      <TextInput
                        value={user?.email || ''}
                        editable={false}
                        style={{ 
                          flex: 1, 
                          padding: 14, 
                          color: colors.medium,
                          fontSize: 16,
                        }}
                      />
                    </View>
                    <Text style={[profileModalStyles.helperText, { color: colors.medium }]}>
                      Email cannot be changed
                    </Text>
                  </View>
                </>
              )}
            </ScrollView>
            
            {!profileUpdateSuccess && (
              <View style={modalStyles.footer}>
                <Button
                  title="Save Changes"
                  onPress={handleUpdateProfile}
                  loading={profileUpdateLoading}
                  variant="primary"
                  leftIcon="save-outline"
                  fullWidth
                />
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const newStyles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 46,
    paddingBottom: 16,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
  },
  profileCard: {
    margin: 16,
    borderRadius: 20,
    padding: 20,
    borderWidth: 0, // Changed from 1 to 0
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  profileLoadingContainer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    textAlign: 'center',
    padding: 20,
  },
  profileWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatarSection: {
    position: 'relative',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
  },
  profileEdit: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#4f46e5',
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfoContainer: {
    marginLeft: 16,
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    marginBottom: 8,
  },
  memberSinceContainer: {
    marginTop: 4,
  },
  memberSinceText: {
    fontSize: 12,
  },
  settingsSections: {
    paddingHorizontal: 16,
  },
  settingsSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 0, // Changed from 1 to 0
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  settingIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    marginRight: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    marginLeft: 64,
  },
  tipsCard: {
    borderRadius: 20,
    padding: 0,
    marginBottom: 24,
    borderWidth: 0,
    backgroundColor: "#fff",
    overflow: "hidden",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  tipsIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6366f1', // More like the purple in the reference
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6366f1', // More like the purple in the reference
  },
  tipsList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipIconContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#6366f1', // More like the purple in the reference
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tipText: {
    fontSize: 14,
    flex: 1,
    color: '#4b5563', // Darker gray like in the reference
    lineHeight: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 0,
    backgroundColor: '#f5e1e1', // Matches the light red in the reference
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
    color: '#ef4444', // Matches the red in the reference
  },
  copyrightText: {
    textAlign: 'center',
    fontSize: 12,
    marginBottom: 32,
  },
});

// Keep the existing modal styles but update the modal container
const modalStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: colors => colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    maxHeight: '80%',
    borderWidth: 0, // Changed from 1 to 0
    borderBottomWidth: 0,
    // Enhanced shadow to compensate for removed border
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    flex: 1,
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
  },
  modalContent: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  optionsContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: colors => colors.light,
    marginBottom: 8,
    borderRadius: 10,
  },
  optionTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  optionDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  footer: {
    paddingTop: 16,
  },
});

const passwordModalStyles = StyleSheet.create({
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    maxHeight: '80%',
    borderWidth: 0, // Changed from 1 to 0
    borderBottomWidth: 0,
    // Enhanced shadow to compensate for removed border
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  successIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 16,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 16,
    marginBottom: 16,
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 14,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldError: {
    color: '#b91c1c',
    fontSize: 12,
    marginTop: 4,
  },
});

const profileModalStyles = StyleSheet.create({
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    maxHeight: '80%',
    borderWidth: 0, // Changed from 1 to 0
    borderBottomWidth: 0,
    // Enhanced shadow to compensate for removed border
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  successIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 16,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 16,
    marginBottom: 16,
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 14,
  },
  profileImageSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#e5e7eb',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldError: {
    color: '#b91c1c',
    fontSize: 12,
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
  },
});