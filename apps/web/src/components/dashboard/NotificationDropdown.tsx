"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { useUnacknowledgedAlerts } from "@/hooks/useDashboard";
import { AlertCard } from "./AlertCard";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateAlertQueries } from "@/lib/alert-utils";

export const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { data: alerts = [], isLoading } = useUnacknowledgedAlerts(10);
  const queryClient = useQueryClient();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleAlertAcknowledge = () => {
    // Use shared utility to invalidate all alert-related queries
    invalidateAlertQueries(queryClient);
  };

  const unacknowledgedCount = alerts.length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
        aria-label="Notificaciones"
      >
        <Bell className="w-5 h-5" />
        {unacknowledgedCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs font-semibold rounded-full flex items-center justify-center">
            {unacknowledgedCount > 9 ? "9+" : unacknowledgedCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[600px] flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Notificaciones {unacknowledgedCount > 0 && `(${unacknowledgedCount})`}
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-full transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-4">
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Cargando notificaciones...</div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No hay notificaciones nuevas</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <AlertCard key={alert.id} alert={alert} onAcknowledge={handleAlertAcknowledge} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
