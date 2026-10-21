"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ProtectedRoute } from "@/components/protected-route";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { usePatientDetails, useRemovePatient } from "@/hooks/usePatients";
import {
  usePatientGlucoseEvolution,
  usePatientInsulinStats,
  usePatientProfile,
} from "@/hooks/usePatientData";
import type { PatientGlucoseEvolution, PatientInsulinStats } from "@/lib/dashboard-api";
import { Tabs } from "@/components/dashboard/Tabs";
import { PatientGlucoseChart } from "@/components/dashboard/PatientGlucoseChart";
import { PatientInsulinChart } from "@/components/dashboard/PatientInsulinChart";
import { PatientLogs } from "@/components/dashboard/PatientLogs";
import { PatientParameters } from "@/components/dashboard/PatientParameters";
import { PatientChat } from "@/components/dashboard/PatientChat";
import { PatientAvatar } from "@/components/dashboard/PatientAvatar";
import { Loader2, MessageSquare, Trash2, AlertTriangle } from "lucide-react";
import { calculateAge, formatTimeAgo, getDiabetesTypeLabel } from "@glucosapp/utils";
import { getStatusColor } from "@/utils/patient-utils";
import { DiabetesType } from "@glucosapp/types";

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

/**
 * Patient details page
 */
export default function PatientDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientId = params.id as string;

  // Get initial tab from URL query parameter, default to "glucose-insulin"
  const initialTab = searchParams.get("tab") || "glucose-insulin";
  const [activeTab, setActiveTab] = useState(initialTab);

  // Update activeTab when URL query parameter changes
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams, activeTab]);

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
  const removePatientMutation = useRemovePatient();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

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
                      {getDiabetesTypeLabel(patient.diabetesType as DiabetesType)}
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
                <button
                  onClick={() => setShowConfirmDialog(true)}
                  disabled={removePatientMutation.isPending}
                  className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                  {removePatientMutation.isPending ? "Desvinculando..." : "Desvincular"}
                </button>
                <button
                  onClick={() => router.push(`/dashboard/communication?patientId=${patientId}`)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
                >
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

          {activeTab === "notes" && <PatientChat patientId={patientId} />}

          {activeTab === "parameters" && profile && (
            <PatientParameters profile={profile} patientId={patientId} />
          )}

          {/* Confirm Remove Dialog */}
          {showConfirmDialog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Desvincular Paciente</h3>
                    <p className="text-sm text-gray-500">Esta acción no se puede deshacer</p>
                  </div>
                </div>
                <p className="text-gray-700 mb-6">
                  ¿Estás seguro de que deseas desvincular a <strong>{patientName}</strong>? Los
                  datos del paciente permanecerán intactos, pero ya no podrás acceder a su
                  información. El paciente podrá ser asignado a otro médico.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowConfirmDialog(false)}
                    disabled={removePatientMutation.isPending}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await removePatientMutation.mutateAsync(patientId);
                        setShowConfirmDialog(false);
                        router.push("/dashboard/patients");
                      } catch (error) {
                        console.error("Failed to remove patient:", error);
                        // Error will be handled by the mutation
                      }
                    }}
                    disabled={removePatientMutation.isPending}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {removePatientMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Desvinculando...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Desvincular
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
