/**
 * Unified color palette for Glucosapp
 * Shared between web and mobile applications
 */

export const colors = {
  // Primary brand color - blue from reference design
  primary: "#6B9BD1",
  primaryLight: "#8FB5DE",
  primaryDark: "#4A7DB3",

  // Secondary colors
  secondary: "#6C757D",
  secondaryLight: "#ADB5BD",
  secondaryDark: "#495057",

  // Semantic colors
  success: "#28A745",
  successLight: "#5CB85C",
  successDark: "#1E7E34",

  warning: "#FFC107",
  warningLight: "#FFD54F",
  warningDark: "#FFA000",

  error: "#DC3545",
  errorLight: "#E57373",
  errorDark: "#C62828",

  info: "#17A2B8",
  infoLight: "#5DADE2",
  infoDark: "#117A8B",

  // Neutral colors
  background: "#FFFFFF",
  backgroundGray: "#F8F9FA",
  surface: "#FFFFFF",
  surfaceGray: "#F5F5F5",

  // Text colors
  text: "#000000",
  textSecondary: "#666666",
  textTertiary: "#999999",
  textDisabled: "#CCCCCC",

  // Border colors
  border: "#E5E5E7",
  borderLight: "#F0F0F0",
  borderDark: "#CCCCCC",

  // Shadow
  shadow: "#000000",

  // Card backgrounds
  card: "#FFFFFF",
  cardElevated: "#FAFAFA",

  // Tab bar (mobile specific but can be used on web too)
  tabBarBackground: "#FFFFFF",
  tabBarBorder: "#E5E5E7",
  tabBarIconActive: "#6B9BD1",
  tabBarIconInactive: "#8E8E93",
} as const;

export type Colors = typeof colors;
