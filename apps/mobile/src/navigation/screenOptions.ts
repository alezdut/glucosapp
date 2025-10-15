import { Platform } from "react-native";
import { getPlatformTheme } from "../theme";

export const getTabBarScreenOptions = () => {
  const { platformConfig } = getPlatformTheme();

  return {
    headerShown: false,
    tabBarStyle: {
      backgroundColor: platformConfig.tabBarBackground,
      borderTopColor: platformConfig.tabBarBorder,
      borderTopWidth: platformConfig.tabBarBorderWidth,
      paddingBottom: platformConfig.tabBarPaddingBottom,
      paddingTop: platformConfig.tabBarPaddingTop,
      height: platformConfig.tabBarHeight,
      ...platformConfig.tabBarShadow,
    },
    tabBarActiveTintColor: platformConfig.tabBarIconActive,
    tabBarInactiveTintColor: platformConfig.tabBarIconInactive,
    tabBarLabelStyle: {
      fontSize: 12,
      fontWeight: "500" as const,
    },
  };
};

export const getScanTabOptions = () => {
  const { platformConfig } = getPlatformTheme();

  return {
    tabBarLabelStyle: {
      fontSize: 12,
      fontWeight: "600" as const,
      color: platformConfig.tabBarIconActive,
    },
  };
};

// Keep the old exports for backward compatibility
export const tabBarScreenOptions = getTabBarScreenOptions();
export const scanTabOptions = getScanTabOptions();
