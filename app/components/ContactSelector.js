import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Modal, 
  FlatList, 
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Alert,
  StatusBar,
  Animated,
  UIManager,
  LayoutAnimation,
  BackHandler,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Image,
  SafeAreaView
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import { useTheme } from '../../contexts/ThemeContext';
import Theme from '../../constants/Theme';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const ContactSelector = ({ onSelectContact }) => {
  const { isDarkMode, suspendAppLock, resumeAppLock } = useTheme();
  const colors = isDarkMode ? Theme.dark.colors : Theme.light.colors;
  const shadows = isDarkMode ? Theme.shadowsDark : Theme.shadows;
  
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [allContactsLoaded, setAllContactsLoaded] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [recentContacts, setRecentContacts] = useState([]);
  const [selectedContactId, setSelectedContactId] = useState(null);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;
  const searchInputRef = useRef(null);
  
  // Handle back button press on Android
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (modalVisible) {
          closeModal();
          return true;
        }
        return false;
      }
    );

    return () => backHandler.remove();
  }, [modalVisible]);

  // Show animation when modal becomes visible
  useEffect(() => {
    if (modalVisible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
      
      const focusDelay = Platform.OS === 'android' ? 300 : 500;
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, focusDelay);
    } else {
      // Reset animations when modal closes
      fadeAnim.setValue(0);
      slideAnim.setValue(300);
    }
  }, [modalVisible, fadeAnim, slideAnim]);
  
  // Open modal and load contacts
  const openContactSelector = () => {
    // Suspend app lock before accessing contacts
    suspendAppLock();
    console.log('Suspended app lock for contact selection');
    
    setModalVisible(true);
    setPageIndex(0);
    setAllContactsLoaded(false);
    setContacts([]);
    setFilteredContacts([]);
    loadContacts();
    
    // Load recent contacts from storage
    // In a real app, you'd load this from AsyncStorage or similar
    // For now, we'll just use a placeholder
    setRecentContacts([]);
  };
  
  // Close modal
  const closeModal = () => {
    Keyboard.dismiss();
    
    // Using animation to close
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 250,
        useNativeDriver: true,
      })
    ]).start(() => {
      setModalVisible(false);
      setSearchQuery('');
      setSelectedContactId(null);
      
      // Resume app lock after contact selection is complete
      resumeAppLock();
      console.log('Resumed app lock after contact selection');
    });
  };
  
  // Filter contacts based on search query
  const filterContacts = useCallback((query) => {
    if (!query.trim()) {
      setFilteredContacts(contacts);
      return;
    }
    
    const normalizedQuery = query.toLowerCase().trim();
    
    // Filter contacts that match the search query
    const filtered = contacts.filter(contact => 
      contact.name.toLowerCase().includes(normalizedQuery) ||
      (contact.phoneNumber && contact.phoneNumber.includes(normalizedQuery))
    );
    
    setFilteredContacts(filtered);
  }, [contacts]);

  // Update filtered contacts when search query changes
  useEffect(() => {
    filterContacts(searchQuery);
  }, [searchQuery, filterContacts]);

  // Load contacts using pagination for better performance
  const loadContacts = async (loadMore = false) => {
    if ((loading && !loadMore) || (loadingMore && loadMore) || allContactsLoaded) return;
    
    try {
      if (loadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      
      const { status } = await Contacts.requestPermissionsAsync();
      
      if (status !== 'granted') {
        setPermissionDenied(true);
        setLoading(false);
        setLoadingMore(false);
        return;
      }
      
      // Reset permission denied flag if previously denied
      setPermissionDenied(false);

      // Use pagination for better performance
      const pageSize = Platform.OS === 'android' ? 50 : 100;
      const currentPageIndex = loadMore ? pageIndex + 1 : 0;
      
      const { data, hasNextPage } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.Name,
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Image,
        ],
        pageSize: pageSize,
        pageOffset: currentPageIndex * pageSize,
        sort: Contacts.SortTypes.FirstName
      });
      
      if (!hasNextPage) {
        setAllContactsLoaded(true);
      }
      
      // Process valid contacts (those with phone numbers)
      const validContacts = [];
      data.forEach(contact => {
        if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
          // Create a separate entry for each phone number to avoid duplicate key issues
          contact.phoneNumbers.forEach((phone, phoneIndex) => {
            validContacts.push({
              id: `${contact.id}-${phoneIndex}`, // Create unique ID for each phone number
              contactId: contact.id,
              name: contact.name || 'Unknown',
              phoneNumber: phone.number || '',
              phoneLabel: phone.label || '',
              initials: getInitials(contact.name || 'Unknown'),
              imageUri: contact.image?.uri
            });
          });
        }
      });
      
      if (loadMore) {
        setPageIndex(currentPageIndex);
        setContacts(prevContacts => [...prevContacts, ...validContacts]);
        setFilteredContacts(prevFiltered => {
          if (searchQuery.trim()) {
            // If we're searching, only add contacts that match
            const normalizedQuery = searchQuery.toLowerCase().trim();
            const newFilteredContacts = validContacts.filter(contact => 
              contact.name.toLowerCase().includes(normalizedQuery) ||
              (contact.phoneNumber && contact.phoneNumber.includes(normalizedQuery))
            );
            return [...prevFiltered, ...newFilteredContacts];
          } else {
            return [...prevFiltered, ...validContacts];
          }
        });
      } else {
        setPageIndex(0);
        setContacts(validContacts);
        setFilteredContacts(validContacts);
      }
      
    } catch (error) {
      console.error('Error loading contacts:', error);
      Alert.alert(
        'Error Loading Contacts', 
        'There was a problem loading your contacts. Please check permissions and try again.'
      );
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Function to get initials from name
  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(part => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  // Function to handle contact selection with animation
  const handleSelectContact = (contact) => {
    setSelectedContactId(contact.id);
    
    // Animate selection
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        300,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity
      )
    );
    
    // Add to recent contacts
    const updatedRecentContacts = [
      contact,
      ...recentContacts.filter(c => c.id !== contact.id).slice(0, 4)
    ];
    setRecentContacts(updatedRecentContacts);
    
    // Small delay for visual feedback before closing
    setTimeout(() => {
      // Provide selected contact to parent component
      onSelectContact({
        name: contact.name,
        phoneNumber: contact.phoneNumber
      });
      
      // Close modal
      closeModal();
    }, 150);
  };
  
  // Function to format phone number for display
  const formatPhoneNumber = (phoneNumber) => {
    if (!phoneNumber) return '';
    
    // Remove non-numeric characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Format based on length (basic formatting)
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    
    // Return original if can't format
    return phoneNumber;
  };
  
  // Handle reaching end of list for pagination
  const handleEndReached = () => {
    if (!loading && !loadingMore && !allContactsLoaded && contacts.length > 0) {
      loadContacts(true);
    }
  };

  // Render footer for FlatList with loading indicator
  const renderFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.loadingMoreText, { color: colors.medium }]}>
          Loading more contacts...
        </Text>
      </View>
    );
  };

  // Render individual contact item with optimizations
  const renderContactItem = useCallback(({ item }) => {
    const isSelected = selectedContactId === item.id;
    
    return (
      <TouchableOpacity 
        style={[
          styles.contactItem,
          { 
            backgroundColor: isSelected 
              ? (isDarkMode ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.1)')
              : colors.card 
          },
          Platform.OS === 'android' && {
            borderBottomWidth: 1,
            borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
          }
        ]}
        activeOpacity={0.7}
        onPress={() => handleSelectContact(item)}
      >
        {/* Contact Avatar */}
        {item.imageUri ? (
          <Image 
            source={{ uri: item.imageUri }} 
            style={styles.contactImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[
            styles.avatar,
            { backgroundColor: isDarkMode ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)' }
          ]}>
            <Text style={[styles.initials, { color: colors.primary }]}>
              {item.initials}
            </Text>
          </View>
        )}
        
        {/* Contact Details */}
        <View style={styles.contactInfo}>
          <Text 
            style={[styles.contactName, { color: colors.dark }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {item.name}
          </Text>
          <Text 
            style={[styles.contactPhone, { color: colors.medium }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {formatPhoneNumber(item.phoneNumber)}
          </Text>
        </View>
        
        {/* Selection indicator */}
        <View style={styles.checkboxContainer}>
          {isSelected ? (
            <View style={[styles.checkbox, { backgroundColor: colors.primary }]}>
              <Ionicons name="checkmark" size={16} color="#ffffff" />
            </View>
          ) : (
            <View style={[styles.checkbox, { borderColor: colors.medium }]} />
          )}
        </View>
      </TouchableOpacity>
    );
  }, [colors, isDarkMode, handleSelectContact, selectedContactId]);

  // Recent contacts section
  const renderRecentContacts = () => {
    if (recentContacts.length === 0 || searchQuery.trim() !== '') return null;
    
    return (
      <View style={styles.recentContactsContainer}>
        <Text style={[styles.sectionTitle, { color: colors.medium }]}>
          Recent Contacts
        </Text>
        <FlatList
          data={recentContacts}
          keyExtractor={(item) => `recent-${item.id}`}
          renderItem={renderContactItem}
          horizontal
          contentContainerStyle={styles.recentContactsList}
          showsHorizontalScrollIndicator={false}
        />
        <View style={[styles.divider, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} />
      </View>
    );
  };

  // Render empty state
  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyState}>
      <Ionicons 
        name={permissionDenied ? "lock-closed" : (searchQuery ? "search" : "people")} 
        size={50} 
        color={colors.medium} 
      />
      <Text style={[styles.emptyText, { color: colors.medium }]}>
        {permissionDenied 
          ? "Permission to access contacts was denied"
          : searchQuery 
            ? "No contacts match your search" 
            : "No contacts found"
        }
      </Text>
      {permissionDenied && (
        <TouchableOpacity
          style={[styles.permissionButton, { backgroundColor: colors.primary }]}
          onPress={loadContacts}
        >
          <Text style={{ color: colors.white, fontWeight: 'bold' }}>
            Try Again
          </Text>
        </TouchableOpacity>
      )}
    </View>
  ), [permissionDenied, colors, searchQuery, loadContacts]);

  // Render contact picker button
  const renderContactButton = () => (
    <TouchableOpacity 
      onPress={openContactSelector} 
      style={[
        styles.contactButton,
        { 
          backgroundColor: colors.primary,
          ...shadows.sm
        }
      ]}
      activeOpacity={0.8}
    >
      <Ionicons name="people" size={22} color={colors.white} />
    </TouchableOpacity>
  );

  return (
    <>
      {/* Contact Picker Button */}
      {renderContactButton()}
      
      {/* Contact Selector Modal */}
      <Modal
        visible={modalVisible}
        animationType="none"
        transparent={true}
        onRequestClose={closeModal}
        statusBarTranslucent={Platform.OS === 'android'}
      >
        <Animated.View 
          style={[
            styles.modalOverlay,
            { 
              backgroundColor: 'rgba(0,0,0,0.5)',
              opacity: fadeAnim
            }
          ]}
        >
          <TouchableWithoutFeedback onPress={closeModal}>
            <View style={styles.modalBackground} />
          </TouchableWithoutFeedback>
          
          <KeyboardAvoidingView 
            style={{ flex: 1, justifyContent: 'flex-end' }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <Animated.View 
              style={[
                styles.modalContent,
                { 
                  backgroundColor: colors.card,
                  transform: [{ translateY: slideAnim }]
                }
              ]}
            >
              {/* Handle for pulling up/down */}
              <View style={styles.modalHandle}>
                <View style={[styles.handle, { backgroundColor: isDarkMode ? '#555' : '#ccc' }]} />
              </View>
              
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.dark }]}>
                  Select Contact
                </Text>
                <TouchableOpacity 
                  style={[styles.closeButton, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} 
                  onPress={closeModal}
                >
                  <Ionicons name="close" size={20} color={colors.medium} />
                </TouchableOpacity>
              </View>
              
              {/* Search Box */}
              <View style={[styles.searchContainer, { backgroundColor: isDarkMode ? colors.lighter : '#f3f4f6' }]}>
                <Ionicons name="search" size={20} color={colors.medium} />
                <TextInput
                  ref={searchInputRef}
                  style={[styles.searchInput, { color: colors.dark }]}
                  placeholder="Search contacts"
                  placeholderTextColor={colors.medium}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  returnKeyType="search"
                  autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={18} color={colors.medium} />
                  </TouchableOpacity>
                )}
              </View>
              
              {/* Recent Contacts */}
              {renderRecentContacts()}
              
              {/* Contacts List */}
              {!loading && contacts.length === 0 ? (
                renderEmptyState()
              ) : (
                <FlatList
                  data={filteredContacts}
                  keyExtractor={(item) => item.id}
                  renderItem={renderContactItem}
                  contentContainerStyle={[
                    { flexGrow: 1 },
                    filteredContacts.length === 0 && { justifyContent: 'center' }
                  ]}
                  ListEmptyComponent={!loading ? renderEmptyState : null}
                  ListFooterComponent={renderFooter}
                  initialNumToRender={10}
                  maxToRenderPerBatch={10}
                  windowSize={10}
                  removeClippedSubviews={Platform.OS === 'android'}
                  keyboardShouldPersistTaps="handled"
                  onEndReached={handleEndReached}
                  onEndReachedThreshold={0.3}
                />
              )}
              
              {/* Loading Indicator */}
              {loading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={[styles.loadingText, { color: colors.medium }]}>
                    Loading contacts...
                  </Text>
                </View>
              )}
            </Animated.View>
          </KeyboardAvoidingView>
        </Animated.View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  contactButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  modalHandle: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    padding: 0,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  contactImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  contactInfo: {
    flex: 1,
    marginLeft: 16,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  contactPhone: {
    fontSize: 14,
  },
  checkboxContainer: {
    marginLeft: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  footerLoader: {
    alignItems: 'center',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loadingMoreText: {
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
  },
  permissionButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  recentContactsContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  recentContactsList: {
    paddingBottom: 10,
  },
  divider: {
    height: 1,
    marginTop: 10,
  },
});

export default ContactSelector;