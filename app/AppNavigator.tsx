// AppNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import BottomTabNavigator from './BottomTabNavigator';
import DetailPage from './DetailPage'; // Make sure this exists
import CastDetails from './CastDetails';

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={BottomTabNavigator} />
      <Stack.Screen name="Detail" component={DetailPage}  />
      <Stack.Screen name="CastDetails" component={CastDetails} />
    </Stack.Navigator>
  );
};

export default AppNavigator; // Ensure this is the default export
