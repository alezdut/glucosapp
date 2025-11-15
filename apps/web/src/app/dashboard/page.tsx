"use client";

import { useAuth } from "@/contexts/auth-context";
import { ProtectedRoute } from "@/components/protected-route";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { GlucoseChart } from "@/components/dashboard/GlucoseChart";
import { InsulinStatsCard } from "@/components/dashboard/InsulinStatsCard";
import { MealStatsCard } from "@/components/dashboard/MealStatsCard";
import { RecentAlerts } from "@/components/dashboard/RecentAlerts";
import {
  useDashboardSummary,
  useGlucoseEvolution,
  useInsulinStats,
  useMealStats,
  useRecentAlerts,
} from "@/hooks/useDashboard";
import { useQueryClient } from "@tanstack/react-query";
import { Users, AlertTriangle, Calendar } from "lucide-react";

/**
 * Dashboard page showing doctor's overview
 */
export default function DashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: summary, isLoading: summaryLoading } = useDashboardSummary();
  const { data: glucoseEvolution, isLoading: glucoseLoading } = useGlucoseEvolution();
  const { data: insulinStats, isLoading: insulinLoading } = useInsulinStats(30);
  const { data: mealStats, isLoading: mealLoading } = useMealStats(30);
  const { data: recentAlerts, isLoading: alertsLoading } = useRecentAlerts(10);

  const handleAlertUpdate = () => {
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const doctorName = user
    ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Doctor"
    : "Doctor";

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <Header />

        <main className="ml-64 mt-16 p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Bienvenido de nuevo, {doctorName}
            </h1>
            <p className="text-gray-600">
              Aquí tienes un resumen rápido de la actividad de tus pacientes.
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <SummaryCard
              title="Pacientes Activos"
              value={summaryLoading ? "..." : summary?.activePatients || 0}
              description="Actualmente bajo control"
              icon={Users}
              iconColor="text-gray-500"
            />
            <SummaryCard
              title="Alertas Críticas"
              value={summaryLoading ? "..." : summary?.criticalAlerts || 0}
              description="Requiere atención inmediata"
              icon={AlertTriangle}
              iconColor="text-gray-500"
            />
            <SummaryCard
              title="Próximas Citas"
              value={summaryLoading ? "..." : summary?.upcomingAppointments || 0}
              description="En los próximos 7 días"
              icon={Calendar}
              iconColor="text-gray-500"
            />
          </div>

          {/* Chart and Stats Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 items-stretch">
            <div className="lg:col-span-2">
              {glucoseLoading ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-full">
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    Cargando...
                  </div>
                </div>
              ) : (
                <GlucoseChart data={glucoseEvolution?.data || []} />
              )}
            </div>
            <div className="flex">
              {insulinLoading ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-full w-full flex items-center justify-center">
                  <div className="text-gray-500">Cargando...</div>
                </div>
              ) : (
                insulinStats && <InsulinStatsCard stats={insulinStats} />
              )}
            </div>
          </div>

          {/* Meals and Alerts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            <div className="flex">
              {mealLoading ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-full w-full flex items-center justify-center">
                  <div className="text-gray-500">Cargando...</div>
                </div>
              ) : (
                mealStats && <MealStatsCard stats={mealStats} />
              )}
            </div>
            <div className="flex">
              {alertsLoading ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-full w-full flex items-center justify-center">
                  <div className="text-gray-500">Cargando alertas...</div>
                </div>
              ) : (
                <RecentAlerts alerts={recentAlerts || []} onAlertUpdate={handleAlertUpdate} />
              )}
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
