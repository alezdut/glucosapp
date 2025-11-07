"use client";

import { useEffect, useRef, useState } from "react";
import { PatientInsulinStatsPoint } from "@/lib/dashboard-api";

interface PatientInsulinChartProps {
  data: PatientInsulinStatsPoint[];
}

export const PatientInsulinChart = ({ data }: PatientInsulinChartProps) => {
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
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Dosis de Insulina</h2>
        <p className="text-sm text-gray-500 mb-4">Dosis promedio mensual</p>
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
  const maxValue = 20;
  const valueRange = maxValue - minValue;

  const scaleY = (value: number) => {
    if (value === 0) return chartHeight - padding;
    const normalized = (value - minValue) / valueRange;
    return chartHeight - padding - normalized * (chartHeight - 2 * padding);
  };

  // Calculate bar width and spacing
  const availableWidth = chartWidth - leftPadding - padding;
  const barGroupWidth = availableWidth / data.length;
  const barWidth = barGroupWidth * 0.3; // Each bar is 30% of group width
  const barSpacing = barGroupWidth * 0.1; // 10% spacing between bars

  // Format month for x-axis
  const formatMonth = (monthString: string) => {
    const [year, month] = monthString.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString("es-ES", { month: "short" });
  };

  // Find max value for scaling
  const maxBarValue = Math.max(
    ...data.map((point) => Math.max(point.averageBasal, point.averageBolus)),
  );
  const effectiveMax = maxBarValue > 0 ? Math.ceil(maxBarValue / 5) * 5 : 20;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-full flex flex-col">
      <h2 className="text-lg font-semibold text-gray-900 mb-2">Dosis de Insulina</h2>
      <p className="text-sm text-gray-500 mb-4">Dosis promedio mensual</p>
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

          {/* Y-axis labels and reference lines */}
          {[0, 5, 10, 15, 20].map((value) => {
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
            const x = leftPadding + index * barGroupWidth + barGroupWidth / 2;
            return (
              <text
                key={index}
                x={x}
                y={chartHeight - padding + 20}
                textAnchor="middle"
                className="text-xs fill-gray-600"
              >
                {formatMonth(point.month)}
              </text>
            );
          })}

          {/* Bars */}
          {data.map((point, index) => {
            const groupX = leftPadding + index * barGroupWidth;
            const centerX = groupX + barGroupWidth / 2;

            // Basal bar (light green)
            const basalHeight = point.averageBasal > 0 ? scaleY(0) - scaleY(point.averageBasal) : 0;
            const basalY = scaleY(point.averageBasal);

            // Bolus bar (blue)
            const bolusHeight = point.averageBolus > 0 ? scaleY(0) - scaleY(point.averageBolus) : 0;
            const bolusY = scaleY(point.averageBolus);

            return (
              <g key={index}>
                {/* Basal bar */}
                {point.averageBasal > 0 && (
                  <rect
                    x={centerX - barWidth - barSpacing / 2}
                    y={basalY}
                    width={barWidth}
                    height={basalHeight}
                    fill="#86efac"
                    rx="2"
                  />
                )}

                {/* Bolus bar */}
                {point.averageBolus > 0 && (
                  <rect
                    x={centerX + barSpacing / 2}
                    y={bolusY}
                    width={barWidth}
                    height={bolusHeight}
                    fill="#3b82f6"
                    rx="2"
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
