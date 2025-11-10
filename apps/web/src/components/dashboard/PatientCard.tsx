"use client";

import { PatientListItem } from "@/lib/dashboard-api";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { formatTimeAgo, getDiabetesTypeLabel } from "@glucosapp/utils";
import { getStatusBadgeColor } from "@/utils/patient-utils";
import { PatientAvatar } from "./PatientAvatar";

interface PatientCardProps {
  patient: PatientListItem;
}

const getPatientName = (patient: PatientListItem) => {
  if (patient.firstName || patient.lastName) {
    return `${patient.firstName || ""} ${patient.lastName || ""}`.trim();
  }
  return patient.email;
};

export const PatientCard = ({ patient }: PatientCardProps) => {
  // Validate patient data
  if (!patient || !patient.id || typeof patient.id !== "string") {
    return null;
  }

  const statusBadgeColor = getStatusBadgeColor(patient.status);
  const patientName = getPatientName(patient);
  const diabetesTypeLabel = getDiabetesTypeLabel(patient.diabetesType, null);

  // Ensure diabetesTypeLabel is a string or null
  const displayDiabetesType = typeof diabetesTypeLabel === "string" ? diabetesTypeLabel : null;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        {/* Avatar with status indicator */}
        <PatientAvatar
          avatarUrl={patient.avatarUrl}
          patientName={patientName}
          activityStatus={patient.activityStatus}
          size="sm"
        />

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
              {patient.status}
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
