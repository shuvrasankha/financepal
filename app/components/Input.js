import React, { useState } from 'react';
import { TextInput, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Theme from '../../constants/Theme';

/**
 * Reusable Input component with various features like:
 * - Label support
 * - Error message display
 * - Icon support (left/right)
 * - Password toggle for secure fields
 * - Various keyboard types
 */
const Input = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'none',
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  multiline = false,
  numberOfLines = 1,
  style,
  inputStyle,
  labelStyle,
  required = false,
  editable = true,
  onBlur,
  onFocus,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  const handleFocus = (e) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  return (
    <View style={[styles.container, style]}>
      {label && (
        <View style={styles.labelContainer}>
          <Text style={[styles.label, labelStyle]}>
            {label} {required && <Text style={styles.requiredStar}>*</Text>}
          </Text>
        </View>
      )}
      
      <View style={[
        styles.inputContainer, 
        isFocused && styles.inputContainerFocused,
        error && styles.inputContainerError,
        !editable && styles.inputContainerDisabled,
      ]}>
        {leftIcon && (
          <Ionicons 
            name={leftIcon} 
            size={18} 
            color={isFocused ? Theme.colors.primary : Theme.colors.medium} 
            style={styles.leftIcon} 
          />
        )}
        
        <TextInput
          style={[
            styles.input,
            multiline && styles.multilineInput,
            inputStyle,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Theme.colors.medium}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : 1}
          onFocus={handleFocus}
          onBlur={handleBlur}
          editable={editable}
          {...props}
        />
        
        {secureTextEntry && (
          <TouchableOpacity onPress={togglePasswordVisibility} style={styles.rightIcon}>
            <Ionicons 
              name={isPasswordVisible ? 'eye-off' : 'eye'} 
              size={20} 
              color={Theme.colors.medium} 
            />
          </TouchableOpacity>
        )}
        
        {rightIcon && !secureTextEntry && (
          <TouchableOpacity 
            onPress={onRightIconPress} 
            style={styles.rightIcon}
            disabled={!onRightIconPress}
          >
            <Ionicons 
              name={rightIcon} 
              size={20} 
              color={Theme.colors.medium} 
            />
          </TouchableOpacity>
        )}
      </View>
      
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Theme.spacing.md,
  },
  labelContainer: {
    marginBottom: Theme.spacing.sm,
  },
  label: {
    fontSize: Theme.typography.fontSizes.sm,
    fontWeight: Theme.typography.fontWeights.medium,
    color: Theme.colors.dark,
  },
  requiredStar: {
    color: Theme.colors.error,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.light,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.white,
    paddingHorizontal: Theme.spacing.sm,
  },
  inputContainerFocused: {
    borderColor: Theme.colors.primary,
    borderWidth: 2,
  },
  inputContainerError: {
    borderColor: Theme.colors.error,
  },
  inputContainerDisabled: {
    backgroundColor: Theme.colors.lighter,
    opacity: 0.7,
  },
  input: {
    flex: 1,
    paddingVertical: Theme.spacing.sm + 2,
    paddingHorizontal: Theme.spacing.sm,
    fontSize: Theme.typography.fontSizes.md,
    color: Theme.colors.dark,
    minHeight: 48,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  leftIcon: {
    marginLeft: Theme.spacing.sm,
  },
  rightIcon: {
    padding: Theme.spacing.sm,
  },
  errorText: {
    fontSize: Theme.typography.fontSizes.xs,
    color: Theme.colors.error,
    marginTop: Theme.spacing.xs,
    marginLeft: Theme.spacing.xs,
  },
});

export default Input;