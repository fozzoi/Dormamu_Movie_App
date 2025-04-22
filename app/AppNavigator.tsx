// AppNavigator.tsx
import React from 'react';
import BottomTabNavigator from './BottomTabNavigator';
import DetailPage from './DetailPage'; // Make sure this exists
import CastDetails from './CastDetails';
import ViewAllPage from './ViewAllPage'; 
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ListDetails from './ListDetails';
import SimilarMoviesPage from './SimilarMoviesPage';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ 
      headerShown: false,
      animation: 'fade_from_bottom',
      navigationBarColor: 'traslucent',
      statusBarAnimation: 'fade',
      statusBarTranslucent: true,
      navigationBarTranslucent: true,
      
      }}>
      <Stack.Screen name="Main" component={BottomTabNavigator} />
      <Stack.Screen name="Detail" component={DetailPage}  />
      <Stack.Screen name="CastDetails" component={CastDetails} />
      <Stack.Screen name="ViewAll" component={ViewAllPage} />
      <Stack.Screen name="ListDetails" component={ListDetails} />
      <Stack.Screen name="SimilarMovies" component={SimilarMoviesPage} />
      {/* Add more screens as needed */}
    </Stack.Navigator>
  );
};

export default AppNavigator; // Ensure this is the default export
