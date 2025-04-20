import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import History from '../app/history';
import Explore from './Explore';
import Index from '../app/index';
import WatchListPage from '../app/WatchListPage';
import Profile from '../app/Profile'; // Added import for Profile page

const Tab = createBottomTabNavigator();

const BottomTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'search';

          if (route.name === 'Search') {
            iconName = 'search';
          } else if (route.name === 'History') {
            iconName = 'time';
          } else if (route.name === 'Watchlist') {
            iconName = 'bookmark';
          } else if (route.name === 'Explore') {
            iconName = 'compass';
          } else if (route.name === 'Profile') {
            iconName = 'person';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: 'red',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: { 
          backgroundColor: '#000',
          borderTopWidth: 0,
          elevation: 0,
          height: 65,
          paddingBottom:10,
          paddingTop:10,
        },
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarShowLabel: false // Instagram-like: hide labels for cleaner look
      })}
    >
      <Tab.Screen 
        name="Search" 
        component={Index} 
        options={{
          tabBarLabel: 'Home'
        }}
      />
      <Tab.Screen 
        name="History" 
        component={History} 
        options={{
          tabBarLabel: 'History'
        }}
      />
      <Tab.Screen 
        name="Watchlist" 
        component={WatchListPage} 
        options={{
          tabBarLabel: 'Watchlist'
        }}
      />
      <Tab.Screen 
        name="Explore" 
        component={Explore} 
        options={{
          tabBarLabel: 'Explore'
        }}
      />
      {/* <Tab.Screen 
        name="Profile" 
        component={Profile} 
        options={{
          tabBarLabel: 'Profile'
        }}
      /> */}
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;