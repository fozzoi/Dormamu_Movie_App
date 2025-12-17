// AppNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BottomTabNavigator from './BottomTabNavigator';
import Player from '@/src/Player';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  return (
    <Stack.Navigator 
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#000' },
        animation: 'slide_from_right',
        presentation: 'card',
        animationDuration: 200,
        gestureEnabled: true,
        fullScreenGestureEnabled: false,
        keyboardHandlingEnabled: false,
      }}
    >
      <Stack.Screen name="Home" component={BottomTabNavigator} 
        options={{
          headerShown: false,
          headerTransparent: true,
        }}
      />
      <Stack.Screen name="Player" component={Player} />
      {/* Add other Stack.Screen components here */}
    </Stack.Navigator>
  );
};

export default AppNavigator;