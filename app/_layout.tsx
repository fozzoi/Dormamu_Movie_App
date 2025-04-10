import { registerRootComponent } from "expo";
import AppNavigator from "./AppNavigator";

function RootLayout() {
  return <AppNavigator />;
}

export default RootLayout;

registerRootComponent(RootLayout);
