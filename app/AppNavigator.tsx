// AppNavigator.tsx
import React from 'react';
import BottomTabNavigator from './BottomTabNavigator';
import DetailPage from './DetailPage'; // Make sure this exists
import CastDetails from './CastDetails';
import ViewAllPage from './ViewAllPage'; 
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false ,gestureEnabled: true, gestureDirection: 'horizontal',animation:'fade_from_bottom'}}>
      <Stack.Screen name="Main" component={BottomTabNavigator} />
      <Stack.Screen name="Detail" component={DetailPage}  />
      <Stack.Screen name="CastDetails" component={CastDetails} />
      <Stack.Screen name="ViewAll" component={ViewAllPage} />
    </Stack.Navigator>
  );
};

export default AppNavigator; // Ensure this is the default export
