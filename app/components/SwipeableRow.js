import React, { useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, I18nManager } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import Theme from '../../constants/Theme';

const SwipeableRow = ({ 
  children, 
  onEdit, 
  onDelete,
  disableLeftSwipe = false,
  disableRightSwipe = true,
}) => {
  const swipeableRef = useRef(null);
  const { isDarkMode } = useTheme();
  const colors = isDarkMode ? Theme.dark.colors : Theme.light.colors;

  // Handler to close the swipeable row
  const close = () => {
    swipeableRef.current?.close();
  };

  // Right side swipe actions (usually Delete)
  const renderRightActions = (progress, dragX) => {
    if (disableLeftSwipe) return null;

    const trans = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [0, 80],
      extrapolate: 'clamp',
    });

    // Only render delete if onDelete is provided
    if (!onDelete) return null;

    return (
      <Animated.View 
        style={[
          styles.rightAction, 
          { 
            backgroundColor: colors.error,
            transform: [{ translateX: trans }],
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => {
            close();
            onDelete();
          }}
        >
          <Ionicons name="trash-outline" size={24} color="white" />
          <Text style={styles.actionText}>Delete</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Left side swipe actions (usually Edit)
  const renderLeftActions = (progress, dragX) => {
    if (disableRightSwipe) return null;

    const trans = dragX.interpolate({
      inputRange: [0, 80],
      outputRange: [-80, 0],
      extrapolate: 'clamp',
    });

    // Only render edit if onEdit is provided
    if (!onEdit) return null;

    return (
      <Animated.View 
        style={[
          styles.leftAction, 
          { 
            backgroundColor: colors.primary,
            transform: [{ translateX: trans }],
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => {
            close();
            onEdit();
          }}
        >
          <Ionicons name="create-outline" size={24} color="white" />
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      friction={2}
      leftThreshold={30}
      rightThreshold={40}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      containerStyle={styles.container}
      overshootLeft={false}
      overshootRight={false}
      overshootFriction={8}
    >
      {children}
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
  },
  leftAction: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-end',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    overflow: 'hidden',
  },
  rightAction: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    overflow: 'hidden',
  },
  actionButton: {
    width: 80,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
});

export default SwipeableRow;