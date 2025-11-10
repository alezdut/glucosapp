"use client";

import { useMemo, useState } from "react";
import { usePatientLogEntries } from "@/hooks/usePatientData";
import { PatientLogCard } from "@/components/dashboard/PatientLogCard";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PatientLogsProps {
  patientId: string;
}

const getDefaultRange = () => {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);
  return { start: sevenDaysAgo, end: now };
};

const toIso = (d: Date) => d.toISOString();
const ITEMS_PER_PAGE = 5;

export const PatientLogs = ({ patientId }: PatientLogsProps) => {
  const defaultRange = useMemo(getDefaultRange, []);
  const [range, setRange] = useState<{ start: Date; end: Date }>(defaultRange);
  const [currentPage, setCurrentPage] = useState(1);

  const {
    data: entries,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = usePatientLogEntries(patientId, toIso(range.start), toIso(range.end));

  const handlePresetChange = (days: number) => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - days);
    start.setHours(0, 0, 0, 0);
    setRange({ start, end: now });
    setCurrentPage(1); // Reset to first page when changing filter
  };

  // Pagination logic
  const totalPages = entries ? Math.ceil(entries.length / ITEMS_PER_PAGE) : 0;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentEntries = entries ? entries.slice(startIndex, endIndex) : [];

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Calculate which preset is currently active
  const getCurrentPreset = () => {
    const days = Math.round((range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24));
    return [7, 14, 30, 90].find((d) => d === days) || null;
  };

  const currentPreset = getCurrentPreset();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Registros</h2>
          <p className="text-sm text-gray-500">
            Del{" "}
            <span className="font-medium">
              {range.start.toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
            </span>{" "}
            al{" "}
            <span className="font-medium">
              {range.end.toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePresetChange(7)}
            className={`px-3 py-1.5 text-sm rounded border transition-colors ${
              currentPreset === 7
                ? "bg-blue-600 text-white border-blue-600"
                : "border-gray-200 hover:bg-gray-50 text-gray-700"
            }`}
            aria-label="Filtrar últimos 7 días"
          >
            7 días
          </button>
          <button
            onClick={() => handlePresetChange(14)}
            className={`px-3 py-1.5 text-sm rounded border transition-colors ${
              currentPreset === 14
                ? "bg-blue-600 text-white border-blue-600"
                : "border-gray-200 hover:bg-gray-50 text-gray-700"
            }`}
            aria-label="Filtrar últimos 14 días"
          >
            14 días
          </button>
          <button
            onClick={() => handlePresetChange(30)}
            className={`px-3 py-1.5 text-sm rounded border transition-colors ${
              currentPreset === 30
                ? "bg-blue-600 text-white border-blue-600"
                : "border-gray-200 hover:bg-gray-50 text-gray-700"
            }`}
            aria-label="Filtrar últimos 30 días"
          >
            30 días
          </button>
          <button
            onClick={() => handlePresetChange(90)}
            className={`px-3 py-1.5 text-sm rounded border transition-colors ${
              currentPreset === 90
                ? "bg-blue-600 text-white border-blue-600"
                : "border-gray-200 hover:bg-gray-50 text-gray-700"
            }`}
            aria-label="Filtrar últimos 90 días"
          >
            90 días
          </button>
        </div>
      </div>

      {isLoading || isRefetching ? (
        <div className="flex items-center justify-center py-16 text-gray-600">
          Cargando registros…
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <p className="text-sm text-red-600 mb-2">Error al cargar registros</p>
          <button
            onClick={() => refetch()}
            className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      ) : entries && entries.length > 0 ? (
        <div className="space-y-4">
          {currentEntries.map((e) => (
            <PatientLogCard key={e.id} entry={e} />
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 mt-6 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                Mostrando {startIndex + 1}-{Math.min(endIndex, entries.length)} de {entries.length}{" "}
                registros
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 px-3 py-1 text-sm border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </button>

                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                  if (pageNum > totalPages) return null;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => goToPage(pageNum)}
                      className={`px-3 py-1 text-sm border rounded transition-colors ${
                        pageNum === currentPage
                          ? "bg-blue-600 text-white border-blue-600"
                          : "border-gray-200 hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 px-3 py-1 text-sm border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Página siguiente"
                >
                  Siguiente
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center py-16 text-gray-500">
          No hay registros en el período seleccionado
        </div>
      )}
    </div>
  );
};
