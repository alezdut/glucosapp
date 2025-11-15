"use client";

import { Users } from "lucide-react";

interface PatientEmptyStateProps {
  onAddPatient: () => void;
}

export const PatientEmptyState = ({ onAddPatient }: PatientEmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
        <Users className="w-12 h-12 text-gray-400" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        No tienes pacientes asignados aún
      </h3>
      <p className="text-gray-600 text-center mb-8 max-w-md">
        Comienza añadiendo pacientes a tu lista para poder gestionar su información y seguimiento
        médico.
      </p>
      <button
        onClick={onAddPatient}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
      >
        Añadir Paciente
      </button>
    </div>
  );
};
