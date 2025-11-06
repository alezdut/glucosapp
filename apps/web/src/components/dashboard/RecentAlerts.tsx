"use client";

import { Alert } from "@/lib/dashboard-api";
import { AlertCard } from "./AlertCard";

interface RecentAlertsProps {
  alerts: Alert[];
  onAlertUpdate?: () => void;
}

export const RecentAlerts = ({ alerts, onAlertUpdate }: RecentAlertsProps) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-full flex flex-col w-full">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Alertas Recientes</h2>
      {alerts.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500 text-sm">No hay alertas recientes</p>
        </div>
      ) : (
        <div className="space-y-4 flex-1 overflow-y-auto">
          {alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} onAcknowledge={onAlertUpdate} />
          ))}
        </div>
      )}
    </div>
  );
};
