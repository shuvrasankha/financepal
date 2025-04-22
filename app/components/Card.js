import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Theme from '../../constants/Theme';

/**
 * Reusable Card component with optional title, icon, and action button
 */
const Card = ({
  title,
  titleIcon,
  actionText,
  actionIcon,
  onActionPress,
  children,
  style,
  contentStyle,
  elevated = true,
  variant = 'default',
  ...props
}) => {
  // Get variant-specific styles
  const getVariantStyle = () => {
    switch (variant) {
      case 'primary':
        return styles.cardPrimary;
      case 'success':
        return styles.cardSuccess;
      case 'error':
        return styles.cardError;
      case 'warning':
        return styles.cardWarning;
      case 'info':
        return styles.cardInfo;
      default:
        return null;
    }
  };

  return (
    <View 
      style={[
        styles.card,
        elevated && styles.cardElevated,
        getVariantStyle(),
        style,
      ]}
      {...props}
    >
      {(title || actionText) && (
        <View style={styles.cardHeader}>
          {title && (
            <View style={styles.titleContainer}>
              {titleIcon && (
                <Ionicons 
                  name={titleIcon} 
                  size={18} 
                  color={Theme.colors.primary}
                  style={styles.titleIcon} 
                />
              )}
              <Text style={styles.cardTitle}>{title}</Text>
            </View>
          )}
          
          {actionText && (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={onActionPress}
            >
              <Text style={styles.actionText}>{actionText}</Text>
              {actionIcon && (
                <Ionicons 
                  name={actionIcon} 
                  size={14} 
                  color={Theme.colors.primary}
                  style={styles.actionIcon} 
                />
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
      
      <View style={[styles.cardContent, contentStyle]}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.light,
  },
  cardElevated: {
    ...Theme.shadows.sm,
    borderWidth: 0,
  },
  cardPrimary: {
    borderLeftWidth: 4,
    borderLeftColor: Theme.colors.primary,
  },
  cardSuccess: {
    borderLeftWidth: 4,
    borderLeftColor: Theme.colors.success,
  },
  cardError: {
    borderLeftWidth: 4,
    borderLeftColor: Theme.colors.error,
  },
  cardWarning: {
    borderLeftWidth: 4,
    borderLeftColor: Theme.colors.warning,
  },
  cardInfo: {
    borderLeftWidth: 4,
    borderLeftColor: Theme.colors.info,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: Theme.typography.fontSizes.md,
    fontWeight: Theme.typography.fontWeights.semiBold,
    color: Theme.colors.dark,
  },
  titleIcon: {
    marginRight: Theme.spacing.xs,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontSize: Theme.typography.fontSizes.sm,
    color: Theme.colors.primary,
    fontWeight: Theme.typography.fontWeights.medium,
  },
  actionIcon: {
    marginLeft: Theme.spacing.xs,
  },
  cardContent: {
    
  },
});

export default Card;