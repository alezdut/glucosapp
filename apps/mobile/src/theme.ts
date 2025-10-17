import { Platform } from "react-native";
import {
  colors as sharedColors,
  spacing as sharedSpacing,
  fontSize as sharedFontSize,
  borderRadius as sharedBorderRadius,
} from "@glucosapp/theme";

export const theme = {
  colors: {
    ...sharedColors,
    // Mobile-specific overrides if needed
    primary: sharedColors.primary,
    background: sharedColors.background,
    text: sharedColors.text,
    tabBarBackground: sharedColors.tabBarBackground,
    tabBarIconActive: sharedColors.tabBarIconActive,
    tabBarIconInactive: sharedColors.tabBarIconInactive,
    secondary: sharedColors.secondary,
    success: sharedColors.success,
    warning: sharedColors.warning,
    error: sharedColors.error,
    border: sharedColors.border,
    card: sharedColors.card,
    shadow: sharedColors.shadow,
  },
  platform: {
    ios: {
      tabBarBackground: "#FFFFFF", // Pure white for iOS
      tabBarBorder: "#E5E5E7", // Subtle border
      tabBarIconActive: "#007AFF", // iOS blue
      tabBarIconInactive: "#8E8E93", // iOS gray
      tabBarLabelActive: "#007AFF", // iOS blue
      tabBarLabelInactive: "#8E8E93", // iOS gray
      tabBarHeight: 88, // iOS standard height
      tabBarPaddingBottom: 34, // iOS safe area
      tabBarPaddingTop: 8,
      tabBarBorderWidth: 0.5, // Subtle border
      tabBarShadow: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: -1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 0,
      },
    },
    android: {
      tabBarBackground: "#FFFFFF", // Material white
      tabBarBorder: "#E0E0E0", // Material border
      tabBarIconActive: "#1976D2", // Material blue
      tabBarIconInactive: "#757575", // Material gray
      tabBarLabelActive: "#1976D2", // Material blue
      tabBarLabelInactive: "#757575", // Material gray
      tabBarHeight: 72, // Material standard height
      tabBarPaddingBottom: 8, // Material padding
      tabBarPaddingTop: 8,
      tabBarBorderWidth: 1, // Material border
      tabBarShadow: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 8, // Material elevation
      },
    },
  },
  spacing: sharedSpacing,
  borderRadius: sharedBorderRadius,
  fontSize: sharedFontSize,
} as const;

// Platform-specific theme getter
export const getPlatformTheme = () => {
  const platformConfig = Platform.OS === "ios" ? theme.platform.ios : theme.platform.android;

  return {
    ...theme,
    colors: {
      ...theme.colors,
      tabBarBackground: platformConfig.tabBarBackground,
      tabBarIconActive: platformConfig.tabBarIconActive,
      tabBarIconInactive: platformConfig.tabBarIconInactive,
    },
    platformConfig,
  };
};

export type Theme = typeof theme;
