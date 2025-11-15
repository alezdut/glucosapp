/**
 * Brand logo specification (geometry only) shared across platforms.
 * Web and mobile renderers should import these shapes and draw using
 * platform-appropriate SVG primitives.
 */
import { colors } from "../colors";

export type BrandLogoCircle = {
  cx: number;
  cy: number;
  r: number;
};

export type BrandLogoSpec = {
  viewBox: string;
  /**
   * Optional rounded background rectangle (when showBackground is enabled).
   */
  backgroundRect: {
    x: number;
    y: number;
    width: number;
    height: number;
    rx: number;
    fill: string;
  };
  /**
   * Main path of the droplet/curve.
   */
  mainPathD: string;
  /**
   * Connection lines between points.
   */
  connectionPathsD: string[];
  /**
   * Point markers.
   */
  circles: BrandLogoCircle[];
  /**
   * Defaults derived from theme colors.
   */
  defaults: {
    stroke: string;
    tracer: string;
    strokeWidth: number;
  };
};

export const brandLogoSpec: BrandLogoSpec = {
  viewBox: "-4.8 -4.8 57.60 57.60",
  backgroundRect: {
    x: -4.8,
    y: -4.8,
    width: 57.6,
    height: 57.6,
    rx: 6.336,
    fill: "#ffffff",
  },
  // From provided SVG
  mainPathD:
    "M23.9972,4.5S10.2694,22.1905,10.2694,29.7722a13.8806,13.8806,0,0,0,.0733,1.4186,1.9532,1.9532,0,1,1,1.3658,3.3484h-.0017a1.9552,1.9552,0,0,1-.6257-.109A13.7293,13.7293,0,0,0,37.53,32.0777a1.9533,1.9533,0,1,1,.0526-3.76C36.14,20.1493,23.9972,4.5,23.9972,4.5Z",
  connectionPathsD: [
    "M13.16,31.2692l2.6547-3.3862",
    "M18.3135,27.8493l2.1344,2.6084",
    "M22.6976,30.3743l4.1737-8.3466",
    "M28.4042,22.2026l2.386,9.3508",
    "M33.0082,32.5447,35.1617,30.88",
  ],
  circles: [
    { cx: 16.9271, cy: 26.3318, r: 1.9551 },
    { cx: 21.5919, cy: 31.9788, r: 1.9551 },
    { cx: 27.6966, cy: 20.248, r: 1.9551 },
    { cx: 31.1998, cy: 33.5303, r: 1.9551 },
  ],
  defaults: {
    stroke: colors.primary,
    tracer: "#8FB5DE", // aligns with primaryLight
    strokeWidth: 1.632,
  },
};

export const brandLogoViewBox = brandLogoSpec.viewBox;
export const brandLogoShapes = brandLogoSpec;
