// New simplified ContactSelector component for Android
import React from 'react';
import { 
  TouchableOpacity, 
  View, 
  Text, 
  StyleSheet, 
  Alert, 
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import { useTheme } from '../../contexts/ThemeContext';
import Theme from '../../constants/Theme';

const SimpleContactSelector = ({ onSelectContact }) => {
  const { isDarkMode } = useTheme();
  const colors = isDarkMode ? Theme.dark.colors : Theme.light.colors;
  const shadows = isDarkMode ? Theme.shadowsDark : Theme.shadows;

  const handleSelectContact = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please allow access to your contacts to use this feature.');
        return;
      }
      
      // Get just the first page of contacts
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
        pageSize: 1000,
        pageOffset: 0,
      });
      
      // Filter to contacts with phone numbers
      const contactsWithPhones = data.filter(c => 
        c.phoneNumbers && c.phoneNumbers.length > 0
      );
      
      if (contactsWithPhones.length === 0) {
        Alert.alert('No Contacts', 'No contacts with phone numbers found on your device.');
        return;
      }
      
      // Create array of name + phone options
      const options = contactsWithPhones.map(contact => ({
        id: contact.id,
        name: contact.name || 'Unknown',
        phoneNumber: contact.phoneNumbers[0]?.number || '',
      }));
      
      // Pass to parent component
      if (options.length > 0) {
        // Choose the first contact (just for testing)
        // In a real app, you'd show a modal or picker here
        Alert.alert(
          'Select Contact',
          'Choose a contact to add:',
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: `${options[0].name} (${options[0].phoneNumber})`,
              onPress: () => {
                if (onSelectContact) {
                  onSelectContact({
                    name: options[0].name || '',
                    phoneNumber: options[0].phoneNumber || '',
                  });
                }
              },
            },
          ],
          { cancelable: true }
        );
      }
    } catch (error) {
      console.error('Error accessing contacts:', error);
      Alert.alert('Error', 'Failed to access contacts.');
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: colors.primary }
      ]}
      onPress={handleSelectContact}
    >
      <Ionicons name="people" size={24} color="#ffffff" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: Platform.OS === 'android' ? 4 : 0,
    shadowColor: Platform.OS === 'ios' ? '#000' : 'transparent',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
});

export default SimpleContactSelector;