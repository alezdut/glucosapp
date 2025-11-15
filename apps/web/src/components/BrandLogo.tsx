"use client";

import React from "react";
import { brandLogoViewBox, brandLogoShapes } from "@glucosapp/theme";

type BrandLogoProps = {
  size?: number | string;
  color?: string;
  showBackground?: boolean;
  title?: string;
  className?: string;
};

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 24,
  color,
  showBackground = false,
  title = "GlucosApp logo",
  className,
}) => {
  const strokeColor = color ?? "currentColor";
  const pxSize = typeof size === "number" ? `${size}px` : size;

  return (
    <svg
      width={pxSize}
      height={pxSize}
      viewBox={brandLogoViewBox}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="none"
    >
      <title>{title}</title>
      {showBackground && (
        <rect
          x={brandLogoShapes.backgroundRect.x}
          y={brandLogoShapes.backgroundRect.y}
          width={brandLogoShapes.backgroundRect.width}
          height={brandLogoShapes.backgroundRect.height}
          rx={brandLogoShapes.backgroundRect.rx}
          fill={brandLogoShapes.backgroundRect.fill}
        />
      )}
      <g
        stroke={strokeColor}
        strokeWidth={brandLogoShapes.defaults.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={brandLogoShapes.mainPathD} />
        {brandLogoShapes.circles.map((c, idx) => (
          <circle key={`c-${idx}`} cx={c.cx} cy={c.cy} r={c.r} />
        ))}
        {brandLogoShapes.connectionPathsD.map((d, idx) => (
          <path key={`p-${idx}`} d={d} />
        ))}
      </g>
    </svg>
  );
};
