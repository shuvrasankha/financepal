import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';
import Theme from '../constants/Theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Define error types for different styling
export const ERROR_TYPES = {
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
  SUCCESS: 'success',
};

// Create Error context
const ErrorContext = createContext({
  error: null,
  showError: () => {},
  clearError: () => {},
});

export const ErrorProvider = ({ children }) => {
  const [error, setError] = useState(null);
  const [timeoutId, setTimeoutId] = useState(null);
  const { isDarkMode } = useTheme();
  const colors = isDarkMode ? Theme.dark.colors : Theme.light.colors;

  // Show error with auto-dismiss after delay
  const showError = useCallback((message, type = ERROR_TYPES.ERROR, duration = 3000) => {
    // Clear any existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Set the error
    setError({
      message,
      type,
      timestamp: Date.now(),
    });

    // Auto-dismiss after duration
    const id = setTimeout(() => {
      setError(null);
    }, duration);

    setTimeoutId(id);

    // Return a function to dismiss the error programmatically
    return () => {
      clearTimeout(id);
      setError(null);
    };
  }, [timeoutId]);

  // Clear error manually
  const clearError = useCallback(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    setError(null);
  }, [timeoutId]);

  return (
    <ErrorContext.Provider
      value={{
        error,
        showError,
        clearError,
      }}
    >
      {children}
      
      {/* Error Toast component */}
      {error && (
        <ErrorToast
          message={error.message}
          type={error.type}
          onDismiss={clearError}
        />
      )}
    </ErrorContext.Provider>
  );
};

// Error Toast component for displaying error messages
const ErrorToast = ({ message, type, onDismiss }) => {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    return () => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    };
  }, []);

  // Get background color and icon based on error type
  const getToastStyles = () => {
    switch (type) {
      case ERROR_TYPES.ERROR:
        return {
          backgroundColor: 'rgba(220, 38, 38, 0.9)',
          icon: 'alert-circle',
        };
      case ERROR_TYPES.WARNING:
        return {
          backgroundColor: 'rgba(245, 158, 11, 0.9)',
          icon: 'warning',
        };
      case ERROR_TYPES.SUCCESS:
        return {
          backgroundColor: 'rgba(16, 185, 129, 0.9)',
          icon: 'checkmark-circle',
        };
      case ERROR_TYPES.INFO:
      default:
        return {
          backgroundColor: 'rgba(59, 130, 246, 0.9)',
          icon: 'information-circle',
        };
    }
  };

  const { backgroundColor, icon } = getToastStyles();

  return (
    <Animated.View 
      style={[
        styles.errorContainer, 
        { 
          backgroundColor, 
          paddingTop: insets.top + 10,
          opacity: fadeAnim,
          transform: [{ translateY: fadeAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [-50, 0],
          })}],
        }
      ]}
    >
      <View style={styles.errorContent}>
        <Ionicons name={icon} size={22} color="#fff" style={styles.errorIcon} />
        <Text style={styles.errorText} numberOfLines={2}>
          {message}
        </Text>
      </View>
      <TouchableOpacity onPress={onDismiss} style={styles.closeButton}>
        <Ionicons name="close" size={22} color="#fff" />
      </TouchableOpacity>
    </Animated.View>
  );
};

// Custom hook to use the error context
export const useError = () => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3.8,
    elevation: 5,
  },
  errorContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    color: '#fff',
    fontSize: 15,
    flex: 1,
    fontWeight: '500',
  },
  closeButton: {
    marginLeft: 8,
    padding: 4,
  }
});