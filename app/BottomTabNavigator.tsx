// BottomTabNavigator.tsx
import React from 'react';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Dimensions, View, StyleSheet, TouchableOpacity } from 'react-native';

import { BlurView } from 'expo-blur';

// Import your existing tab screens
import History from '../app/history';
import Explore from './Explore';
import Index from '../app/index';
import WatchListPage from '../app/WatchListPage';

// Import your detail screens
import DetailPage from './DetailPage';
import CastDetails from './CastDetails';
import ViewAllPage from './ViewAllPage';
import ListDetails from './ListDetails';
import SimilarMoviesPage from './SimilarMoviesPage';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// --- CONFIGURATION ---
const DOCK_MARGIN_BOTTOM = Platform.OS === 'ios' ? 30 : 20;
const TAB_BAR_HEIGHT = 70; // Fixed height for the pill



// --- STACK OPTIONS ---
const SCREEN_WIDTH = Dimensions.get('window').width;

const stackScreenOptions = {
    headerShown: false,
    cardStyle: { backgroundColor: '#000' },
    animation: 'slide_from_right',
    fullScreenGestureEnabled: true,
    keyboardHandlingEnabled: true,
    presentation: 'card',
    animationEnabled: true,
    gestureDirection: 'horizontal',
    contentStyle: { backgroundColor: '#000' },
    // animationDuration: 222000,
    freezeOnBlur: true,
    detachPreviousScreen: false,
    cardOverlayEnabled: true,
    // Fade + slide in from right smoothly
    cardStyleInterpolator: ({ current, layouts }) => {
        const width = layouts?.screen?.width ?? SCREEN_WIDTH;
        const progress = current.progress;

        const translateX = progress.interpolate({
            inputRange: [0, 1],
            outputRange: [width * 0.25, 0], // start a bit from the right for a subtle slide
        });

        const opacity = progress.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, 0.6, 1],
        });

        return {
            cardStyle: {
                transform: [{ translateX }],
                opacity,
            },
            overlayStyle: {
                backgroundColor: '#000',
                opacity: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.5],
                }),
            },
        };
    },
};

// --- STACK NAVIGATORS ---
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

// --- 2. CUSTOM TAB BAR ---
const CustomTabBar: React.FC<BottomTabBarProps> = (props) => {
  const { state, navigation, descriptors } = props;

  return (
    <View style={localStyles.container}>
        {/* Blur Background */}
        <BlurView 
          intensity={60}
          tint='dark'
          experimentalBlurMethod="dimezisBlurView"
          style={{
            ...StyleSheet.absoluteFillObject,
            borderRadius: 40,
          }}
        />
        
        {/* Icons Container */}
        <View style={localStyles.tabBarInner}>
            {state.routes.map((route, index) => {
                const { options } = descriptors[route.key];
                const isFocused = state.index === index;

                const onPress = () => {
                    const event = navigation.emit({
                        type: 'tabPress',
                        target: route.key,
                        canPreventDefault: true,
                    });

                    if (!isFocused && !event.defaultPrevented) {
                        navigation.navigate(route.name);
                    }
                };

                const iconComponent = options.tabBarIcon 
                    ? options.tabBarIcon({ 
                        focused: isFocused, 
                        color: isFocused ? '#E50914' : '#888888', 
                        size: 26 
                    })
                    : null;

                return (
                    <TouchableOpacity
                        key={route.key}
                        accessibilityRole="button"
                        accessibilityState={isFocused ? { selected: true } : {}}
                        onPress={onPress}
                        style={localStyles.tabButton} 
                    >
                        {iconComponent}
                    </TouchableOpacity>
                );
            })}
        </View>
    </View>
  );
};

// --- 3. STYLES (SIMPLIFIED) ---
const localStyles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: DOCK_MARGIN_BOTTOM,
        left: 50,
        right: 50,
        height: TAB_BAR_HEIGHT,
        borderRadius: 40, // Pill shape
        justifyContent: 'center', // Centers the inner view vertically
        overflow: 'hidden',
        borderColor: 'rgba(255, 255, 255, 0.3)',
        borderLeftWidth: 0.5,
        borderTopWidth: 0.5,
        borderRightWidth: 0.5,
        borderBottomWidth: 0.5,
    },
    tabBarInner: {
        flexDirection: 'row',
        width: '100%',
        height: '100%',
        justifyContent: 'space-evenly',
        alignItems: 'center', // This forces icons to vertical center
    },
    tabButton: {
        flex: 1,
        height: '100%',
        justifyContent: 'center', // Centers icon inside button
        alignItems: 'center',     // Centers icon inside button
    }
});

// --- 4. ROOT COMPONENT ---
const RootTabNavigator = () => {
    return (
            <Tab.Navigator
                tabBar={props => <CustomTabBar {...props} />}
                screenOptions={({ route }) => ({
                    tabBarIcon: ({ color, size, focused }) => {
                        let iconName: keyof typeof Ionicons.glyphMap = 'search';

                        if (route.name === 'Search') {
                            iconName = focused ? 'search' : 'search-outline';
                        } else if (route.name === 'Watchlist') {
                            iconName = focused ? 'bookmark' : 'bookmark-outline';
                        } else if (route.name === 'Explore') {
                            iconName = focused ? 'compass' : 'compass-outline';
                        }

                        return <Ionicons name={iconName} size={size} color={color} />;
                    },
                    headerShown: false,
                    tabBarShowLabel: false, 
                    tabBarHideOnKeyboard: false,
                })}>
                <Tab.Screen name="Explore" component={ExploreStack} />
                <Tab.Screen name="Watchlist" component={WatchlistStack} />
                <Tab.Screen name="Search" component={SearchStack} />
            </Tab.Navigator>
    );
};

export default RootTabNavigator;