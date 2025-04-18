// LoadingCard.tsx
import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withDelay,
  interpolate,
  Easing
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 3;

interface LoadingCardProps {
  index?: number;
  delay?: number;
}

const LoadingCard = ({ index = 0, delay = 0 }: LoadingCardProps) => {
  const opacity = useSharedValue(0.3);
  const translateY = useSharedValue(0);
  
  // Animation for the shimmer effect
  const shimmerPosition = useSharedValue(-CARD_WIDTH);
  
  useEffect(() => {
    // Opacity and small bounce animation
    opacity.value = withDelay(
      delay * 100, 
      withTiming(0.7, { duration: 800 })
    );
    
    translateY.value = withDelay(
      delay * 100,
      withRepeat(
        withTiming(-5, { duration: 1000, easing: Easing.inOut(Easing.quad) }),
        -1,
        true
      )
    );

    // Shimmer animation
    shimmerPosition.value = withDelay(
      delay * 100,
      withRepeat(
        withTiming(2 * CARD_WIDTH, { 
          duration: 1500, 
          easing: Easing.inOut(Easing.quad) 
        }),
        -1,
        false
      )
    );
  }, []);

  const animatedCardStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }]
    };
  });

  const shimmerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: shimmerPosition.value }],
      opacity: interpolate(
        shimmerPosition.value,
        [-CARD_WIDTH, 0, CARD_WIDTH, 2 * CARD_WIDTH],
        [0, 0.5, 0.5, 0]
      ),
    };
  });

  return (
    <Animated.View style={[styles.container, animatedCardStyle]}>
      <View style={styles.card}>
        <Animated.View style={[styles.shimmer, shimmerAnimatedStyle]} />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.5,
    marginRight: 12,
    borderRadius: 10,
    overflow: 'hidden',
  },
  card: {
    flex: 1,
    backgroundColor: '#333',
    borderRadius: 10,
    overflow: 'hidden',
  },
  shimmer: {
    width: CARD_WIDTH,
    height: '100%',
    backgroundColor: '#ffffff',
    opacity: 0.2,
    position: 'absolute',
  }
});

export default LoadingCard;