// BottomTabNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

// Import your existing tab screens
import History from '../app/history';
import Explore from './Explore';
import Index from '../app/index';
import WatchListPage from '../app/WatchListPage';
import Profile from '../app/Profile';
import Settings from '../app/Settings';

// Import your detail screens
import DetailPage from './DetailPage';
import CastDetails from './CastDetails';
import ViewAllPage from './ViewAllPage';
import ListDetails from './ListDetails';
import SimilarMoviesPage from './SimilarMoviesPage';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Create stack navigators for each tab
const SearchStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="SearchMain" component={Index} />
    <Stack.Screen name="Detail" component={DetailPage} />
    <Stack.Screen name="CastDetails" component={CastDetails} />
    <Stack.Screen name="ViewAll" component={ViewAllPage} />
    <Stack.Screen name="ListDetails" component={ListDetails} />
    <Stack.Screen name="SimilarMovies" component={SimilarMoviesPage} />
    <Stack.Screen name="history" component={History} />
  </Stack.Navigator>
);

const WatchlistStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="WatchlistMain" component={WatchListPage} />
    <Stack.Screen name="Detail" component={DetailPage} />
    <Stack.Screen name="CastDetails" component={CastDetails} />
    <Stack.Screen name="ViewAll" component={ViewAllPage} />
    <Stack.Screen name="ListDetails" component={ListDetails} />
    <Stack.Screen name="SimilarMovies" component={SimilarMoviesPage} />
    <Stack.Screen name="history" component={History} />
  </Stack.Navigator>
);

const ExploreStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ExploreMain" component={Explore} />
    <Stack.Screen name="Detail" component={DetailPage} />
    <Stack.Screen name="CastDetails" component={CastDetails} />
    <Stack.Screen name="ViewAll" component={ViewAllPage} />
    <Stack.Screen name="ListDetails" component={ListDetails} />
    <Stack.Screen name="SimilarMovies" component={SimilarMoviesPage} />
    <Stack.Screen name="history" component={History} />
  </Stack.Navigator>
);

const BottomTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'search';

          if (route.name === 'Search') {
            iconName = 'search';
          } else if (route.name === 'Watchlist') {
            iconName = 'bookmark';
          } else if (route.name === 'Explore') {
            iconName = 'compass';
          } else if (route.name === 'Profile') {
            iconName = 'person';
          } else if (route.name === 'Settings') {
            iconName = 'settings';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: 'red',
        navigationBarColor: 'translucent', // Fixed typo
        statusBarAnimation: 'fade',
        statusBarTranslucent: true,
        navigationBarTranslucent: true,
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: { 
          backgroundColor: '#141414',
          borderTopWidth: 0.19,
          borderTopColor: 'gray',
          elevation: 0,
          height: 70,
          position: 'absolute', // Changed from 'fixed' to 'absolute'
          paddingBottom: 20,
          paddingTop: 5,
        },
        headerShown: false,
        tabBarShowLabel: false // Instagram-like: hide labels for cleaner look
      })}
    >
      <Tab.Screen 
        name="Search" 
        component={SearchStack} // Changed to use stack navigator
        options={{
          tabBarLabel: 'Home'
        }}
      />
      <Tab.Screen 
        name="Watchlist" 
        component={WatchlistStack} // Changed to use stack navigator
        options={{
          tabBarLabel: 'Watchlist'
        }}
      />
      <Tab.Screen 
        name="Explore" 
        component={ExploreStack} // Changed to use stack navigator
        options={{
          tabBarLabel: 'Explore'
        }}
      />
      {/* <Tab.Screen 
        name="Settings" 
        component={Settings} 
        options={{
          tabBarLabel: 'Settings'
        }}
      /> */}
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;