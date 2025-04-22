import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import Theme from '../../constants/Theme';

const Button = ({
  title,
  onPress,
  variant = 'primary', // primary, secondary, outline, destructive, light
  size = 'medium', // small, medium, large
  leftIcon,
  rightIcon,
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
  ...props
}) => {
  const { isDarkMode } = useTheme();
  const colors = isDarkMode ? Theme.dark.colors : Theme.light.colors;
  
  // Determine colors based on variant and disabled state
  const getButtonColors = () => {
    if (disabled) {
      return {
        backgroundColor: `${colors.medium}40`,
        textColor: colors.medium,
        borderColor: 'transparent',
      };
    }
    
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: colors.primary,
          textColor: colors.white,
          borderColor: 'transparent',
        };
      case 'secondary':
        return {
          backgroundColor: `${colors.primary}20`,
          textColor: colors.primary,
          borderColor: 'transparent',
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          textColor: colors.primary,
          borderColor: colors.primary,
        };
      case 'destructive':
        return {
          backgroundColor: colors.error,
          textColor: colors.white,
          borderColor: 'transparent',
        };
      case 'light':
        return {
          backgroundColor: colors.light,
          textColor: colors.dark,
          borderColor: 'transparent',
        };
      default:
        return {
          backgroundColor: colors.primary,
          textColor: colors.white,
          borderColor: 'transparent',
        };
    }
  };
  
  // Get size style
  const getSizeStyle = () => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: 8,
          paddingHorizontal: 16,
          fontSize: 14,
          iconSize: 16,
        };
      case 'large':
        return {
          paddingVertical: 16,
          paddingHorizontal: 24,
          fontSize: 18,
          iconSize: 22,
        };
      case 'medium':
      default:
        return {
          paddingVertical: 12,
          paddingHorizontal: 20,
          fontSize: 16,
          iconSize: 18,
        };
    }
  };
  
  const buttonColors = getButtonColors();
  const sizeStyle = getSizeStyle();
  
  return (
    <TouchableOpacity
      onPress={!disabled && !loading ? onPress : null}
      activeOpacity={0.8}
      style={[
        styles.button,
        {
          backgroundColor: buttonColors.backgroundColor,
          borderColor: buttonColors.borderColor,
          borderWidth: variant === 'outline' ? 1 : 0,
          paddingVertical: sizeStyle.paddingVertical,
          paddingHorizontal: sizeStyle.paddingHorizontal,
          width: fullWidth ? '100%' : 'auto',
          opacity: loading ? 0.8 : 1,
        },
        style,
      ]}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={buttonColors.textColor} />
      ) : (
        <View style={styles.content}>
          {leftIcon && (
            <Ionicons
              name={leftIcon}
              size={sizeStyle.iconSize}
              color={buttonColors.textColor}
              style={styles.leftIcon}
            />
          )}
          <Text
            style={[
              styles.text,
              {
                color: buttonColors.textColor,
                fontSize: sizeStyle.fontSize,
              },
              textStyle,
            ]}
          >
            {title}
          </Text>
          {rightIcon && (
            <Ionicons
              name={rightIcon}
              size={sizeStyle.iconSize}
              color={buttonColors.textColor}
              style={styles.rightIcon}
            />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  leftIcon: {
    marginRight: 8,
  },
  rightIcon: {
    marginLeft: 8,
  },
});

export default Button;