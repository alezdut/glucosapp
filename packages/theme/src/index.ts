/**
 * Shared theme package for Glucosapp
 * Provides unified design tokens for web and mobile
 */

export { colors, type Colors } from "./colors";
export { spacing, type Spacing } from "./spacing";
export { fontSize, fontWeight, type FontSize, type FontWeight } from "./typography";
export { borderRadius, type BorderRadius } from "./borderRadius";

// Export a combined theme object for convenience
export const theme = {
  colors: require("./colors").colors,
  spacing: require("./spacing").spacing,
  fontSize: require("./typography").fontSize,
  fontWeight: require("./typography").fontWeight,
  borderRadius: require("./borderRadius").borderRadius,
};
