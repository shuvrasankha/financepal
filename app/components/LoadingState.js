import React from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import Theme from '../../constants/Theme';

// LoadingState component handles different UI states:
// - loading: Shows a spinner or skeleton loaders
// - error: Shows error message with retry option
// - empty: Shows message when no data is available
// - skeleton: Shows skeleton loaders during initial loading

const LoadingState = ({ 
  type = 'loading', 
  errorMessage = 'Something went wrong', 
  emptyMessage = 'No data available',
  emptyIcon = 'document-outline',
  retryAction = null,
  skeletonCount = 3
}) => {
  const { isDarkMode } = useTheme();
  const colors = isDarkMode ? Theme.dark.colors : Theme.light.colors;

  // Regular loading state
  if (type === 'loading') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.message, { color: colors.medium, marginTop: 16 }]}>Loading...</Text>
      </View>
    );
  }

  // Error state
  if (type === 'error') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.iconContainer, { backgroundColor: `${colors.error}20` }]}>
          <Ionicons name="alert-circle-outline" size={32} color={colors.error} />
        </View>
        <Text style={[styles.message, { color: colors.dark, marginTop: 16 }]}>{errorMessage}</Text>
        
        {retryAction && (
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: colors.primary }]} 
            onPress={retryAction}
          >
            <Ionicons name="refresh-outline" size={20} color={colors.white} style={{ marginRight: 8 }} />
            <Text style={[styles.retryText, { color: colors.white }]}>Try Again</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Empty state (no data)
  if (type === 'empty') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: 40 }]}>
        <View style={[styles.iconContainer, { backgroundColor: `${colors.primary}10` }]}>
          <Ionicons name={emptyIcon} size={32} color={colors.primary} />
        </View>
        <Text style={[styles.message, { color: colors.dark, marginVertical: 16 }]}>{emptyMessage}</Text>
      </View>
    );
  }

  // Skeleton loading state for lists
  if (type === 'skeleton') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, alignItems: 'stretch', padding: 16 }]}>
        {/* Header skeleton */}
        <View style={{ flexDirection: 'row', marginBottom: 24, alignItems: 'center' }}>
          <SkeletonItem width={140} height={30} colors={colors} />
          <View style={{ flex: 1 }} />
          <SkeletonItem width={80} height={30} colors={colors} />
        </View>
        
        {/* Card skeletons */}
        <View style={{ 
          backgroundColor: `${colors.card}80`, 
          borderRadius: 12, 
          padding: 16, 
          marginBottom: 24,
          ...Theme.shadows.sm
        }}>
          <SkeletonItem width="70%" height={24} colors={colors} />
          <View style={{ flexDirection: 'row', marginTop: 14, marginBottom: 8 }}>
            <SkeletonItem width="40%" height={36} colors={colors} />
            <View style={{ flex: 1 }} />
            <SkeletonItem width="40%" height={36} colors={colors} />
          </View>
        </View>
        
        {/* Toggle bar skeleton */}
        <View style={{ 
          backgroundColor: `${colors.card}80`, 
          borderRadius: 10, 
          height: 48, 
          marginBottom: 24,
          flexDirection: 'row',
          padding: 4
        }}>
          <SkeletonItem width="48%" height={40} colors={colors} style={{ borderRadius: 8 }} />
          <View style={{ flex: 1 }} />
          <SkeletonItem width="48%" height={40} colors={colors} style={{ borderRadius: 8 }} />
        </View>
        
        {/* List item skeletons */}
        {Array(skeletonCount).fill(0).map((_, index) => (
          <View 
            key={index} 
            style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              marginBottom: 16, 
              padding: 14,
              borderRadius: 12,
              backgroundColor: `${colors.card}80`,
              ...Theme.shadows.sm
            }}
          >
            <SkeletonItem width={44} height={44} colors={colors} style={{ borderRadius: 10 }} />
            <View style={{ marginLeft: 16, flex: 1 }}>
              <SkeletonItem width="60%" height={18} colors={colors} />
              <SkeletonItem width="40%" height={14} colors={colors} style={{ marginTop: 8 }} />
            </View>
            <SkeletonItem width={70} height={26} colors={colors} />
          </View>
        ))}
      </View>
    );
  }

  return null;
};

// Skeleton item component
const SkeletonItem = ({ width, height, colors, style }) => {
  return (
    <View 
      style={[
        styles.skeletonItem, 
        { 
          width, 
          height, 
          backgroundColor: colors.skeleton || `${colors.medium}30`,
        },
        style
      ]} 
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    maxWidth: 280,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  skeletonItem: {
    borderRadius: 4,
    overflow: 'hidden',
  },
});

export default LoadingState;