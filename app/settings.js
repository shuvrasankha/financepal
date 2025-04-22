import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView, ActivityIndicator, Image, Switch, Modal, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import styles from '../styles/SettingsStyles';
import BottomNavBar from './components/BottomNavBar';
import { useTheme } from '../contexts/ThemeContext';
import { useError, ERROR_TYPES } from '../contexts/ErrorContext';
import { useExpenses } from '../contexts/ExpenseContext';
import Theme from '../constants/Theme';
import Button from './components/Button';

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

  // Handle user logout
  const handleLogout = async () => {
    try {
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

  return (
    <>
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.profileSection, { backgroundColor: colors.card }]}>
          {profileLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : profileError ? (
            <Text style={{ color: colors.error }}>{profileError}</Text>
          ) : (
            <>
              <Image
                source={{ uri: user?.photoURL || 'https://ui-avatars.com/api/?name=' + (userProfile?.firstName || userProfile?.email || 'User') }}
                style={styles.avatar}
              />
              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { color: colors.dark }]}>
                  {userProfile?.firstName || ''} {userProfile?.lastName || ''}
                </Text>
                <Text style={[styles.profileEmail, { color: colors.medium }]}>
                  {userProfile?.email || user?.email || ''}
                </Text>
              </View>
            </>
          )}
        </View>
        
        <Text style={[styles.sectionHeader, { color: colors.primary }]}>Manage</Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => setShowExportModal(true)}
            disabled={exporting}
          >
            <Ionicons name="download-outline" size={22} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.primary }]}>Export Expenses</Text>
            {exporting && <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 8 }} />}
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.lastActionButton]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={22} color={colors.error} />
            <Text style={[styles.actionText, { color: colors.error }]}>Logout</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionHeader, { color: colors.primary }]}>Appearance</Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={[styles.actionButton, styles.lastActionButton]}> 
            <Ionicons 
              name={isDarkMode ? "moon" : "sunny"} 
              size={22} 
              color={colors.primary} 
            />
            <Text style={[styles.actionText, { color: colors.dark }]}>Dark Mode</Text>
            <Switch
              style={{ marginLeft: 'auto' }}
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{ false: '#d1d5db', true: `${colors.primary}80` }}
              thumbColor={isDarkMode ? colors.primary : '#f3f4f6'}
            />
          </View>
        </View>

        <Text style={[styles.sectionHeader, { color: colors.primary }]}>Security</Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={[styles.actionButton, styles.lastActionButton]}> 
            <Ionicons name="lock-closed-outline" size={22} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.dark }]}>App Lock</Text>
            <Switch
              style={{ marginLeft: 'auto' }}
              value={lockEnabled}
              onValueChange={handleToggleLock}
              trackColor={{ false: '#d1d5db', true: `${colors.primary}80` }}
              thumbColor={lockEnabled ? colors.primary : '#f3f4f6'}
            />
          </View>
        </View>

        <View style={[
          styles.card, 
          {
            paddingHorizontal: 20, 
            paddingVertical: 18, 
            marginBottom: 32, 
            backgroundColor: isDarkMode ? `${colors.primary}20` : '#eef2ff', 
            borderWidth: 1, 
            borderColor: isDarkMode ? `${colors.primary}40` : '#c7d2fe'
          }
        ]}>
          <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 8}}>
            <Ionicons name="bulb-outline" size={22} color={colors.primary} style={{marginRight: 8}} />
            <Text style={[styles.quickTipsTitle, {marginLeft: 0, color: colors.primary}]}>Quick Tips</Text>
          </View>
          <Text style={[styles.quickTip, {color: colors.medium}]}>• Tap on a card to add new entries or view details.</Text>
          <Text style={[styles.quickTip, {color: colors.medium}]}>• Use the year selector to view your financial summary for previous years.</Text>
          <Text style={[styles.quickTip, {color: colors.medium}]}>• Navigate using the bottom bar for Expenses, Analysis, and Settings.</Text>
          <Text style={[styles.quickTip, {color: colors.medium}]}>• Toggle dark mode for better viewing in low-light conditions.</Text>
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
          <View style={[modalStyles.modalContainer, { backgroundColor: colors.card }]}>
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
      {/* Add some empty space at the bottom for better scroll padding */}
      <View style={{ height: 80 }} />
    </>
  );
}

const modalStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    maxHeight: '80%',
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
    borderColor: '#e5e7eb',
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