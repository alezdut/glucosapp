"use client";

import { useEffect, useRef, useState } from "react";
import { PatientGlucoseEvolutionPoint } from "@/lib/dashboard-api";
import { Tooltip } from "@mui/material";

interface PatientGlucoseChartProps {
  data: PatientGlucoseEvolutionPoint[];
}

export const PatientGlucoseChart = ({ data }: PatientGlucoseChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(800);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth - 48;
        setChartWidth(Math.max(600, containerWidth));
      }
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-full flex flex-col">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Niveles de Glucosa</h2>
        <p className="text-sm text-gray-500 mb-4">Promedio mensual (últimos 12 meses)</p>
        <div className="flex-1 flex items-center justify-center text-gray-500">
          No hay datos disponibles
        </div>
      </div>
    );
  }

  const chartHeight = 300;
  const padding = 40;
  const leftPadding = 60;

  const minValue = 0;
  const maxValue = 160;
  const valueRange = maxValue - minValue;

  const scaleY = (value: number) => {
    if (value === 0) return chartHeight - padding;
    const normalized = (value - minValue) / valueRange;
    return chartHeight - padding - normalized * (chartHeight - 2 * padding);
  };

  // Calculate bar width and spacing
  const availableWidth = chartWidth - leftPadding - padding;
  const barWidth = (availableWidth / data.length) * 0.6; // Each bar is 60% of available space per month
  const barSpacing = (availableWidth / data.length) * 0.4; // 40% spacing between bars

  // Format month for x-axis
  const formatMonth = (monthString: string) => {
    const [year, month] = monthString.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString("es-ES", { month: "short" });
  };

  // Tooltip content generator
  const getTooltipContent = (point: PatientGlucoseEvolutionPoint) => {
    const monthName = formatMonth(point.month);
    const value = point.averageGlucose > 0 ? `${point.averageGlucose} mg/dL` : "Sin datos";
    return `${monthName}: ${value}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-full flex flex-col">
      <h2 className="text-lg font-semibold text-gray-900 mb-2">Niveles de Glucosa</h2>
      <p className="text-sm text-gray-500 mb-4">Promedio mensual (últimos 12 meses)</p>
      <div ref={containerRef} className="flex-1 w-full relative">
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

          {/* Y-axis labels and reference lines */}
          {[0, 40, 80, 120, 160].map((value) => {
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

          {/* Bars */}
          {data.map((point, index) => {
            const x = leftPadding + index * (barWidth + barSpacing) + barSpacing / 2;
            const barY = scaleY(point.averageGlucose);
            // Always show bar, even if value is 0 (use minimum height of 2px for visibility)
            const minBarHeight = 2;
            const barHeight =
              point.averageGlucose > 0 ? chartHeight - padding - barY : minBarHeight;
            const actualBarY =
              point.averageGlucose > 0 ? barY : chartHeight - padding - minBarHeight;

            return (
              <g key={index}>
                {/* Bar */}
                <rect
                  x={x}
                  y={actualBarY}
                  width={barWidth}
                  height={barHeight}
                  fill={point.averageGlucose > 0 ? "#3b82f6" : "#e5e7eb"}
                  rx="2"
                />
                {/* X-axis label */}
                <text
                  x={x + barWidth / 2}
                  y={chartHeight - padding + 20}
                  textAnchor="middle"
                  className="text-xs fill-gray-600"
                >
                  {formatMonth(point.month)}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Tooltips positioned over bars */}
        {data.map((point, index) => {
          const x = leftPadding + index * (barWidth + barSpacing) + barSpacing / 2;
          const barY = scaleY(point.averageGlucose);
          const minBarHeight = 2;
          const barHeight = point.averageGlucose > 0 ? chartHeight - padding - barY : minBarHeight;
          const actualBarY = point.averageGlucose > 0 ? barY : chartHeight - padding - minBarHeight;

          return (
            <Tooltip key={index} title={getTooltipContent(point)} placement="top" arrow>
              <div
                style={{
                  position: "absolute",
                  left: `${(x / chartWidth) * 100}%`,
                  top: `${(actualBarY / chartHeight) * 100}%`,
                  width: `${(barWidth / chartWidth) * 100}%`,
                  height: `${(barHeight / chartHeight) * 100}%`,
                  cursor: "pointer",
                }}
              />
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
};
