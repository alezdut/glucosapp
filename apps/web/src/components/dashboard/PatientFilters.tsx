"use client";

import { Search, UserPlus } from "lucide-react";
import { GetPatientsFilters } from "@/lib/dashboard-api";

interface PatientFiltersProps {
  filters: GetPatientsFilters;
  onFiltersChange: (filters: GetPatientsFilters) => void;
  onAddPatient: () => void;
}

export const PatientFilters = ({ filters, onFiltersChange, onAddPatient }: PatientFiltersProps) => {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({
      ...filters,
      search: e.target.value || undefined,
    });
  };

  const handleDiabetesTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({
      ...filters,
      diabetesType: e.target.value ? (e.target.value as "TYPE_1" | "TYPE_2") : undefined,
    });
  };

  const handleActiveOnlyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({
      ...filters,
      activeOnly: e.target.checked || undefined,
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex items-center gap-4">
        {/* Search input - 1/3 del espacio */}
        <div className="relative flex-[3]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={filters.search || ""}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Diabetes type dropdown - 2/9 del espacio */}
        <select
          value={filters.diabetesType || ""}
          onChange={handleDiabetesTypeChange}
          className="flex-[2] px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
        >
          <option value="">Todos los tipos</option>
          <option value="TYPE_1">Tipo 1</option>
          <option value="TYPE_2">Tipo 2</option>
        </select>

        {/* Active only toggle - 2/9 del espacio */}
        <label className="flex-[2] flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.activeOnly || false}
            onChange={handleActiveOnlyChange}
            className="sr-only"
          />
          <div
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              filters.activeOnly ? "bg-blue-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                filters.activeOnly ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </div>
          <span className="text-sm text-gray-700">Solo control activo</span>
        </label>

        {/* Add Patient button - 2/9 del espacio */}
        <button
          onClick={onAddPatient}
          className="flex-[2] px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Añadir Paciente
        </button>
      </div>
    </div>
  );
};
