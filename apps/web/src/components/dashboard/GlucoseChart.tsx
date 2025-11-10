"use client";

import { GlucoseEvolutionPoint } from "@/lib/dashboard-api";
import { useEffect, useRef, useState } from "react";

interface GlucoseChartProps {
  data: GlucoseEvolutionPoint[];
}

export const GlucoseChart = ({ data }: GlucoseChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(800);

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

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-full flex flex-col">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Evolución de Nivel de Glucosa</h2>
        <div className="flex-1 flex items-center justify-center text-gray-500">
          No hay datos disponibles
        </div>
      </div>
    );
  }

  // Calculate chart dimensions
  const chartHeight = 300;
  const padding = 40;
  const leftPadding = 60; // Extra padding for Y-axis labels and unit

  // Fixed range for glucose values
  const minValue = 50;
  const maxValue = 220;
  const valueRange = maxValue - minValue;

  // Calculate Y scale with fixed range
  const scaleY = (value: number) => {
    const normalized = (value - minValue) / valueRange;
    return chartHeight - padding - normalized * (chartHeight - 2 * padding);
  };

  // Generate SVG path for average glucose line
  const pathData = data
    .map((point, index) => {
      const x =
        leftPadding + (index * (chartWidth - leftPadding - padding)) / (data.length - 1 || 1);
      const y = scaleY(point.averageGlucose);
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  // Format dates for x-axis
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getDate()} ${date.toLocaleDateString("es-ES", { month: "short" })}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-full flex flex-col">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Evolución de Nivel de Glucosa</h2>
      <div ref={containerRef} className="flex-1 w-full">
        <svg
          width="100%"
          height={chartHeight}
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Y-axis line */}
          <line
            x1={leftPadding}
            y1={padding}
            x2={leftPadding}
            y2={chartHeight - padding}
            stroke="#9ca3af"
            strokeWidth="1"
          />

          {/* X-axis line */}
          <line
            x1={leftPadding}
            y1={chartHeight - padding}
            x2={chartWidth - padding}
            y2={chartHeight - padding}
            stroke="#9ca3af"
            strokeWidth="1"
          />

          {/* Y-axis labels with reference lines for range 50-220 mg/dL */}
          {[50, 80, 110, 140, 170, 200, 220].map((value) => {
            const y = scaleY(value);
            return (
              <g key={value}>
                <line
                  x1={leftPadding}
                  y1={y}
                  x2={chartWidth - padding}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
                <text
                  x={leftPadding - 10}
                  y={y + 5}
                  textAnchor="end"
                  className="text-xs fill-gray-600"
                >
                  {value}
                </text>
              </g>
            );
          })}

          {/* X-axis labels */}
          {data.map((point, index) => {
            const x =
              leftPadding + (index * (chartWidth - leftPadding - padding)) / (data.length - 1 || 1);
            return (
              <text
                key={index}
                x={x}
                y={chartHeight - padding + 20}
                textAnchor="middle"
                className="text-xs fill-gray-600"
              >
                {formatDate(point.date)}
              </text>
            );
          })}

          {/* Average glucose line */}
          <path d={pathData} fill="none" stroke="#3b82f6" strokeWidth="2" />

          {/* Data points */}
          {data.map((point, index) => {
            const x =
              leftPadding + (index * (chartWidth - leftPadding - padding)) / (data.length - 1 || 1);
            const y = scaleY(point.averageGlucose);
            return <circle key={index} cx={x} cy={y} r="4" fill="#3b82f6" />;
          })}

          {/* Y-axis unit label (under the Y-axis, not centered) */}
          <text
            x={leftPadding - 10}
            y={chartHeight - padding + 20}
            textAnchor="end"
            className="text-xs fill-gray-600 font-medium"
          >
            mg/dL
          </text>
        </svg>
      </div>
    </div>
  );
};
