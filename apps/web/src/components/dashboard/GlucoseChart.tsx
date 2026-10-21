"use client";

import { GlucoseEvolutionPoint } from "@/lib/dashboard-api";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Tooltip } from "@mui/material";
import { DEFAULT_MIN_TARGET_GLUCOSE, DEFAULT_MAX_TARGET_GLUCOSE } from "@glucosapp/types";

interface GlucoseChartProps {
  data: GlucoseEvolutionPoint[];
  days?: number;
}

export const GlucoseChart = ({ data, days }: GlucoseChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(800);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Calculate chart dimensions - defined before hooks to use in dependencies
  const chartHeight = 300;
  const padding = 40;
  const leftPadding = 60; // Extra padding for Y-axis labels and unit

  // Fixed range for glucose values
  const minValue = 50;
  const maxValue = 220;
  const valueRange = maxValue - minValue;

  // Calculate Y scale with fixed range
  const scaleY = useCallback(
    (value: number) => {
      const normalized = (value - minValue) / valueRange;
      return chartHeight - padding - normalized * (chartHeight - 2 * padding);
    },
    [chartHeight, padding, minValue, valueRange],
  );

  // Generate path for min/max area
  const generateAreaPath = useCallback(() => {
    if (data.length < 2) return "";

    // Top path (max values)
    const topPath = data
      .map((point, index) => {
        const x = leftPadding + (index * (chartWidth - leftPadding - padding)) / (data.length - 1);
        const y = scaleY(Math.min(point.maxGlucose, maxValue)); // Clip to max
        return `${index === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");

    // Bottom path (min values) - in reverse
    const bottomPath = data
      .map((point, index) => {
        const reverseIndex = data.length - 1 - index;
        const x =
          leftPadding + (reverseIndex * (chartWidth - leftPadding - padding)) / (data.length - 1);
        const y = scaleY(Math.max(data[reverseIndex].minGlucose, minValue)); // Clip to min
        return `L ${x} ${y}`;
      })
      .join(" ");

    return `${topPath} ${bottomPath} Z`;
  }, [data, chartWidth, leftPadding, padding, scaleY, maxValue, minValue]);

  // Generate path for min glucose line
  const generateMinPath = useCallback(() => {
    return data
      .map((point, index) => {
        const x =
          leftPadding + (index * (chartWidth - leftPadding - padding)) / (data.length - 1 || 1);
        const y = scaleY(Math.max(point.minGlucose, minValue)); // Clip to min
        return `${index === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  }, [data, chartWidth, leftPadding, padding, scaleY, minValue]);

  // Generate path for max glucose line
  const generateMaxPath = useCallback(() => {
    return data
      .map((point, index) => {
        const x =
          leftPadding + (index * (chartWidth - leftPadding - padding)) / (data.length - 1 || 1);
        const y = scaleY(Math.min(point.maxGlucose, maxValue)); // Clip to max
        return `${index === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  }, [data, chartWidth, leftPadding, padding, scaleY, maxValue]);

  // Format dates for x-axis
  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return `${date.getDate()} ${date.toLocaleDateString("es-ES", { month: "short" })}`;
  }, []);

  // Determine point color based on average glucose
  const getPointColor = useCallback((avgGlucose: number): string => {
    if (avgGlucose < 70) return "#DC3545"; // red - hypoglycemia
    if (avgGlucose > 180) return "#FFC107"; // orange - hyperglycemia
    if (avgGlucose >= DEFAULT_MIN_TARGET_GLUCOSE && avgGlucose <= DEFAULT_MAX_TARGET_GLUCOSE)
      return "#28A745"; // green - target range
    return "#3b82f6"; // blue - acceptable
  }, []);

  // Format tooltip content
  const formatTooltipContent = useCallback(
    (point: GlucoseEvolutionPoint): JSX.Element => {
      return (
        <div style={{ textAlign: "center", fontSize: "12px" }}>
          <div style={{ fontWeight: 600, marginBottom: "4px" }}>{formatDate(point.date)}</div>
          <div>Promedio: {Math.round(point.averageGlucose)} mg/dL</div>
        </div>
      );
    },
    [formatDate],
  );

  // Generate SVG path for average glucose line
  const pathData = useMemo(() => {
    return data
      .map((point, index) => {
        const x =
          leftPadding + (index * (chartWidth - leftPadding - padding)) / (data.length - 1 || 1);
        const y = scaleY(point.averageGlucose);
        return `${index === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  }, [data, chartWidth, leftPadding, padding, scaleY]);

  // Determine how many labels to show to avoid overlap
  const labelInterval = useMemo(() => {
    if (data.length <= 7) return 1; // Show all
    if (data.length <= 15) return 2; // Show 1 of every 2
    if (data.length <= 30) return 4; // Show 1 of every 4
    return 6; // Show 1 of every 6
  }, [data.length]);

  // Generate paths
  const areaPath = useMemo(() => generateAreaPath(), [generateAreaPath]);
  const minPath = useMemo(() => generateMinPath(), [generateMinPath]);
  const maxPath = useMemo(() => generateMaxPath(), [generateMaxPath]);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        // Use container width minus padding (p-6 = 24px each side = 48px total)
        const containerWidth = containerRef.current.offsetWidth - 48;
        setChartWidth(Math.max(600, containerWidth)); // Minimum 600px
      }
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, [data]); // Update when data changes

  // Early return after all hooks
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-full flex flex-col">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Evolución de Nivel de Glucosa {days ? `- Últimos ${days} días` : ""}
        </h2>
        <div className="flex-1 flex items-center justify-center text-gray-500">
          No hay datos disponibles
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-full flex flex-col">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Evolución de Nivel de Glucosa {days ? `- Últimos ${days} días` : ""}
      </h2>

      <div ref={containerRef} className="flex-1 w-full relative">
        <svg
          width="100%"
          height={chartHeight}
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* 1. Background zones */}
          {/* Hypoglycemia zone (red, below 70) */}
          <rect
            x={leftPadding}
            y={scaleY(70)}
            width={chartWidth - leftPadding - padding}
            height={scaleY(minValue) - scaleY(70)}
            fill="rgba(220, 53, 69, 0.05)"
          />
          {/* Target zone (green, 80-140) */}
          <rect
            x={leftPadding}
            y={scaleY(DEFAULT_MAX_TARGET_GLUCOSE)}
            width={chartWidth - leftPadding - padding}
            height={scaleY(DEFAULT_MIN_TARGET_GLUCOSE) - scaleY(DEFAULT_MAX_TARGET_GLUCOSE)}
            fill="rgba(40, 167, 69, 0.08)"
          />
          {/* Hyperglycemia zone (orange, above 180) */}
          <rect
            x={leftPadding}
            y={scaleY(maxValue)}
            width={chartWidth - leftPadding - padding}
            height={scaleY(180) - scaleY(maxValue)}
            fill="rgba(255, 193, 7, 0.05)"
          />

          {/* 2. Grid lines */}
          {[50, 80, 110, 140, 170, 200, 220].map((value) => {
            const y = scaleY(value);
            return (
              <line
                key={`grid-${value}`}
                x1={leftPadding}
                y1={y}
                x2={chartWidth - padding}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
            );
          })}

          {/* 3. Target reference lines (dashed) */}
          <line
            x1={leftPadding}
            y1={scaleY(DEFAULT_MIN_TARGET_GLUCOSE)}
            x2={chartWidth - padding}
            y2={scaleY(DEFAULT_MIN_TARGET_GLUCOSE)}
            stroke="#28A745"
            strokeWidth="1.5"
            strokeDasharray="4,3"
          />
          <line
            x1={leftPadding}
            y1={scaleY(DEFAULT_MAX_TARGET_GLUCOSE)}
            x2={chartWidth - padding}
            y2={scaleY(DEFAULT_MAX_TARGET_GLUCOSE)}
            stroke="#28A745"
            strokeWidth="1.5"
            strokeDasharray="4,3"
          />

          {/* 4. Min/Max shaded area */}
          {data.length >= 2 && (
            <path
              d={areaPath}
              fill={hoveredIndex !== null ? "rgba(59, 130, 246, 0.25)" : "rgba(59, 130, 246, 0.15)"}
              style={{ transition: "fill 0.2s ease" }}
            />
          )}

          {/* 5. Min/Max contour lines */}
          {data.length >= 2 && (
            <>
              <path d={minPath} fill="none" stroke="rgba(59, 130, 246, 0.3)" strokeWidth="1" />
              <path d={maxPath} fill="none" stroke="rgba(59, 130, 246, 0.3)" strokeWidth="1" />
            </>
          )}

          {/* 6. Average glucose line */}
          <path d={pathData} fill="none" stroke="#3b82f6" strokeWidth="2" />

          {/* 7. Colored data points */}
          {data.map((point, index) => {
            const x =
              leftPadding + (index * (chartWidth - leftPadding - padding)) / (data.length - 1 || 1);
            const y = scaleY(point.averageGlucose);
            const isHovered = hoveredIndex === index;
            return (
              <circle
                key={`point-${index}`}
                cx={x}
                cy={y}
                r={isHovered ? 6 : 4}
                fill={getPointColor(point.averageGlucose)}
                style={{ transition: "r 0.2s ease" }}
              />
            );
          })}

          {/* 8. Axes */}
          <line
            x1={leftPadding}
            y1={padding}
            x2={leftPadding}
            y2={chartHeight - padding}
            stroke="#9ca3af"
            strokeWidth="1"
          />
          <line
            x1={leftPadding}
            y1={chartHeight - padding}
            x2={chartWidth - padding}
            y2={chartHeight - padding}
            stroke="#9ca3af"
            strokeWidth="1"
          />

          {/* Y-axis labels */}
          {[50, 80, 110, 140, 170, 200, 220].map((value) => {
            const y = scaleY(value);
            return (
              <text
                key={`label-${value}`}
                x={leftPadding - 10}
                y={y + 5}
                textAnchor="end"
                className="text-xs fill-gray-600"
              >
                {value}
              </text>
            );
          })}

          {/* X-axis labels */}
          {data.map((point, index) => {
            // Only show labels according to the interval to avoid overlap
            if (index % labelInterval !== 0 && index !== data.length - 1) {
              return null;
            }

            const x =
              leftPadding + (index * (chartWidth - leftPadding - padding)) / (data.length - 1 || 1);
            return (
              <text
                key={`xlabel-${index}`}
                x={x}
                y={chartHeight - padding + 20}
                textAnchor="middle"
                className="text-xs fill-gray-600"
              >
                {formatDate(point.date)}
              </text>
            );
          })}

          {/* Y-axis unit label */}
          <text
            x={leftPadding - 10}
            y={chartHeight - padding + 20}
            textAnchor="end"
            className="text-xs fill-gray-600 font-medium"
          >
            mg/dL
          </text>
        </svg>

        {/* 9. Tooltip triggers (positioned over data points) */}
        {data.map((point, index) => {
          const x =
            leftPadding + (index * (chartWidth - leftPadding - padding)) / (data.length - 1 || 1);
          const y = scaleY(point.averageGlucose);
          // Create a larger hover area around each point
          const hoverSize = 24; // 24px clickable area

          return (
            <Tooltip
              key={`tooltip-${index}`}
              title={formatTooltipContent(point)}
              placement="top"
              arrow
            >
              <div
                style={{
                  position: "absolute",
                  left: `${(x / chartWidth) * 100}%`,
                  top: `${(y / chartHeight) * 100}%`,
                  width: `${hoverSize}px`,
                  height: `${hoverSize}px`,
                  transform: "translate(-50%, -50%)",
                  cursor: "pointer",
                }}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
};
