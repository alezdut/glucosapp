"use client";

import { ProtectedRoute } from "@/components/protected-route";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { AppointmentsManager } from "@/components/dashboard/AppointmentsManager";

export default function AppointmentsPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <Header />

        <main className="ml-64 mt-16 p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Citas</h1>
            <p className="mt-2 text-gray-600">
              Programa, actualiza y cierra las citas de tus pacientes.
            </p>
          </div>

          <AppointmentsManager />
        </main>
      </div>
    </ProtectedRoute>
  );
}
