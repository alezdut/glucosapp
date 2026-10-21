"use client";

import { AlertTriangle } from "lucide-react";

interface AlertsSummaryCardProps {
  criticalAlerts: number;
  days: number;
  onAcknowledgeAll: () => void;
  loading?: boolean;
}

export const AlertsSummaryCard = ({
  criticalAlerts,
  days,
  onAcknowledgeAll,
  loading = false,
}: AlertsSummaryCardProps) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm text-gray-600 mb-1">Notificaciones Críticas</p>
          <p className="text-3xl font-bold text-gray-900 mb-2">{criticalAlerts}</p>
          <p className="text-sm text-gray-500">Últimos {days} días - Requiere atención</p>
        </div>
        <AlertTriangle className="w-12 h-12 text-red-500" />
      </div>
      {criticalAlerts > 0 && (
        <button
          onClick={onAcknowledgeAll}
          disabled={loading}
          className="w-full mt-2 px-4 py-2 text-sm font-medium text-blue-600
                     bg-blue-50 rounded-md hover:bg-blue-100 transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Descartando..." : "Descartar todas"}
        </button>
      )}
    </div>
  );
};
