/**
 * Shared theme package for Glucosapp
 * Provides unified design tokens for web and mobile
 */

import { colors } from "./colors";
import { spacing } from "./spacing";
import { fontSize, fontWeight } from "./typography";
import { borderRadius } from "./borderRadius";

export { colors, type Colors } from "./colors";
export { spacing, type Spacing } from "./spacing";
export { fontSize, fontWeight, type FontSize, type FontWeight } from "./typography";
export { borderRadius, type BorderRadius } from "./borderRadius";
export {
  brandLogoSpec as brandLogoShapes,
  brandLogoViewBox,
  type BrandLogoSpec,
  type BrandLogoCircle,
} from "./brand/logo";

// Export a combined theme object for convenience
export const theme = {
  colors,
  spacing,
  fontSize,
  fontWeight,
  borderRadius,
};
