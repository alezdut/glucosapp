import { Platform } from "react-native";

export const theme = {
  colors: {
    primary: "#007AFF", // iOS blue for primary actions like scan button
    background: "#FFFFFF", // White background
    text: "#000000", // Black text
    tabBarBackground: "#F8F9FA", // Light gray for tab bar background
    tabBarIconActive: "#007AFF", // Primary color for active tab icons
    tabBarIconInactive: "#8E8E93", // Gray for inactive tab icons
    secondary: "#6C757D", // Secondary gray
    success: "#28A745", // Green for success states
    warning: "#FFC107", // Yellow for warnings
    error: "#DC3545", // Red for errors
    border: "#E5E5E7", // Light border color
    card: "#FFFFFF", // Card background
    shadow: "#000000", // Shadow color
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
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
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
