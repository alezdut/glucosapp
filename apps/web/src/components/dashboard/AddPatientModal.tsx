"use client";

import { useState, useEffect } from "react";
import { X, Search, UserPlus, Loader2 } from "lucide-react";
import { useSearchGlobalPatients, useAssignPatient } from "@/hooks/usePatients";
import { PatientListItem } from "@/lib/dashboard-api";

interface AddPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

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

export const AddPatientModal = ({ isOpen, onClose }: AddPatientModalProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: searchResults, isLoading: isSearching } = useSearchGlobalPatients(
    searchQuery,
    isOpen,
  );
  const assignPatientMutation = useAssignPatient();

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
    }
  }, [isOpen]);

  const handleAssign = async (patientId: string) => {
    try {
      await assignPatientMutation.mutateAsync(patientId);
      // Clear search after successful assignment
      setSearchQuery("");
      onClose();
    } catch (error) {
      console.error("Failed to assign patient:", error);
      // Error handling could be improved with toast notifications
      // Re-throw to let React Query handle it
      throw error;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Añadir Paciente</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search input */}
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, apellido o email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Busca entre todos los pacientes registrados en la aplicación
          </p>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-6">
          {isSearching ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              <span className="ml-2 text-gray-600">Buscando...</span>
            </div>
          ) : searchQuery.trim().length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Ingresa un término de búsqueda para comenzar</p>
            </div>
          ) : !searchResults || !Array.isArray(searchResults) || searchResults.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No se encontraron pacientes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {searchResults
                .filter((patient) => patient && patient.id && typeof patient.id === "string")
                .map((patient) => {
                  const patientName = getPatientName(patient);
                  const diabetesTypeLabel = getDiabetesTypeLabel(patient.diabetesType);
                  const displayDiabetesType =
                    typeof diabetesTypeLabel === "string" ? diabetesTypeLabel : null;
                  const isAssigning = assignPatientMutation.isPending;

                  return (
                    <div
                      key={patient.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">
                            {String(patientName || "")}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {String(patient.email || "")}
                          </p>
                          {displayDiabetesType && (
                            <p className="text-sm text-gray-500 mt-1">{displayDiabetesType}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleAssign(patient.id)}
                          disabled={isAssigning}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isAssigning ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Añadiendo...
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-4 h-4" />
                              Añadir
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
