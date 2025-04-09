import { registerRootComponent } from "expo";
import BottomTabNavigator from "./BottomTabNavigator";

function RootLayout() {
  return <BottomTabNavigator />;
}

export default RootLayout;

// Register the root component
registerRootComponent(RootLayout);
