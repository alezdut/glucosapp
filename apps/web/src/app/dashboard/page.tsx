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
import { DashboardPeriodSelector } from "@/components/dashboard/DashboardPeriodSelector";
import { AlertsSummaryCard } from "@/components/dashboard/AlertsSummaryCard";
import {
  useDashboardSummary,
  useGlucoseEvolution,
  useInsulinStats,
  useMealStats,
  useRecentAlerts,
  useAcknowledgeBatch,
} from "@/hooks/useDashboard";
import { useQueryClient } from "@tanstack/react-query";
import { Users, Calendar } from "lucide-react";
import { invalidateAlertQueries } from "@/lib/alert-utils";
import { useState, useEffect } from "react";

/**
 * Dashboard page showing doctor's overview
 */
export default function DashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Estado del período global con persistencia en localStorage
  const [dashboardDays, setDashboardDays] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("dashboardPeriodDays");
      return saved ? parseInt(saved, 10) : 7; // Default 7 días
    }
    return 7;
  });

  // Persistir cambios en localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("dashboardPeriodDays", dashboardDays.toString());
    }
  }, [dashboardDays]);

  const { data: summary, isLoading: summaryLoading } = useDashboardSummary(dashboardDays);
  const { data: glucoseEvolution, isLoading: glucoseLoading } = useGlucoseEvolution(dashboardDays);
  const { data: insulinStats, isLoading: insulinLoading } = useInsulinStats(dashboardDays);
  const { data: mealStats, isLoading: mealLoading } = useMealStats(dashboardDays);
  const { data: recentAlerts, isLoading: alertsLoading } = useRecentAlerts(3);

  const acknowledgeBatchMutation = useAcknowledgeBatch();

  const handleAcknowledgeAllCritical = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    try {
      await acknowledgeBatchMutation.mutateAsync({
        token,
        acknowledgeAll: true,
      });
    } catch (error) {
      console.error("Failed to acknowledge alerts:", error);
    }
  };

  const handleAlertUpdate = () => {
    // Use shared utility to invalidate all alert-related queries
    invalidateAlertQueries(queryClient);
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
          {/* Header with Period Selector */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Bienvenido de nuevo, {doctorName}
              </h1>
              <p className="text-gray-600">
                Aquí tienes un resumen rápido de la actividad de tus pacientes.
              </p>
            </div>
            {/* Period Selector moved to the right */}
            <DashboardPeriodSelector selectedDays={dashboardDays} onChange={setDashboardDays} />
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <SummaryCard
              title="Pacientes Activos"
              value={summaryLoading ? "..." : summary?.activePatients || 0}
              description={`Últimos ${dashboardDays} días`}
              icon={Users}
              iconColor="text-gray-500"
            />
            <AlertsSummaryCard
              criticalAlerts={summaryLoading ? 0 : summary?.criticalAlerts || 0}
              days={dashboardDays}
              onAcknowledgeAll={handleAcknowledgeAllCritical}
              loading={acknowledgeBatchMutation.isPending}
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
                <GlucoseChart data={glucoseEvolution?.data || []} days={dashboardDays} />
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
