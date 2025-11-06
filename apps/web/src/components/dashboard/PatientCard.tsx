"use client";

import { PatientListItem } from "@/lib/dashboard-api";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

interface PatientCardProps {
  patient: PatientListItem;
}

const getStatusColor = (status: PatientListItem["status"]) => {
  switch (status) {
    case "Riesgo":
      return "bg-red-500";
    case "Estable":
      return "bg-green-500";
    case "Activo":
      return "bg-blue-500";
    case "Inactivo":
      return "bg-gray-400";
    default:
      return "bg-gray-400";
  }
};

const getStatusBadgeColor = (status: PatientListItem["status"]) => {
  switch (status) {
    case "Riesgo":
      return "bg-red-100 text-red-800";
    case "Estable":
      return "bg-green-100 text-green-800";
    case "Activo":
      return "bg-blue-100 text-blue-800";
    case "Inactivo":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Hace un momento";
  if (diffMins < 60) return `Hace ${diffMins} min`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `Hace ${diffDays} días`;
  const diffMonths = Math.floor(diffDays / 30);
  return `Hace ${diffMonths} mes${diffMonths > 1 ? "es" : ""}`;
};

const getPatientName = (patient: PatientListItem) => {
  if (patient.firstName || patient.lastName) {
    return `${patient.firstName || ""} ${patient.lastName || ""}`.trim();
  }
  return patient.email;
};

const getDiabetesTypeLabel = (type?: "TYPE_1" | "TYPE_2") => {
  if (!type) return null;
  return type === "TYPE_1" ? "Tipo 1" : "Tipo 2";
};

export const PatientCard = ({ patient }: PatientCardProps) => {
  // Validate patient data
  if (!patient || !patient.id || typeof patient.id !== "string") {
    return null;
  }

  const statusColor = getStatusColor(patient.status);
  const statusBadgeColor = getStatusBadgeColor(patient.status);
  const patientName = getPatientName(patient);
  const diabetesTypeLabel = getDiabetesTypeLabel(patient.diabetesType);

  // Ensure diabetesTypeLabel is a string or null
  const displayDiabetesType = typeof diabetesTypeLabel === "string" ? diabetesTypeLabel : null;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        {/* Avatar with status indicator */}
        <div className="relative flex-shrink-0">
          {patient.avatarUrl ? (
            <img
              src={patient.avatarUrl}
              alt={patientName}
              className="w-16 h-16 rounded-full object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-2xl font-semibold text-gray-600">
                {patientName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          {/* Status indicator dot */}
          <div
            className={`absolute bottom-0 right-0 w-4 h-4 ${statusColor} rounded-full border-2 border-white`}
          />
        </div>

        {/* Patient info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">
            {String(patientName || "")}
          </h3>

          {displayDiabetesType && (
            <p className="text-sm text-gray-600 mb-2">{displayDiabetesType}</p>
          )}

          {patient.lastGlucoseReading &&
          typeof patient.lastGlucoseReading.value === "number" &&
          patient.lastGlucoseReading.recordedAt ? (
            <div className="mb-3">
              <p className="text-sm text-gray-700">
                <span className="font-medium">{patient.lastGlucoseReading.value} mg/dL</span>
                <span className="text-gray-500 ml-2">
                  {formatTimeAgo(patient.lastGlucoseReading.recordedAt)}
                </span>
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-500 mb-3">Sin lecturas recientes</p>
          )}

          {/* Status badge */}
          <div className="flex items-center justify-between">
            <span className={`px-2 py-1 rounded text-xs font-medium ${statusBadgeColor}`}>
              {String(patient.status || "")}
            </span>

            {/* Ver Detalles link */}
            <Link
              href={`/dashboard/patients/${patient.id}`}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Ver Detalles
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
