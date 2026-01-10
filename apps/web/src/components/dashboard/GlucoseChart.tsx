"use client";

import { GlucoseEvolutionPoint } from "@/lib/dashboard-api";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

interface GlucoseChartProps {
  data: GlucoseEvolutionPoint[];
}

const formatDate = (dateString: string) => {
  // Parse date string (YYYY-MM-DD) without timezone issues
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return `${date.getDate()} ${date.toLocaleDateString("es-ES", { month: "short" })}`;
};

const CustomDot = (props: any) => {
  const { cx, cy } = props;
  return <circle cx={cx} cy={cy} r={4} fill="#3b82f6" />;
};

export const GlucoseChart = ({ data }: GlucoseChartProps) => {
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

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-full flex flex-col">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Evolución de Nivel de Glucosa</h2>
      <div className="flex-1 w-full" style={{ minHeight: "300px", height: "300px" }}>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 5, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="0" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fontSize: 12, fill: "#4b5563" }}
              tickMargin={8}
              interval={0}
              angle={-45}
              textAnchor="end"
            />
            <YAxis
              domain={[50, 220]}
              ticks={[50, 80, 110, 140, 170, 200, 220]}
              tick={{ fontSize: 12, fill: "#4b5563" }}
              tickMargin={8}
              label={{
                value: "mg/dL",
                angle: 0,
                position: "left",
                style: { textAnchor: "end", fontSize: 12, fill: "#4b5563", fontWeight: 500 },
                offset: -5,
              }}
            />
            <Line
              type="monotone"
              dataKey="averageGlucose"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={<CustomDot />}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
