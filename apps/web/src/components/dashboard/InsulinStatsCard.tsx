"use client";

import { InsulinStats } from "@/lib/dashboard-api";

interface InsulinStatsCardProps {
  stats: InsulinStats;
}

export const InsulinStatsCard = ({ stats }: InsulinStatsCardProps) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-full flex flex-col">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Dosis Promedio de Insulina</h2>
      <div className="mb-4 flex-1 flex items-center">
        <p className="text-4xl font-bold text-gray-900">
          {stats.averageDose}{" "}
          <span className="text-xl font-normal text-gray-600">{stats.unit}</span>
        </p>
      </div>
      <p className="text-sm text-gray-600">{stats.description}</p>
    </div>
  );
};
