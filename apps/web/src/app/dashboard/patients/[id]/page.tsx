"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/protected-route";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { usePatientDetails } from "@/hooks/usePatients";
import {
  usePatientGlucoseEvolution,
  usePatientInsulinStats,
  usePatientMeals,
  usePatientProfile,
} from "@/hooks/usePatientData";
import type { PatientGlucoseEvolution, PatientInsulinStats } from "@/lib/dashboard-api";
import { Tabs } from "@/components/dashboard/Tabs";
import { PatientGlucoseChart } from "@/components/dashboard/PatientGlucoseChart";
import { PatientInsulinChart } from "@/components/dashboard/PatientInsulinChart";
import { PatientMealsList } from "@/components/dashboard/PatientMealsList";
import { PatientLogs } from "@/components/dashboard/PatientLogs";
import { PatientParameters } from "@/components/dashboard/PatientParameters";
import { PatientNotesMessages } from "@/components/dashboard/PatientNotesMessages";
import { PatientAvatar } from "@/components/dashboard/PatientAvatar";
import { ArrowLeft, Loader2, User, MessageSquare } from "lucide-react";
import { formatTimeAgo, calculateAge } from "@/utils/date-utils";
import { getStatusColor, getDiabetesTypeLabel } from "@/utils/patient-utils";

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  return {
    date: date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    time: date.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
};

/**
 * Patient details page
 */
export default function PatientDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;
  const [activeTab, setActiveTab] = useState("glucose-insulin");

  const { data: patient, isLoading, error } = usePatientDetails(patientId);
  const {
    data: glucoseEvolution,
    isLoading: isLoadingGlucose,
    error: errorGlucose,
  } = usePatientGlucoseEvolution(patientId, 12);
  const {
    data: insulinStats,
    isLoading: isLoadingInsulin,
    error: errorInsulin,
  } = usePatientInsulinStats(patientId, 12);
  const { data: profile } = usePatientProfile(patientId);

  // Extract chart data
  // glucoseEvolution is the result of useQuery, which has {data?: PatientGlucoseEvolution, ...}
  // glucoseEvolution.data is PatientGlucoseEvolution which has {data: PatientGlucoseEvolutionPoint[]}
  const glucoseData = Array.isArray(glucoseEvolution?.data)
    ? glucoseEvolution.data
    : (glucoseEvolution?.data as PatientGlucoseEvolution | undefined)?.data || [];
  const insulinData = Array.isArray(insulinStats?.data)
    ? insulinStats.data
    : (insulinStats?.data as PatientInsulinStats | undefined)?.data || [];

  const patientName = patient
    ? `${patient.firstName || ""} ${patient.lastName || ""}`.trim() || patient.email
    : "Paciente";

  const age = calculateAge(patient?.birthDate);

  const tabs = [
    { id: "glucose-insulin", label: "Glucosa e Insulina" },
    { id: "meals", label: "Registros" },
    { id: "notes", label: "Notas y Mensajes" },
    { id: "parameters", label: "Parámetros" },
  ];

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <Sidebar />
          <Header />
          <main className="ml-64 mt-16 p-6">
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <span className="ml-3 text-gray-600">Cargando información del paciente...</span>
            </div>
          </main>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !patient) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <Sidebar />
          <Header />
          <main className="ml-64 mt-16 p-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">
                Error al cargar la información del paciente. Por favor, intenta de nuevo.
              </p>
              <button
                onClick={() => router.push("/dashboard/patients")}
                className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
              >
                Volver a la lista de pacientes
              </button>
            </div>
          </main>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <Header />

        <main className="ml-64 mt-16 p-6">
          {/* Page Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Detalle de Paciente</h1>

          {/* Patient Header Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-start gap-6">
              {/* Avatar */}
              <PatientAvatar
                avatarUrl={patient.avatarUrl}
                patientName={patientName}
                activityStatus={patient.activityStatus}
                size="lg"
              />

              {/* Patient Info */}
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-2">
                  <h2 className="text-3xl font-bold text-gray-900">{patientName}</h2>
                  <span
                    className={`${getStatusColor(patient.status)} px-3 py-1 rounded text-sm font-medium`}
                  >
                    {patient.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-1">ID Paciente: {patient.id}</p>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  {age !== null && (
                    <div>
                      <p className="text-sm text-gray-500">Edad</p>
                      <p className="font-medium text-gray-900">{age} años</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-500">Tipo de Diabetes</p>
                    <p className="font-medium text-gray-900">
                      {getDiabetesTypeLabel(patient.diabetesType)}
                    </p>
                  </div>
                  {patient.lastGlucoseReading ? (
                    <div>
                      <p className="text-sm text-gray-500">Última Lectura de Glucosa</p>
                      <p className="font-medium text-gray-900">
                        {patient.lastGlucoseReading.value} mg/dL
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatTimeAgo(patient.lastGlucoseReading.recordedAt)}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-500">Última Lectura de Glucosa</p>
                      <p className="font-medium text-gray-500">Sin registros</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-500">Fecha de Registro</p>
                    <p className="font-medium text-gray-900">
                      {formatDate(patient.registrationDate)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                <button className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Editar Perfil
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Contactar
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

          {/* Tab Content */}
          {activeTab === "glucose-insulin" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {isLoadingGlucose ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex items-center justify-center min-h-[400px]">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    <span className="text-sm text-gray-600">Cargando datos de glucosa...</span>
                  </div>
                </div>
              ) : errorGlucose ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex items-center justify-center min-h-[400px]">
                  <div className="text-center">
                    <p className="text-sm text-red-600 mb-2">Error al cargar datos de glucosa</p>
                    <p className="text-xs text-gray-500">
                      {errorGlucose instanceof Error ? errorGlucose.message : "Error desconocido"}
                    </p>
                  </div>
                </div>
              ) : (
                <PatientGlucoseChart data={glucoseData} />
              )}
              {isLoadingInsulin ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex items-center justify-center min-h-[400px]">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    <span className="text-sm text-gray-600">Cargando datos de insulina...</span>
                  </div>
                </div>
              ) : errorInsulin ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex items-center justify-center min-h-[400px]">
                  <div className="text-center">
                    <p className="text-sm text-red-600 mb-2">Error al cargar datos de insulina</p>
                    <p className="text-xs text-gray-500">
                      {errorInsulin instanceof Error ? errorInsulin.message : "Error desconocido"}
                    </p>
                  </div>
                </div>
              ) : (
                <PatientInsulinChart data={insulinData} />
              )}
            </div>
          )}

          {activeTab === "meals" && <PatientLogs patientId={patientId} />}

          {activeTab === "notes" && <PatientNotesMessages />}

          {activeTab === "parameters" && profile && (
            <PatientParameters profile={profile} patientId={patientId} />
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
