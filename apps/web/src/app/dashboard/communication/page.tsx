"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ProtectedRoute } from "@/components/protected-route";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { PatientChat } from "@/components/dashboard/PatientChat";
import { MessageNotificationCard } from "@/components/dashboard/MessageNotificationCard";
import { useConversations, useNewMessageNotifications } from "@/hooks/useMessages";
import { useAuth } from "@/contexts/auth-context";
import { Loader2, MessageSquare } from "lucide-react";
import Image from "next/image";

// Force dynamic rendering to prevent prerender errors (requires auth and WebSocket)
export const dynamic = "force-dynamic";

/**
 * Communication page content component (uses useSearchParams, must be wrapped in Suspense)
 */
function CommunicationPageContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const patientIdFromUrl = searchParams.get("patientId");
  const [selectedPatientId, setSelectedPatientId] = useState<string | undefined>(
    patientIdFromUrl || undefined,
  );
  const { data: conversations = [], isLoading, error: conversationsError } = useConversations();
  const { notifications, clearNotification } = useNewMessageNotifications(selectedPatientId);

  // Update selected patient when URL parameter changes
  useEffect(() => {
    const patientId = searchParams.get("patientId");
    if (patientId) {
      setSelectedPatientId(patientId);
    }
    // Don't auto-select first patient - let user choose
  }, [searchParams]);

  // Web app is doctor-only, always show doctor interface
  const isDoctor = !!user;

  // Show loading only for doctors while loading conversations
  if (isDoctor && isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <Sidebar />
          <Header />
          <main className="ml-64 mt-16 p-6">
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <span className="ml-3 text-gray-600">Cargando conversaciones...</span>
            </div>
          </main>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div
        className="min-h-screen h-screen bg-gray-50"
        onClick={() => {
          // Close conversation when clicking on gray background (outside main content)
          if (selectedPatientId) {
            setSelectedPatientId(undefined);
          }
        }}
      >
        <Sidebar />
        <Header />

        <main className="ml-64 mt-16 p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Comunicación</h1>

          {/* Notifications for new messages from patients not in active conversation */}
          {notifications.length > 0 && (
            <div className="mb-6 space-y-3" onClick={(e) => e.stopPropagation()}>
              {notifications.map((notification) => (
                <MessageNotificationCard
                  key={notification.patientId}
                  message={notification.latestMessage}
                  patientId={notification.patientId}
                  patientName={notification.patientName}
                  messageCount={notification.messageCount}
                  onRead={() => clearNotification(notification.patientId)}
                  onDismiss={() => clearNotification(notification.patientId)}
                />
              ))}
            </div>
          )}

          {isDoctor ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Conversations List */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div
                    className="p-4 border-b border-gray-200"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h2 className="text-lg font-semibold text-gray-900">Conversaciones</h2>
                  </div>
                  <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
                    {conversationsError ? (
                      <div className="p-8 text-center">
                        <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-sm text-red-600 mb-2">Error al cargar conversaciones</p>
                        <p className="text-xs text-gray-500">
                          {conversationsError instanceof Error
                            ? conversationsError.message
                            : "Error desconocido"}
                        </p>
                      </div>
                    ) : conversations.length === 0 ? (
                      <div className="p-8 text-center">
                        <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-sm text-gray-500 mb-2">No hay pacientes asignados</p>
                        <p className="text-xs text-gray-400">
                          Asigna pacientes para comenzar a comunicarte con ellos
                        </p>
                      </div>
                    ) : (
                      conversations.map((conversation) => {
                        const participantName =
                          conversation.participant.firstName && conversation.participant.lastName
                            ? `${conversation.participant.firstName} ${conversation.participant.lastName}`
                            : conversation.participant.email;

                        const hasMessages = conversation.lastMessageAt !== undefined;
                        const initials = participantName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2);

                        return (
                          <button
                            key={conversation.participant.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPatientId(conversation.participant.id);
                            }}
                            className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                              selectedPatientId === conversation.participant.id
                                ? "bg-blue-50 border-l-4 border-blue-600"
                                : ""
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {/* Patient Avatar */}
                              <div className="flex-shrink-0">
                                {conversation.participant.avatarUrl ? (
                                  <Image
                                    src={conversation.participant.avatarUrl}
                                    alt={participantName}
                                    width={40}
                                    height={40}
                                    className="w-10 h-10 rounded-full object-cover"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                    <span className="text-sm font-semibold text-gray-600">
                                      {initials}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Patient Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <p className="font-medium text-gray-900 truncate">
                                    {participantName}
                                  </p>
                                  {conversation.unreadCount > 0 && (
                                    <span className="bg-red-500 text-white text-xs font-semibold rounded-full px-2 py-1 min-w-[20px] text-center ml-2 flex-shrink-0">
                                      {conversation.unreadCount > 9
                                        ? "9+"
                                        : conversation.unreadCount}
                                    </span>
                                  )}
                                </div>
                                {hasMessages ? (
                                  <p className="text-xs text-gray-500">
                                    {new Date(conversation.lastMessageAt!).toLocaleDateString(
                                      "es-ES",
                                      {
                                        day: "numeric",
                                        month: "short",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      },
                                    )}
                                  </p>
                                ) : (
                                  <p className="text-xs text-gray-400 italic">Sin mensajes aún</p>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Chat Area */}
              <div className="lg:col-span-2" onClick={(e) => e.stopPropagation()}>
                {selectedPatientId ? (
                  <PatientChat patientId={selectedPatientId} />
                ) : conversations.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-[600px] flex items-center justify-center">
                    <div className="text-center">
                      <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-600 font-medium mb-2">No hay pacientes asignados</p>
                      <p className="text-sm text-gray-500">
                        Asigna pacientes desde la sección de pacientes para comenzar a comunicarte
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-[600px] flex items-center justify-center">
                    <div className="text-center">
                      <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-600 font-medium mb-2">Selecciona una conversación</p>
                      <p className="text-sm text-gray-500">
                        Elige un paciente de la lista para ver los mensajes
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Web app is doctor-only, patients would use mobile app
            <PatientChat />
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}

/**
 * Communication page - Shows conversations for doctors or chat with doctor for patients
 */
export default function CommunicationPage() {
  return (
    <Suspense
      fallback={
        <ProtectedRoute>
          <div className="min-h-screen bg-gray-50">
            <Sidebar />
            <Header />
            <main className="ml-64 mt-16 p-6">
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <span className="ml-3 text-gray-600">Cargando...</span>
              </div>
            </main>
          </div>
        </ProtectedRoute>
      }
    >
      <CommunicationPageContent />
    </Suspense>
  );
}
