import React from "react";
import Svg, { G, Path, Circle, Rect } from "react-native-svg";
import { brandLogoViewBox, brandLogoShapes } from "@glucosapp/theme";

type BrandLogoProps = {
  size?: number;
  color?: string;
  showBackground?: boolean;
  accessibilityLabel?: string;
};

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 24,
  color,
  showBackground = false,
  accessibilityLabel = "GlucosApp logo",
}) => {
  const strokeColor = color ?? brandLogoShapes.defaults.stroke;

  return (
    <Svg
      width={size}
      height={size}
      viewBox={brandLogoViewBox}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      {showBackground && (
        <Rect
          x={brandLogoShapes.backgroundRect.x}
          y={brandLogoShapes.backgroundRect.y}
          width={brandLogoShapes.backgroundRect.width}
          height={brandLogoShapes.backgroundRect.height}
          rx={brandLogoShapes.backgroundRect.rx}
          fill={brandLogoShapes.backgroundRect.fill}
        />
      )}
      <G
        stroke={strokeColor}
        strokeWidth={brandLogoShapes.defaults.strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <Path d={brandLogoShapes.mainPathD} />
        {brandLogoShapes.circles.map((c, idx) => (
          <Circle key={`c-${idx}`} cx={c.cx} cy={c.cy} r={c.r} />
        ))}
        {brandLogoShapes.connectionPathsD.map((d, idx) => (
          <Path key={`p-${idx}`} d={d} />
        ))}
      </G>
    </Svg>
  );
};
