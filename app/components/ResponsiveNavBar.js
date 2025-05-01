import React from 'react';
import { Platform, View, StyleSheet, useWindowDimensions } from 'react-native';
import BottomNavBar from './BottomNavBar';
import WebNavBar from './WebNavBar';

/**
 * ResponsiveNavBar conditionally renders either BottomNavBar or WebNavBar
 * depending on the platform (native mobile vs web) and handles proper layout
 */
const ResponsiveNavBar = ({ children }) => {
  // Use WebNavBar only on web platform
  const isWeb = Platform.OS === 'web';
  const dimensions = useWindowDimensions();
  const isDesktop = dimensions.width > 768;
  
  if (!isWeb) {
    return <BottomNavBar />;
  }
  
  return (
    <View style={styles.container}>
      <WebNavBar />
      {children && (
        <View style={[
          styles.contentContainer,
          isDesktop ? styles.desktopContent : styles.mobileContent
        ]}>
          {children}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: '100%',
    backgroundColor: '#0f172a', // Match the dark background from screenshot
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#0f172a', // Match the dark background from screenshot
    width: '100%',
  },
  desktopContent: {
    marginTop: 54, // Match the height of the navbar
    paddingTop: 0, // Remove extra padding
  },
  mobileContent: {
    marginTop: 60, // Match the height of the mobile navbar
  }
});

export default ResponsiveNavBar;