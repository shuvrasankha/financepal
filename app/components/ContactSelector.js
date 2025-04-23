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
  const { isDarkMode } = useTheme();
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
  
  // Animation values (simplified for Android)
  const fadeAnim = useRef(new Animated.Value(0)).current;
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

  // Show animation when modal becomes visible (simplified for Android)
  useEffect(() => {
    if (modalVisible) {
      // Use a simpler animation for Android
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      
      // Auto focus search input with a shorter delay for Android
      const focusDelay = Platform.OS === 'android' ? 300 : 500;
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, focusDelay);
    } else {
      // Reset animations when modal closes
      fadeAnim.setValue(0);
    }
  }, [modalVisible, fadeAnim]);
  
  // Open modal and load contacts
  const openContactSelector = () => {
    setModalVisible(true);
    setPageIndex(0);
    setAllContactsLoaded(false);
    setContacts([]);
    setFilteredContacts([]);
    loadContacts();
  };
  
  // Close modal
  const closeModal = () => {
    Keyboard.dismiss();
    setModalVisible(false);
    setSearchQuery('');
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

  // Load contacts using pagination for better Android performance
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

      // Use pagination for Android to improve performance
      const pageSize = 50; // Smaller page size for Android
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
      const validContacts = data
        .filter(contact => contact.phoneNumbers && contact.phoneNumbers.length > 0)
        .map(contact => ({
          id: contact.id,
          name: contact.name || 'Unknown',
          phoneNumber: contact.phoneNumbers[0]?.number || '',
          phoneLabel: contact.phoneNumbers[0]?.label || '',
          initials: getInitials(contact.name || 'Unknown'),
          imageUri: contact.image?.uri
        }));
      
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

  // Function to handle contact selection with simpler animation for Android
  const handleSelectContact = (contact) => {
    // Simplified animation for Android
    if (Platform.OS === 'ios') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    
    // Provide selected contact to parent component
    onSelectContact({
      name: contact.name,
      phoneNumber: contact.phoneNumber
    });
    
    // Close modal
    closeModal();
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
  
  // Function to determine phone label
  const getPhoneLabel = (label) => {
    if (!label) return '';
    
    // Convert standard phone labels to human-readable form
    const labelMap = {
      'home': 'Home',
      'work': 'Work',
      'mobile': 'Mobile',
      'main': 'Main',
      'other': 'Other'
    };
    
    return labelMap[label.toLowerCase()] || label;
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

  // Render individual contact item with optimizations for Android
  const renderContactItem = useCallback(({ item }) => {
    // Use a more Android-friendly style for better performance
    const androidSpecificStyles = Platform.OS === 'android' ? {
      elevation: 0,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
      borderRadius: 0,
      marginHorizontal: 0,
      paddingHorizontal: 16,
    } : {};
    
    return (
      <TouchableOpacity 
        style={[
          styles.contactItem,
          { backgroundColor: colors.card },
          androidSpecificStyles
        ]}
        activeOpacity={0.7}
        onPress={() => handleSelectContact(item)}
      >
        {/* Contact Image/Avatar with fallback for Android */}
        {(item.imageUri && Platform.OS === 'ios') ? (
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
            <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 16 }}>
              {item.initials || '?'}
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
            {item.name || 'Unknown'}
          </Text>
          <View style={styles.phoneContainer}>
            {item.phoneLabel && Platform.OS === 'ios' && (
              <Text style={[styles.phoneLabel, { color: colors.medium }]}>
                {getPhoneLabel(item.phoneLabel) || ''}
              </Text>
            )}
            <Text 
              style={[styles.contactPhone, { color: colors.medium }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {formatPhoneNumber(item.phoneNumber) || ''}
            </Text>
          </View>
        </View>
        
        {/* Selection indicator */}
        <View style={styles.selectionIndicator}>
          <MaterialIcons 
            name={Platform.OS === 'android' ? "check-circle-outline" : "keyboard-arrow-right"} 
            size={24} 
            color={colors.primary} 
          />
        </View>
      </TouchableOpacity>
    );
  }, [colors, handleSelectContact, isDarkMode]);

  // Android doesn't need an item separator since we're using borderBottom
  const ItemSeparator = useCallback(() => (
    Platform.OS === 'ios' ? (
      <View style={{ 
        height: 1, 
        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
        marginLeft: 72 // Align with the start of contact name
      }} />
    ) : null
  ), [isDarkMode]);
  
  // Render empty state
  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyState}>
      <Ionicons 
        name={permissionDenied ? "lock-closed" : "people"} 
        size={50} 
        color={colors.medium} 
      />
      <Text style={[styles.emptyText, { color: colors.medium }]}>
        {permissionDenied 
          ? "Permission to access contacts was denied. Please grant permission in your settings."
          : searchQuery 
            ? "No contacts match your search" 
            : loading ? "Loading contacts..." : "No contacts found on your device"
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
  ), [permissionDenied, colors, searchQuery, loadContacts, loading]);

  // Android-optimized search bar
  const renderSearchBar = () => (
    <View style={[
      styles.searchContainer, 
      { 
        backgroundColor: isDarkMode ? colors.lighter : '#f3f4f6',
        ...Platform.select({
          android: {
            elevation: 2,
            marginTop: 0,
            marginBottom: 8,
            marginHorizontal: 0,
            borderRadius: 0
          },
          ios: {
            ...shadows.sm,
            margin: 16,
            borderRadius: 10
          }
        })
      }
    ]}>
      <Ionicons name="search" size={20} color={colors.medium} style={styles.searchIcon} />
      <TextInput
        ref={searchInputRef}
        style={[styles.searchInput, { color: colors.dark }]}
        placeholder="Search contacts..."
        placeholderTextColor={colors.medium}
        value={searchQuery}
        onChangeText={setSearchQuery}
        autoCapitalize="none"
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
      {searchQuery.length > 0 && (
        <TouchableOpacity 
          onPress={() => setSearchQuery('')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close-circle" size={20} color={colors.medium} />
        </TouchableOpacity>
      )}
    </View>
  );

  // Android-optimized header
  const renderHeader = () => (
    <View style={[
      styles.header, 
      { 
        backgroundColor: colors.primary,
        borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
        ...Platform.select({
          android: {
            elevation: 4,
            paddingTop: StatusBar.currentHeight || 20,
          },
          ios: {
            ...shadows.sm
          }
        })
      }
    ]}>
      <TouchableOpacity 
        style={styles.closeButton} 
        onPress={closeModal}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={24} color={colors.white} />
      </TouchableOpacity>
      <Text style={[styles.title, { color: colors.white }]}>
        Select Contact
      </Text>
      <View style={{ width: 40 }} />  {/* Empty view for balanced header */}
    </View>
  );

  // Contact picker button
  const renderContactButton = () => (
    <TouchableOpacity 
      onPress={openContactSelector} 
      style={[
        styles.contactButton,
        { 
          backgroundColor: colors.primary,
          ...Platform.select({
            android: {
              elevation: 4
            },
            ios: {
              ...shadows.sm
            }
          })
        }
      ]}
      activeOpacity={0.8}
    >
      <Ionicons name="people" size={24} color={colors.white} />
    </TouchableOpacity>
  );

  return (
    <>
      {/* Contact Picker Button */}
      {renderContactButton()}
      
      {/* Contact Selector Modal */}
      <Modal
        visible={modalVisible}
        animationType={Platform.OS === 'android' ? "slide" : "none"} // Use built-in animations for Android
        transparent={false}
        onRequestClose={closeModal}
        statusBarTranslucent={Platform.OS === 'android'}
      >
        <SafeAreaView style={{ 
          flex: 1, 
          backgroundColor: colors.background,
          ...(Platform.OS === 'android' && { paddingTop: 0 })
        }}>
          <StatusBar 
            barStyle="light-content" 
            backgroundColor={colors.primary}
            translucent={Platform.OS === 'android'}
          />
          
          <KeyboardAvoidingView 
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <Animated.View 
              style={[
                styles.container, 
                { 
                  backgroundColor: colors.background,
                  opacity: fadeAnim
                }
              ]}
            >
              {/* Header */}
              {renderHeader()}

              {/* Search Box */}
              {renderSearchBar()}

              {(!loading && contacts.length === 0) ? (
                renderEmptyState()
              ) : (
                <FlatList
                  data={filteredContacts}
                  keyExtractor={(item) => item.id || item.name}
                  renderItem={renderContactItem}
                  contentContainerStyle={[
                    styles.listContainer,
                    filteredContacts.length === 0 && !loading && styles.emptyListContainer
                  ]}
                  ListEmptyComponent={!loading ? renderEmptyState : null}
                  ListFooterComponent={renderFooter}
                  initialNumToRender={10}
                  maxToRenderPerBatch={10}
                  windowSize={5}
                  removeClippedSubviews={Platform.OS === 'android'}
                  keyboardShouldPersistTaps="handled"
                  ItemSeparatorComponent={ItemSeparator}
                  onEndReached={handleEndReached}
                  onEndReachedThreshold={0.3}
                />
              )}
              
              {loading && (
                <View style={styles.loadingOverlay}>
                  <View style={[styles.loadingContainer, { backgroundColor: colors.card }]}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.medium }]}>
                      Loading contacts...
                    </Text>
                  </View>
                </View>
              )}
            </Animated.View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  contactItem: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  contactImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneLabel: {
    fontSize: 14,
    marginRight: 4,
  },
  contactPhone: {
    fontSize: 14,
  },
  selectionIndicator: {
    marginLeft: 8,
  },
  listContainer: {
    paddingBottom: 20,
    flexGrow: 1,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  loadingContainer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 16,
    lineHeight: 22,
  },
  permissionButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  contactButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  loadingMoreText: {
    marginLeft: 8,
    fontSize: 14,
  }
});

export default ContactSelector;