"use client";

import { MessageSquare } from "lucide-react";

export const PatientNotesMessages = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Notas y Mensajes</h2>
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <MessageSquare className="w-16 h-16 text-gray-300 mb-4" />
        <p className="text-gray-600 font-medium mb-2">Funcionalidad próximamente</p>
        <p className="text-sm text-gray-500 max-w-md">
          La sección de notas y mensajes estará disponible pronto. Podrás comunicarte con tus
          pacientes y agregar notas importantes sobre su tratamiento.
        </p>
      </div>
    </div>
  );
};
