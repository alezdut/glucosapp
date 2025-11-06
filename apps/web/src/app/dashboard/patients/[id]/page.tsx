"use client";

import { useParams, useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/protected-route";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { usePatientDetails } from "@/hooks/usePatients";
import {
  ArrowLeft,
  Loader2,
  Calendar,
  Activity,
  Syringe,
  UtensilsCrossed,
  AlertTriangle,
} from "lucide-react";

function formatTimeAgoUtil(dateString: string) {
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
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "Riesgo":
      return "bg-red-100 text-red-800 border-red-200";
    case "Estable":
      return "bg-green-100 text-green-800 border-green-200";
    case "Activo":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "Inactivo":
      return "bg-gray-100 text-gray-800 border-gray-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getStatusDotColor = (status: string) => {
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

const getDiabetesTypeLabel = (type?: "TYPE_1" | "TYPE_2") => {
  if (!type) return "No especificado";
  return type === "TYPE_1" ? "Tipo 1" : "Tipo 2";
};

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
  const patientId = params.id as string;

  const { data: patient, isLoading, error } = usePatientDetails(patientId);

  const patientName = patient
    ? `${patient.firstName || ""} ${patient.lastName || ""}`.trim() || patient.email
    : "Paciente";

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
          {/* Back button */}
          <button
            onClick={() => router.push("/dashboard/patients")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Volver a la lista de pacientes</span>
          </button>

          {/* Patient Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-start gap-6">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                {patient.avatarUrl ? (
                  <img
                    src={patient.avatarUrl}
                    alt={patientName}
                    className="w-24 h-24 rounded-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-4xl font-semibold text-gray-600">
                      {patientName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                {/* Status indicator */}
                <div
                  className={`absolute bottom-0 right-0 w-6 h-6 ${getStatusDotColor(
                    patient.status,
                  )} rounded-full border-4 border-white`}
                />
              </div>

              {/* Patient Info */}
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">{patientName}</h1>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(
                      patient.status,
                    )}`}
                  >
                    {patient.status}
                  </span>
                </div>
                <p className="text-gray-600 mb-4">{patient.email}</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Tipo de Diabetes</p>
                    <p className="font-medium text-gray-900">
                      {getDiabetesTypeLabel(patient.diabetesType)}
                    </p>
                  </div>
                  {patient.birthDate && (
                    <div>
                      <p className="text-sm text-gray-500">Fecha de Nacimiento</p>
                      <p className="font-medium text-gray-900">{formatDate(patient.birthDate)}</p>
                    </div>
                  )}
                  {patient.weight && (
                    <div>
                      <p className="text-sm text-gray-500">Peso</p>
                      <p className="font-medium text-gray-900">{patient.weight} kg</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Last Glucose Reading */}
          {patient.lastGlucoseReading && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Última Lectura de Glucosa
              </h2>
              <div className="flex items-center gap-4">
                <div className="text-4xl font-bold text-blue-600">
                  {patient.lastGlucoseReading.value}
                </div>
                <div>
                  <p className="text-sm text-gray-500">mg/dL</p>
                  <p className="text-sm text-gray-600">
                    {formatTimeAgoUtil(patient.lastGlucoseReading.recordedAt)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Statistics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {/* Glucose Readings */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <Activity className="w-6 h-6 text-blue-600" />
                <h3 className="text-sm font-medium text-gray-500">Lecturas de Glucosa</h3>
              </div>
              <p className="text-3xl font-bold text-gray-900">{patient.totalGlucoseReadings}</p>
              <p className="text-sm text-gray-500 mt-1">Total registradas</p>
            </div>

            {/* Insulin Doses */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <Syringe className="w-6 h-6 text-purple-600" />
                <h3 className="text-sm font-medium text-gray-500">Dosis de Insulina</h3>
              </div>
              <p className="text-3xl font-bold text-gray-900">{patient.totalInsulinDoses}</p>
              <p className="text-sm text-gray-500 mt-1">Total registradas</p>
            </div>

            {/* Meals */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <UtensilsCrossed className="w-6 h-6 text-green-600" />
                <h3 className="text-sm font-medium text-gray-500">Comidas</h3>
              </div>
              <p className="text-3xl font-bold text-gray-900">{patient.totalMeals}</p>
              <p className="text-sm text-gray-500 mt-1">Total registradas</p>
            </div>

            {/* Alerts */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                <h3 className="text-sm font-medium text-gray-500">Alertas</h3>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-gray-900">{patient.totalAlerts}</p>
                {patient.unacknowledgedAlerts > 0 && (
                  <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
                    {patient.unacknowledgedAlerts} sin revisar
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">Total registradas</p>
            </div>
          </div>

          {/* Registration Date */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Fecha de Registro</p>
                <p className="font-medium text-gray-900">{formatDate(patient.registrationDate)}</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
