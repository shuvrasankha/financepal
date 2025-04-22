import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import Input from '../Input';
import { useTheme } from '../../../contexts/ThemeContext';
import Theme from '../../../constants/Theme';

/**
 * Enhanced form input component with built-in validation
 * Validates input in real-time and shows error messages
 */
const FormInput = ({
  label,
  value,
  onChangeText,
  placeholder,
  validation, // Function that returns error message or null
  validateOnBlur = true,
  validateOnChange = true,
  validateOnMount = false,
  required = false,
  showErrorOnly = false, // Only show error, not success
  showSuccessWhenValid = true, // Show success state when valid
  secureTextEntry,
  keyboardType,
  leftIcon,
  rightIcon,
  onRightIconPress,
  onBlur,
  onFocus,
  ...props
}) => {
  const [error, setError] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isTouched, setIsTouched] = useState(false);
  const [isValid, setIsValid] = useState(false);
  
  // Get theme context
  const { isDarkMode } = useTheme();
  const colors = isDarkMode ? Theme.dark.colors : Theme.light.colors;

  // Function to validate value
  const validateInput = () => {
    if (!validation) {
      setIsValid(true);
      setError(null);
      return;
    }
    
    const validationResult = validation(value);
    
    if (validationResult) {
      setError(validationResult);
      setIsValid(false);
    } else {
      setError(null);
      setIsValid(true);
    }
  };

  // Validate on mount if specified
  useEffect(() => {
    if (validateOnMount) {
      validateInput();
    }
  }, []);

  // Validate when value changes if validateOnChange is true
  useEffect(() => {
    if (isDirty && validateOnChange) {
      validateInput();
    }
    
    if (value && !isDirty) {
      setIsDirty(true);
    }
  }, [value]);

  // Handle blur event
  const handleBlur = (e) => {
    setIsTouched(true);
    
    if (validateOnBlur) {
      validateInput();
    }
    
    if (onBlur) {
      onBlur(e);
    }
  };

  // Handle focus event
  const handleFocus = (e) => {
    if (onFocus) {
      onFocus(e);
    }
  };

  // Get appropriate right icon based on validation state
  const getValidationIcon = () => {
    if (!isTouched || !isDirty) return rightIcon;
    
    if (isValid && showSuccessWhenValid && !showErrorOnly) {
      return 'checkmark-circle-outline';
    } else if (error) {
      return 'alert-circle-outline';
    }
    
    return rightIcon;
  };

  // Get color for validation icon
  const getValidationIconColor = () => {
    if (!isTouched || !isDirty) return colors.medium;
    
    if (isValid && showSuccessWhenValid && !showErrorOnly) {
      return colors.success;
    } else if (error) {
      return colors.error;
    }
    
    return colors.medium;
  };

  return (
    <Input
      label={label}
      value={value}
      onChangeText={(text) => {
        onChangeText(text);
        if (!isDirty) setIsDirty(true);
      }}
      placeholder={placeholder}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      leftIcon={leftIcon}
      rightIcon={getValidationIcon()}
      onRightIconPress={onRightIconPress}
      error={isTouched && error ? error : null}
      required={required}
      onBlur={handleBlur}
      onFocus={handleFocus}
      {...props}
    />
  );
};

export default FormInput;