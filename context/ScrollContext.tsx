import { createContext } from 'react';
import { Platform } from 'react-native';

export const TAB_BAR_HEIGHT = 70;
export const DOCK_MARGIN_BOTTOM = Platform.OS === 'ios' ? 30 : 20;

export interface ScrollContextType {
  tabBarVisible: boolean;
  setTabBarVisible: (visible: boolean) => void;
  tabBarHeight: number;
}

export const ScrollContext = createContext<ScrollContextType>({
  tabBarVisible: true,
  setTabBarVisible: () => {},
  tabBarHeight: TAB_BAR_HEIGHT + DOCK_MARGIN_BOTTOM,
});
