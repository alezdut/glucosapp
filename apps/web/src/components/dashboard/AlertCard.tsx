"use client";

import { Alert } from "@/lib/dashboard-api";
import { acknowledgeAlert } from "@/lib/dashboard-api";
import { useAuth } from "@/contexts/auth-context";
import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { formatTimeAgo } from "@glucosapp/utils";

interface AlertCardProps {
  alert: Alert;
  onAcknowledge?: () => void;
}

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "CRITICAL":
      return "bg-red-50 border-red-200 text-red-800";
    case "HIGH":
      return "bg-orange-50 border-orange-200 text-orange-800";
    case "MEDIUM":
      return "bg-yellow-50 border-yellow-200 text-yellow-800";
    default:
      return "bg-gray-50 border-gray-200 text-gray-800";
  }
};

const getSeverityIconColor = (severity: string) => {
  switch (severity) {
    case "CRITICAL":
      return "text-red-600";
    case "HIGH":
      return "text-orange-600";
    case "MEDIUM":
      return "text-yellow-600";
    default:
      return "text-gray-600";
  }
};

export const AlertCard = ({ alert, onAcknowledge }: AlertCardProps) => {
  const { user } = useAuth();
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [isAcknowledged, setIsAcknowledged] = useState(alert.acknowledged);

  const handleAcknowledge = async () => {
    if (!user || isAcknowledging || isAcknowledged) return;

    setIsAcknowledging(true);
    try {
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("accessToken");
        if (token) {
          await acknowledgeAlert(token, alert.id);
          setIsAcknowledged(true);
          onAcknowledge?.();
        }
      }
    } catch (error) {
      console.error("Failed to acknowledge alert:", error);
    } finally {
      setIsAcknowledging(false);
    }
  };

  const patientName = alert.patient
    ? `${alert.patient.firstName || ""} ${alert.patient.lastName || ""}`.trim() ||
      alert.patient.email
    : "Paciente desconocido";

  const severityColor = getSeverityColor(alert.severity);
  const severityIconColor = getSeverityIconColor(alert.severity);

  return (
    <div className={`border rounded-lg p-4 ${severityColor} ${isAcknowledged ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className={`w-6 h-6 ${severityIconColor} flex-shrink-0`} />
        <div className="flex-1">
          <h3 className="font-semibold mb-1">
            {patientName}:{" "}
            {alert.type === "SEVERE_HYPOGLYCEMIA"
              ? "Hipoglucemia Severa"
              : "Hiperglucemia Persistente"}
          </h3>
          <p className="text-sm mb-2">{alert.message}</p>
          <p className="text-xs opacity-75">{formatTimeAgo(alert.createdAt)}</p>
        </div>
      </div>
      {!isAcknowledged && (
        <div className="mt-3">
          <button
            onClick={handleAcknowledge}
            disabled={isAcknowledging}
            className="px-4 py-2 bg-white text-gray-800 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {isAcknowledging ? "Marcando..." : "Ver Detalles del Paciente"}
          </button>
        </div>
      )}
    </div>
  );
};
