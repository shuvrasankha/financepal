import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import Theme from '../../constants/Theme';

/**
 * SkeletonLoader component for displaying loading states
 * Instead of showing activity indicators, this creates a more engaging loading experience
 */
class SkeletonLoader extends React.Component {
  constructor(props) {
    super(props);
    this.animatedValue = new Animated.Value(0);
  }

  componentDidMount() {
    this.startAnimation();
  }

  startAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(this.animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(this.animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    ).start();
  };

  render() {
    const {
      width = '100%',
      height = 20,
      borderRadius = Theme.borderRadius.sm,
      style,
      ...props
    } = this.props;

    const backgroundColor = this.animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [Theme.colors.light, Theme.colors.lighter],
    });

    return (
      <Animated.View
        style={[
          styles.skeleton,
          {
            width,
            height,
            borderRadius,
            backgroundColor,
          },
          style,
        ]}
        {...props}
      />
    );
  }
}

/**
 * Skeleton profile card loader
 */
export const SkeletonProfileCard = () => (
  <View style={styles.profileCard}>
    <SkeletonLoader width={60} height={60} borderRadius={30} style={styles.avatar} />
    <View style={styles.profileInfo}>
      <SkeletonLoader width={120} height={20} style={styles.margin} />
      <SkeletonLoader width={180} height={16} />
    </View>
  </View>
);

/**
 * Skeleton transaction item loader
 */
export const SkeletonTransactionItem = () => (
  <View style={styles.transactionItem}>
    <SkeletonLoader width={40} height={40} borderRadius={20} style={styles.transactionIcon} />
    <View style={styles.transactionInfo}>
      <SkeletonLoader width={150} height={18} style={styles.margin} />
      <SkeletonLoader width={100} height={14} />
    </View>
    <SkeletonLoader width={60} height={22} style={styles.transactionAmount} />
  </View>
);

/**
 * Skeleton card loader
 */
export const SkeletonCard = ({ height = 100 }) => (
  <View style={[styles.card, { height }]}>
    <SkeletonLoader width="40%" height={20} style={styles.margin} />
    <SkeletonLoader width="70%" height={16} style={styles.margin} />
    <SkeletonLoader width="30%" height={16} />
  </View>
);

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: Theme.colors.light,
  },
  margin: {
    marginBottom: 8,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.white,
    padding: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.lg,
    margin: Theme.spacing.md,
    ...Theme.shadows.sm,
  },
  avatar: {
    marginRight: Theme.spacing.md,
  },
  profileInfo: {
    flex: 1,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.white,
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.md,
    marginBottom: Theme.spacing.sm,
    ...Theme.shadows.sm,
  },
  transactionIcon: {
    marginRight: Theme.spacing.md,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionAmount: {
    alignSelf: 'flex-start',
  },
  card: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
    ...Theme.shadows.sm,
  },
});

export default SkeletonLoader;