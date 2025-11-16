import { useRef } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

export const useScrollNavBar = () => {
  const navBarOpacity = useSharedValue(1);
  const navBarTranslateY = useSharedValue(0);

  const handleScroll = (event: any) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;

    if (currentScrollY > 50) {
      navBarOpacity.value = withTiming(0.8, {
        duration: 200,
        easing: Easing.inOut(Easing.ease),
      });
    } else {
      navBarOpacity.value = withTiming(1, {
        duration: 200,
        easing: Easing.inOut(Easing.ease),
      });
    }
  };

  const navBarAnimatedStyle = useAnimatedStyle(() => ({
    opacity: navBarOpacity.value,
    transform: [{ translateY: navBarTranslateY.value }],
  }));

  return {
    handleScroll,
    navBarOpacity,
    navBarTranslateY,
    navBarAnimatedStyle,
  };
};

export default useScrollNavBar;
