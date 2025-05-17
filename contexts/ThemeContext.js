import React, { createContext, useState, useEffect, useContext } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Theme context for managing app's appearance mode
export const ThemeContext = createContext({
  isDarkMode: false,
  toggleTheme: () => {},
  setTheme: (mode) => {},
});

// Theme provider component
export const ThemeProvider = ({ children }) => {
  // Get device color scheme
  const deviceColorScheme = useColorScheme();
  
  // State for theme mode
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [themePreference, setThemePreference] = useState('system');
  const [isAppLockSuspended, setIsAppLockSuspended] = useState(false);

  // Load theme preference from storage
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('theme_mode');
        const savedThemePreference = await AsyncStorage.getItem('themePreference');
        if (savedTheme !== null) {
          setIsDarkMode(savedTheme === 'dark');
        } else {
          // Use device preference as default if no saved preference
          setIsDarkMode(deviceColorScheme === 'dark');
        }
        if (savedThemePreference) {
          setThemePreference(savedThemePreference);
        }
      } catch (error) {
        console.log('Error loading theme preference:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadThemePreference();
  }, [deviceColorScheme]);

  // Apply theme preference
  useEffect(() => {
    if (themePreference === 'system') {
      setIsDarkMode(deviceColorScheme === 'dark');
    } else {
      setIsDarkMode(themePreference === 'dark');
    }
  }, [themePreference, deviceColorScheme]);

  // Save theme preference to storage
  const saveThemePreference = async (mode) => {
    try {
      await AsyncStorage.setItem('theme_mode', mode);
    } catch (error) {
      console.log('Error saving theme preference:', error);
    }
  };

  // Toggle theme mode
  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    saveThemePreference(newMode ? 'dark' : 'light');
  };

  // Set specific theme mode
  const setTheme = (mode) => {
    const newMode = mode === 'dark';
    setIsDarkMode(newMode);
    saveThemePreference(mode);
  };

  // Temporarily suspend app lock (for contacts access)
  const suspendAppLock = () => {
    setIsAppLockSuspended(true);
  };
  
  // Resume app lock after operations that require it
  const resumeAppLock = () => {
    setIsAppLockSuspended(false);
  };

  return (
    <ThemeContext.Provider value={{ 
        isDarkMode, 
        toggleTheme, 
        setTheme, 
        themePreference,
        isAppLockSuspended,
        suspendAppLock,
        resumeAppLock
      }}
    >
      {!isLoading && children}
    </ThemeContext.Provider>
  );
};

// Custom hook for accessing the theme context
export const useTheme = () => useContext(ThemeContext);