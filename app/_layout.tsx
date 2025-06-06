import { registerRootComponent } from "expo";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from "./AppNavigator";

function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
  );
}

export default RootLayout;

registerRootComponent(RootLayout);
