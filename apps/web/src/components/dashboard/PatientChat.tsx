"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Loader2, MessageSquare } from "lucide-react";
import { useConversation, useSendMessage, useMarkAsRead } from "@/hooks/useMessages";
import { useAuth } from "@/contexts/auth-context";
import { formatTimeAgo } from "@glucosapp/utils";
import type { Message } from "@/lib/messages-api";
import { usePatientDetails } from "@/hooks/usePatients";

interface PatientChatProps {
  patientId?: string;
}

export const PatientChat = ({ patientId }: PatientChatProps) => {
  const { user } = useAuth();
  const [messageContent, setMessageContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Web app is doctor-only, always treat as doctor interface
  const isDoctor = true;
  const shouldCallHook = !!patientId;

  const {
    data: messages = [],
    isLoading,
    error,
  } = useConversation(shouldCallHook ? patientId : undefined);

  // Get patient details (web app - doctor chatting with patient)
  const { data: patientDetails } = usePatientDetails(patientId || "");

  const sendMessageMutation = useSendMessage();
  const markAsReadMutation = useMarkAsRead();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Mark unread messages as read when viewing
  useEffect(() => {
    if (!user || !messages.length) return;

    const unreadMessages = messages.filter((msg) => !msg.read && msg.receiverId === user.id);

    unreadMessages.forEach((msg) => {
      markAsReadMutation.mutate(msg.id);
    });
  }, [messages, user]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!messageContent.trim() || !user || !patientId) {
      return;
    }

    // Web app is doctor-only, so current user is always the doctor
    const receiverId = patientId;
    const content = messageContent.trim();

    try {
      await sendMessageMutation.mutateAsync({
        receiverId,
        content,
      });
      setMessageContent("");
      // Message will be updated automatically via WebSocket
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  // Get recipient name for header (always a patient in web app)
  const getRecipientName = (): string => {
    if (patientDetails) {
      const name =
        patientDetails.firstName && patientDetails.lastName
          ? `${patientDetails.firstName} ${patientDetails.lastName}`
          : patientDetails.email;
      return name;
    }
    return "Paciente";
  };

  const getMessageSenderName = (message: Message): string => {
    // In web app, current user is always the doctor
    if (message.senderId === user?.id) {
      return "Tú";
    }
    // For received messages, show sender name
    if (message.sender.firstName && message.sender.lastName) {
      return `${message.sender.firstName} ${message.sender.lastName}`;
    }
    return message.sender.email;
  };

  // Show message when no patient is selected
  if (!patientId) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-[600px] flex items-center justify-center">
        <div className="text-center">
          <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-600 font-medium mb-2">Selecciona una conversación</p>
          <p className="text-sm text-gray-500">
            Elige un paciente de la lista para ver los mensajes
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Mensajes</h2>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Error al cargar los mensajes. Por favor, intenta de nuevo.";
    const isForbidden = errorMessage.includes("Forbidden") || errorMessage.includes("403");
    const isNotFound = errorMessage.includes("Not found") || errorMessage.includes("404");

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Mensajes</h2>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          {isForbidden ? (
            <>
              <p className="text-red-600 font-medium mb-2">
                No tienes permiso para ver esta conversación
              </p>
              <p className="text-sm text-gray-500">
                Asegúrate de que el paciente esté asignado a tu cuenta.
              </p>
            </>
          ) : isNotFound ? (
            <>
              <p className="text-gray-600 font-medium mb-2">No se encontró la conversación</p>
              <p className="text-sm text-gray-500">
                Puede que aún no haya mensajes o que la relación médico-paciente no esté
                establecida.
              </p>
            </>
          ) : (
            <>
              <p className="text-red-600 font-medium mb-2">Error al cargar mensajes</p>
              <p className="text-sm text-gray-500">{errorMessage}</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-[600px]">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          Mensajes {patientDetails ? `- ${getRecipientName()}` : ""}
        </h2>
      </div>

      {/* Messages container */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-gray-500 mb-2">No hay mensajes aún</p>
            <p className="text-sm text-gray-400">Comienza una conversación enviando un mensaje</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.senderId === user?.id;
            const senderName = getMessageSenderName(message);

            return (
              <div
                key={message.id}
                className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg px-4 py-2 ${
                    isOwnMessage ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
                  }`}
                >
                  {!isOwnMessage && (
                    <p className="text-xs font-medium mb-1 opacity-75">{senderName}</p>
                  )}
                  <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs ${isOwnMessage ? "text-blue-100" : "text-gray-500"}`}>
                      {formatTimeAgo(message.createdAt)}
                    </span>
                    {isOwnMessage && message.read && (
                      <span className="text-xs text-blue-100">✓ Leído</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input form */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <textarea
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
            placeholder="Escribe un mensaje..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={2}
            disabled={sendMessageMutation.isPending}
          />
          <button
            type="submit"
            disabled={!messageContent.trim() || sendMessageMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Enviar
          </button>
        </div>
      </form>
    </div>
  );
};
