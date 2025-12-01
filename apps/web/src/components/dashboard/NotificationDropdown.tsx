"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Bell, X } from "lucide-react";
import { useUnacknowledgedAlerts } from "@/hooks/useDashboard";
import { useNewMessageNotifications, useConversations } from "@/hooks/useMessages";
import { useAuth } from "@/contexts/auth-context";
import { AlertCard } from "./AlertCard";
import { MessageNotificationCard } from "./MessageNotificationCard";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateAlertQueries } from "@/lib/alert-utils";
import type { Message } from "@/lib/messages-api";

export const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get active patient ID from URL if we're on the communication page
  const isCommunicationPage = pathname === "/dashboard/communication";
  const activePatientId = isCommunicationPage
    ? searchParams.get("patientId") || undefined
    : undefined;

  const { user } = useAuth();
  const { data: alerts = [], isLoading: isLoadingAlerts } = useUnacknowledgedAlerts(10);
  const { notifications: newMessageNotifications, clearNotification: clearMessageNotification } =
    useNewMessageNotifications(activePatientId);
  const { data: conversations = [] } = useConversations();
  const queryClient = useQueryClient();

  // Get unread messages from conversations (existing messages), grouped by patient
  const unreadMessagesFromConversations = useMemo(() => {
    if (!user) return [];

    // Group unread messages by patient
    const patientMessagesMap = new Map<
      string,
      {
        patientId: string;
        patientName: string;
        messages: Message[];
      }
    >();

    // For doctors, get unread messages from all conversations
    for (const conversation of conversations) {
      // Check if conversation has unread messages
      if (conversation.unreadCount > 0) {
        // Get unread messages from this conversation
        const conversationMessages = conversation.messages || [];
        const unread = conversationMessages.filter(
          (msg) => !msg.read && msg.receiverId === user.id,
        );

        // Also exclude if this is the active patient (when on communication page)
        const isActivePatient = activePatientId && conversation.participant.id === activePatientId;

        if (!isActivePatient && unread.length > 0) {
          const patientId = conversation.participant.id;
          const patientName =
            conversation.participant.firstName && conversation.participant.lastName
              ? `${conversation.participant.firstName} ${conversation.participant.lastName}`
              : conversation.participant.email;

          // Check if patient already has notifications from newMessageNotifications
          const hasNewNotification = newMessageNotifications.some((n) => n.patientId === patientId);

          // Only include if not already in newMessageNotifications
          if (!hasNewNotification) {
            const existing = patientMessagesMap.get(patientId);
            if (existing) {
              existing.messages.push(...unread);
            } else {
              patientMessagesMap.set(patientId, {
                patientId,
                patientName,
                messages: [...unread],
              });
            }
          }
        }
      }
    }

    // Convert map to array format matching newMessageNotifications structure
    return Array.from(patientMessagesMap.values())
      .map(({ patientId, patientName, messages }) => {
        // Sort messages by date (newest first) and get the latest
        const sortedMessages = messages.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        return {
          patientId,
          patientName,
          latestMessage: sortedMessages[0],
          messageCount: messages.length,
        };
      })
      .sort(
        (a, b) =>
          new Date(b.latestMessage.createdAt).getTime() -
          new Date(a.latestMessage.createdAt).getTime(),
      )
      .slice(0, 10);
  }, [user, conversations, newMessageNotifications, activePatientId]);

  // Combine new notifications with existing unread messages, grouped by patient
  const allMessageNotifications = useMemo(() => {
    // Combine notifications by patientId (newMessageNotifications already grouped, unreadMessagesFromConversations also grouped)
    const patientNotificationsMap = new Map<
      string,
      {
        patientId: string;
        patientName: string;
        latestMessage: Message;
        messageCount: number;
      }
    >();

    // Add new message notifications
    for (const notification of newMessageNotifications) {
      patientNotificationsMap.set(notification.patientId, notification);
    }

    // Add unread messages from conversations (only if not already in newMessageNotifications)
    for (const notification of unreadMessagesFromConversations) {
      if (!patientNotificationsMap.has(notification.patientId)) {
        patientNotificationsMap.set(notification.patientId, notification);
      }
    }

    // Convert to array and sort by latest message date
    return Array.from(patientNotificationsMap.values()).sort(
      (a, b) =>
        new Date(b.latestMessage.createdAt).getTime() -
        new Date(a.latestMessage.createdAt).getTime(),
    );
  }, [newMessageNotifications, unreadMessagesFromConversations]);

  // Force re-render when notifications change to ensure badge updates in real-time
  const [, setRenderTrigger] = useState(0);

  useEffect(() => {
    // Trigger re-render when notifications change
    setRenderTrigger((prev) => prev + 1);
  }, [newMessageNotifications.length, allMessageNotifications.length]);

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

  const handleMessageRead = (patientId: string) => {
    clearMessageNotification(patientId);
    // UI will update automatically via socket/state listeners (useConversations/useConversation)
  };

  const unacknowledgedCount = alerts.length;
  const unreadMessagesCount = allMessageNotifications.length;
  const totalNotifications = unacknowledgedCount + unreadMessagesCount;
  const isLoading = isLoadingAlerts;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
        aria-label="Notificaciones"
      >
        <Bell className="w-5 h-5" />
        {totalNotifications > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs font-semibold rounded-full flex items-center justify-center">
            {totalNotifications > 9 ? "9+" : totalNotifications}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[600px] flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Notificaciones {totalNotifications > 0 && `(${totalNotifications})`}
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
            ) : totalNotifications === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No hay notificaciones nuevas</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Show unread messages first */}
                {allMessageNotifications.map((notification) => (
                  <MessageNotificationCard
                    key={notification.patientId}
                    message={notification.latestMessage}
                    patientId={notification.patientId}
                    patientName={notification.patientName}
                    messageCount={notification.messageCount}
                    onRead={() => handleMessageRead(notification.patientId)}
                    onDismiss={() => handleMessageRead(notification.patientId)}
                  />
                ))}
                {/* Then show alerts */}
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
