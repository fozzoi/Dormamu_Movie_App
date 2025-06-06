// BottomTabNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

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

const stackScreenOptions = {
  headerShown: false,
  cardStyle: { backgroundColor: '#000' },
  animation: 'fade',
  presentation: 'card',
  animationEnabled: true,
  gestureEnabled: true,
  gestureDirection: 'horizontal',
  contentStyle: { backgroundColor: '#000' },
  animationDuration: 200,
  freezeOnBlur: true,
  detachPreviousScreen: false,
  // Add these options to prevent white flash
  cardOverlayEnabled: true,
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
};

// Create stack navigators for each tab
const SearchStack = () => (
  <Stack.Navigator screenOptions={stackScreenOptions}>
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
  <Stack.Navigator screenOptions={stackScreenOptions}>
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
  <Stack.Navigator screenOptions={stackScreenOptions}>
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
        tabBarIcon: ({ color, size, focused }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'search';

          if (route.name === 'Search') {
            iconName = focused ? 'search' : 'search';
          } else if (route.name === 'Watchlist') {
            iconName = focused ? 'bookmark' : 'bookmark';
          } else if (route.name === 'Explore') {
            iconName = focused ? 'compass' : 'compass';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#FF0000', // Bright red for active state
        tabBarInactiveTintColor: '#666666', // Dark gray for inactive state
        headerShown: false,
        tabBarShowLabel: false, // Hide labels for cleaner look
        tabBarStyle: {
          backgroundColor: '#000000', // Pure black background
          borderTopWidth: 0, // Remove top border
          borderTopColor: 'transparent',
          elevation: 0, // Remove shadow on Android
          shadowOpacity: 0, // Remove shadow on iOS
          height: Platform.OS === 'ios' ? 90 : 70, // Adjust height for iOS safe area
          paddingBottom: Platform.OS === 'ios' ? 25 : 15, // Safe area padding
          paddingTop: 10,
          paddingHorizontal: 20,
          position: 'absolute',
        },
        // Status bar and navigation bar styling
        statusBarStyle: 'light',
        statusBarBackgroundColor: '#000000',
        statusBarTranslucent: true,
        // navigationBarColor: 'gray',
        // navigationBarTranslucent: true,
        navigationbarshow: false,
      })}
    >
      <Tab.Screen 
        name="Search" 
        component={SearchStack}
        options={{
          tabBarLabel: 'Search'
        }}
      />
      <Tab.Screen 
        name="Watchlist" 
        component={WatchlistStack}
        options={{
          tabBarLabel: 'Watchlist'
        }}
      />
      <Tab.Screen 
        name="Explore" 
        component={ExploreStack}
        options={{
          tabBarLabel: 'Explore'
        }}
      />
      {/* Uncomment if you want to add Settings tab
      <Tab.Screen 
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