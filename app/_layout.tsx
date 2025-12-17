import React, { useEffect } from 'react';
import { Platform } from 'react-native'; // ✅ Added
import { registerRootComponent } from "expo";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as Brightness from 'expo-brightness'; // ✅ Added
import AppNavigator from "./AppNavigator";

SplashScreen.preventAutoHideAsync();

function RootLayout() {
  const [fontsLoaded] = useFonts({
    'GoogleSansFlex-Regular': require('../assets/fonts/GoogleSansFlex-Regular.ttf'),
    'GoogleSansFlex-Medium': require('../assets/fonts/GoogleSansFlex-Medium.ttf'),
    'GoogleSansFlex-Bold': require('../assets/fonts/GoogleSansFlex-Bold.ttf'),
  });

  // ✅ 1. Permission Logic (Moved UP before any return statements)
  useEffect(() => {
    (async () => {
      if (Platform.OS === 'android') {
        try {
          const { status } = await Brightness.getPermissionsAsync();
          if (status !== 'granted') {
            const { status: newStatus } = await Brightness.requestPermissionsAsync();
            if (newStatus !== 'granted') {
              console.log("Brightness permission denied");
            }
          }
        } catch (e) {
          console.log("Error requesting brightness permission:", e);
        }
      }
    })();
  }, []);

  // ✅ 2. Hide Splash Screen when fonts load
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // ✅ 3. Conditional Return (Must be at the bottom)
  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: '#000' }}>
      <AppNavigator />
    </SafeAreaProvider>
  );
}

export default RootLayout;

registerRootComponent(RootLayout);