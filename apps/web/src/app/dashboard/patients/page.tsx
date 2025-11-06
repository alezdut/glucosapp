"use client";

import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { PatientCard } from "@/components/dashboard/PatientCard";
import { PatientFilters } from "@/components/dashboard/PatientFilters";
import { PatientEmptyState } from "@/components/dashboard/PatientEmptyState";
import { AddPatientModal } from "@/components/dashboard/AddPatientModal";
import { usePatients } from "@/hooks/usePatients";
import { useSearch } from "@/contexts/search-context";
import { GetPatientsFilters } from "@/lib/dashboard-api";
import { Loader2 } from "lucide-react";

/**
 * Patients page showing list of assigned patients
 */
export default function PatientsPage() {
  const [filters, setFilters] = useState<GetPatientsFilters>({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { searchQuery } = useSearch();

  // Sync search query from header with filters
  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      search: searchQuery || undefined,
    }));
  }, [searchQuery]);

  const { data: patients, isLoading, error } = usePatients(filters);

  const handleFiltersChange = (newFilters: GetPatientsFilters) => {
    setFilters(newFilters);
  };

  const handleOpenAddModal = () => {
    setIsAddModalOpen(true);
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <Header />

        <main className="ml-64 mt-16 p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Lista de Pacientes</h1>
          </div>

          {/* Filters */}
          <PatientFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onAddPatient={handleOpenAddModal}
          />

          {/* Content */}
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <span className="ml-3 text-gray-600">Cargando pacientes...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">
                Error al cargar pacientes. Por favor, intenta de nuevo.
                {error instanceof Error && error.message ? ` (${error.message})` : ""}
              </p>
            </div>
          ) : !patients || !Array.isArray(patients) || patients.length === 0 ? (
            <PatientEmptyState onAddPatient={handleOpenAddModal} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {patients
                .filter((patient) => patient && patient.id && typeof patient.id === "string")
                .map((patient) => (
                  <PatientCard key={patient.id} patient={patient} />
                ))}
            </div>
          )}

          {/* Add Patient Modal */}
          <AddPatientModal isOpen={isAddModalOpen} onClose={handleCloseAddModal} />
        </main>
      </div>
    </ProtectedRoute>
  );
}
