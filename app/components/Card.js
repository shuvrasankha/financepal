import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Theme from '../../constants/Theme';
import { useTheme } from '../../contexts/ThemeContext';

const Card = ({
  children,
  title,
  subtitle,
  icon,
  iconColor,
  onPress,
  variant = 'default', // default, primary, success, error, warning, info
  rightAction,
  elevated = true,
  style,
  ...props
}) => {
  const { isDarkMode } = useTheme();
  const colors = isDarkMode ? Theme.dark.colors : Theme.light.colors;
  const shadows = isDarkMode ? Theme.shadowsDark : Theme.shadows;
  
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
  
  // Get the color for the variant
  const getVariantColor = () => {
    switch (variant) {
      case 'primary':
        return colors.primary;
      case 'success':
        return colors.success;
      case 'error':
        return colors.error;
      case 'warning':
        return colors.warning;
      case 'info':
        return colors.info;
      default:
        return colors.dark;
    }
  };

  const variantStyle = getVariantStyle();
  const variantColor = getVariantColor();
  
  // Wrap the card in a TouchableOpacity if onPress is provided
  const CardWrapper = onPress ? TouchableOpacity : View;
  const wrapperProps = onPress ? { 
    onPress, 
    activeOpacity: 0.7,
    ...props 
  } : props;
  
  return (
    <CardWrapper 
      style={[
        styles.card,
        elevated && styles.cardElevated,
        elevated && isDarkMode && { 
          shadowColor: '#000',
          shadowOpacity: 0.3,
          borderColor: colors.borderLight,
          borderWidth: 1
        },
        variantStyle,
        { backgroundColor: colors.card },
        style
      ]}
      {...wrapperProps}
    >
      {/* Card Header (if title or subtitle provided) */}
      {(title || subtitle) && (
        <View style={styles.cardHeader}>
          <View style={styles.titleContainer}>
            {icon && (
              <Ionicons 
                name={icon} 
                size={18} 
                color={iconColor || variantColor} 
                style={styles.titleIcon} 
              />
            )}
            {title && (
              <Text style={[styles.title, { color: colors.dark }]}>
                {title}
              </Text>
            )}
          </View>
          
          {/* Optional right action (e.g., button, icon) */}
          {rightAction && (
            <View>
              {rightAction}
            </View>
          )}
        </View>
      )}
      
      {/* Subtitle */}
      {subtitle && (
        <Text style={[styles.subtitle, { color: colors.medium }]}>
          {subtitle}
        </Text>
      )}
      
      {/* Card Content */}
      {children}
    </CardWrapper>
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