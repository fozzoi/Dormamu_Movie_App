// AppNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import BottomTabNavigator from './BottomTabNavigator';

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#000' },
        presentation: 'card',
        animationEnabled: true,
        detachPreviousScreen: false,
        cardOverlayEnabled: true,
        freezeOnBlur: true,
        cardStyleInterpolator: ({ current: { progress } }) => ({
          cardStyle: {
            opacity: progress,
          },
          overlayStyle: {
            backgroundColor: '#000',
            opacity: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.5],
            }),
          },
        }),
      }}
    >
      <Stack.Screen name="Home" component={BottomTabNavigator} />
      {/* Add other Stack.Screen components here */}
    </Stack.Navigator>
  );
};

export default AppNavigator;