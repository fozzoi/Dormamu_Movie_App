// BottomTabNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import SearchScreen from '../app/index';
import History from '../app/history';
import WatchlistScreen from '../app/watchlist';
import Explore from './Explore';
import Index from '../app/index';

const Tab = createBottomTabNavigator();

const BottomTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'search';

          if (route.name === 'History') {
            iconName = 'time';
          } else if (route.name === 'Watchlist') {
            iconName = 'bookmark';
          } else if (route.name === 'Explore') {
            iconName = 'globe';
          } else if (route.name === 'Search') {
            iconName = 'search';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    > 
      <Tab.Screen name="Search" component={Index} />
      <Tab.Screen name="History" component={History} />
      <Tab.Screen name="Watchlist" component={WatchlistScreen} />
      <Tab.Screen name="Explore" component={Explore} />
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;
