// BottomTabNavigator.tsx
import React, { useEffect, createContext, useState } from 'react';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Dimensions, View, StyleSheet, TouchableOpacity } from 'react-native';
// Reanimated imports
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

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

// --- CONFIGURATION ---
const DOCK_MARGIN_BOTTOM = Platform.OS === 'ios' ? 30 : 20;
const TAB_BAR_HEIGHT = 70; // Fixed height for the pill

// --- 1. SCROLL CONTEXT ---
interface ScrollContextProps {
  tabBarVisible: boolean;
  setTabBarVisible: (visible: boolean) => void;
  tabBarHeight: number;
}

const ScrollContext = createContext<ScrollContextProps>({
  tabBarVisible: true,
  setTabBarVisible: () => {},
  tabBarHeight: TAB_BAR_HEIGHT + DOCK_MARGIN_BOTTOM,
});

// --- STACK OPTIONS ---
const SCREEN_WIDTH = Dimensions.get('window').width;

const stackScreenOptions = {
    headerShown: false,
    cardStyle: { backgroundColor: '#000' },
    animation: 'fade',
    fullScreenGestureEnabled: true,
    keyboardHandlingEnabled: true,
    presentation: 'card',
    animationEnabled: true,
    gestureDirection: 'horizontal',
    contentStyle: { backgroundColor: '#000' },
    animationDuration: 200,
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
  const { tabBarVisible } = React.useContext(ScrollContext);
  
  const translateY = useSharedValue(0); 

  useEffect(() => {
    translateY.value = withTiming(tabBarVisible ? 0 : TAB_BAR_HEIGHT + DOCK_MARGIN_BOTTOM + 20, {
      duration: 300,
      easing: Easing.inOut(Easing.ease),
    });
  }, [tabBarVisible, translateY]);
  
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  return (
    <Animated.View style={[localStyles.container, animatedStyle]}>
        {/* Background View (Gray) */}
        <View style={localStyles.backgroundView} />
        
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
    </Animated.View>
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
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        justifyContent: 'center', // Centers the inner view vertically
    },
    backgroundView: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000000ff', // Dark Gray
        opacity: 0.95, // Slight transparency
        borderRadius: 40,
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
    const [tabBarVisible, setTabBarVisible] = useState(true);
    
    const contextValue = React.useMemo(() => ({
        tabBarVisible,
        setTabBarVisible,
        tabBarHeight: TAB_BAR_HEIGHT + DOCK_MARGIN_BOTTOM,
    }), [tabBarVisible]);

    return (
        <ScrollContext.Provider value={contextValue}>
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
                })}
            >
                <Tab.Screen name="Explore" component={ExploreStack} />
                <Tab.Screen name="Watchlist" component={WatchlistStack} />
                <Tab.Screen name="Search" component={SearchStack} />
            </Tab.Navigator>
        </ScrollContext.Provider>
    );
};

export default RootTabNavigator;