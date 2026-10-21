"use client";

import { Alert } from "@/lib/dashboard-api";
import { acknowledgeAlert } from "@/lib/dashboard-api";
import { useAuth } from "@/contexts/auth-context";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { formatTimeAgo, getAlertTypeLabel, PATIENT_UNKNOWN } from "@glucosapp/utils";

interface AlertCardProps {
  alert: Alert;
  onAcknowledge?: () => void; // Callback when alert is dismissed
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
  const router = useRouter();
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [isAcknowledged, setIsAcknowledged] = useState(alert.acknowledged);
  const [isFadingOut, setIsFadingOut] = useState(false);

  // Sync local state with alert prop when it changes (e.g., after query refetch)
  useEffect(() => {
    setIsAcknowledged(alert.acknowledged);
  }, [alert.acknowledged]);

  const handleAcknowledge = async () => {
    if (!user || isAcknowledging || isAcknowledged) return;

    setIsAcknowledging(true);
    try {
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("accessToken");
        if (token) {
          await acknowledgeAlert(token, alert.id);
          setIsAcknowledged(true);
          setIsFadingOut(true);
          // Call callback after fade animation
          setTimeout(() => {
            onAcknowledge?.();
          }, 300);
        }
      }
    } catch (error) {
      console.error("Failed to acknowledge alert:", error);
    } finally {
      setIsAcknowledging(false);
    }
  };

  const handleViewProfile = () => {
    const patientId = alert.userId || alert.patient?.id;
    if (patientId) {
      router.push(`/dashboard/patients/${patientId}`);
    }
  };

  const patientName = alert.patient
    ? `${alert.patient.firstName || ""} ${alert.patient.lastName || ""}`.trim() ||
      alert.patient.email
    : PATIENT_UNKNOWN;

  const severityColor = getSeverityColor(alert.severity);
  const severityIconColor = getSeverityIconColor(alert.severity);

  return (
    <div
      className={`border rounded-lg p-4 ${severityColor} transition-all duration-300 ${
        isFadingOut ? "opacity-0 scale-95" : isAcknowledged ? "opacity-60" : "opacity-100"
      }`}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className={`w-6 h-6 ${severityIconColor} flex-shrink-0`} />
        <div className="flex-1">
          <h3 className="font-semibold mb-1">
            {patientName}: {getAlertTypeLabel(alert.type)}
          </h3>
          <p className="text-sm mb-2">{alert.message}</p>
          <p className="text-xs opacity-75">{formatTimeAgo(alert.createdAt)}</p>
        </div>
      </div>
      {!isAcknowledged && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={handleViewProfile}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
          >
            Ver detalles
          </button>
          <button
            onClick={handleAcknowledge}
            disabled={isAcknowledging}
            className="px-4 py-2 bg-white text-gray-800 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {isAcknowledging ? "Descartando..." : "Descartar"}
          </button>
        </div>
      )}
    </div>
  );
};
