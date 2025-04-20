// BottomTabNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import Animated, { Layout } from 'react-native-reanimated';
import History from '../app/history';
import Explore from './Explore';
import Index from '../app/index';
import WatchListPage from '../app/WatchListPage';
// import { white } from 'react-native-paper/lib/typescript/styles/themes/v2/colors';
const Tab = createBottomTabNavigator();

const BottomTabNavigator = () => {
  return (
    <Tab.Navigator
      initialRouteName="Search"
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

          return <Ionicons name={iconName} size={size} color={'white'} />;
        },
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: { backgroundColor: '#000' }, // Set tab bar background to black
        headerShown: false,
        tabBarHideOnKeyboard: true, // Hide tab bar on keyboard open
      })}
    >
      <Tab.Screen
        name="Search"
        component={Index}
        options={{
          tabBarLabel: ({ focused }) => (
            <Animated.Text
              layout={Layout} // Use `Layout` for animations
              style={{ color: focused ? '#4CAF50' : 'gray' }}
            >
              Search
            </Animated.Text>
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={History}
        options={{
          tabBarLabel: ({ focused }) => (
            <Animated.Text
              layout={Layout} // Use `Layout` for animations
              style={{ color: focused ? '#4CAF50' : 'gray' }}
            >
              History
            </Animated.Text>
          ),
        }}
      />
      <Tab.Screen
        name="Watchlist"
        component={WatchListPage}
        options={{
          tabBarLabel: ({ focused }) => (
            <Animated.Text
              layout={Layout} // Use `Layout` for animations
              style={{ color: focused ? '#4CAF50' : 'gray' }}
            >
              Watchlist
            </Animated.Text>
          ),
        }}
      />
      <Tab.Screen
        name="Explore"
        component={Explore}
        options={{
          tabBarLabel: ({ focused }) => (
            <Animated.Text
              layout={Layout} // Use `Layout` for animations
              style={{ color: focused ? '#4CAF50' : 'gray' }}
            >
              Explore
            </Animated.Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;
