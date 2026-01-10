/**
 * Utility functions for patient-related UI components
 */

/**
 * Get status badge color classes for patient status (Riesgo/Estable/Activo/Inactivo)
 */
export const getStatusColor = (status: string): string => {
  switch (status) {
    case "Riesgo":
      return "bg-red-100 text-red-800 border border-red-200";
    case "Estable":
      return "bg-green-100 text-green-800 border border-green-200";
    case "Activo":
      return "bg-blue-100 text-blue-800 border border-blue-200";
    case "Inactivo":
      return "bg-gray-100 text-gray-800 border border-gray-200";
    default:
      return "bg-gray-100 text-gray-800 border border-gray-200";
  }
};
