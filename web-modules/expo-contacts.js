// This is a web polyfill for expo-contacts
// It provides mock implementations of the methods used in the app

const PERMISSION_STATUS = {
  GRANTED: 'granted',
  DENIED: 'denied',
  UNDETERMINED: 'undetermined'
};

export async function requestPermissionsAsync() {
  // In web, we just return a mock permission status
  console.warn('Contact permissions are not available on web');
  return { status: PERMISSION_STATUS.DENIED };
}

export async function getContactsAsync(options = {}) {
  // Return empty contacts array for web
  console.warn('Contacts are not available in web environment');
  return { data: [] };
}

// Export other necessary constants or functions that might be used
export { PERMISSION_STATUS };