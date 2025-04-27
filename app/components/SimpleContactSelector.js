import React, { useState } from 'react';
import { 
  TouchableOpacity, 
  View, 
  Text, 
  StyleSheet, 
  Alert, 
  Platform,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback,
  FlatList,
  Animated,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import { useTheme } from '../../contexts/ThemeContext';
import Theme from '../../constants/Theme';

const SimpleContactSelector = ({ onSelectContact }) => {
  const { isDarkMode } = useTheme();
  const colors = isDarkMode ? Theme.dark.colors : Theme.light.colors;
  const shadows = isDarkMode ? Theme.shadowsDark : Theme.shadows;
  
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState([]);
  
  const animatedValue = React.useRef(new Animated.Value(0)).current;
  
  // Open the contact selector
  const openContactSelector = async () => {
    setModalVisible(true);
    setLoading(true);
    
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please allow access to your contacts to use this feature.');
        setModalVisible(false);
        return;
      }
      
      // Get a limited number of contacts for better performance
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
        pageSize: 100,
        pageOffset: 0,
        sort: Contacts.SortTypes.FirstName
      });
      
      // Filter to contacts with phone numbers and handle multiple phone numbers
      const contactsWithPhones = [];
      data.forEach(contact => {
        if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
          // Create a separate entry for each phone number
          contact.phoneNumbers.forEach((phone, phoneIndex) => {
            contactsWithPhones.push({
              id: `${contact.id}-${phoneIndex}`, // Create unique ID for each phone number
              contactId: contact.id,
              name: contact.name || 'Unknown',
              phoneNumber: phone.number || '',
              phoneLabel: phone.label || '',
              initials: getInitials(contact.name || 'Unknown')
            });
          });
        }
      });
      
      if (contactsWithPhones.length === 0) {
        Alert.alert('No Contacts', 'No contacts with phone numbers found on your device.');
        setModalVisible(false);
        return;
      }
      
      setContacts(contactsWithPhones);
      
      // Animate modal in
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      }).start();
      
    } catch (error) {
      console.error('Error accessing contacts:', error);
      Alert.alert('Error', 'Failed to access contacts.');
      setModalVisible(false);
    } finally {
      setLoading(false);
    }
  };
  
  // Close the modal
  const closeModal = () => {
    Animated.timing(animatedValue, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true
    }).start(() => {
      setModalVisible(false);
    });
  };
  
  // Get initials from contact name
  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(part => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };
  
  // Handle contact selection
  const handleContactSelect = (contact) => {
    if (onSelectContact) {
      onSelectContact({
        name: contact.name,
        phoneNumber: contact.phoneNumber
      });
    }
    closeModal();
  };
  
  // Render each contact item
  const renderContactItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.contactItem,
        { 
          backgroundColor: colors.card,
          borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#f0f0f0' 
        }
      ]}
      onPress={() => handleContactSelect(item)}
      activeOpacity={0.7}
    >
      <View style={[
        styles.avatar,
        { backgroundColor: isDarkMode ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)' }
      ]}>
        <Text style={{ color: colors.primary, fontWeight: 'bold' }}>
          {item.initials}
        </Text>
      </View>
      <View style={styles.contactInfo}>
        <Text style={[styles.contactName, { color: colors.dark }]}>
          {item.name}
        </Text>
        <Text style={[styles.contactPhone, { color: colors.medium }]}>
          {item.phoneNumber}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.medium} />
    </TouchableOpacity>
  );
  
  // Animations for the modal
  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [Dimensions.get('window').height, 0]
  });
  
  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1]
  });

  return (
    <>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={openContactSelector}
      >
        <Ionicons name="people" size={22} color="#ffffff" />
      </TouchableOpacity>
      
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="none"
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          <TouchableWithoutFeedback onPress={closeModal}>
            <Animated.View style={[styles.overlay, { opacity }]} />
          </TouchableWithoutFeedback>
          
          <Animated.View 
            style={[
              styles.modalContent, 
              { 
                backgroundColor: colors.card,
                transform: [{ translateY }]
              }
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.headerTitle, { color: colors.dark }]}>
                Select Contact
              </Text>
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#f0f0f0' }]}
                onPress={closeModal}
              >
                <Ionicons name="close" size={20} color={colors.medium} />
              </TouchableOpacity>
            </View>
            
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.medium }]}>
                  Loading contacts...
                </Text>
              </View>
            ) : (
              <FlatList
                data={contacts}
                keyExtractor={item => item.id}
                renderItem={renderContactItem}
                contentContainerStyle={styles.contactsList}
                initialNumToRender={15}
                windowSize={5}
                removeClippedSubviews={Platform.OS === 'android'}
              />
            )}
          </Animated.View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 45, 
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      }
    })
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    height: '70%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
      },
      android: {
        elevation: 12,
      }
    })
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center', 
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  contactsList: {
    flexGrow: 1,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
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
  }
});

export default SimpleContactSelector;