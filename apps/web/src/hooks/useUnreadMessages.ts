"use client";

import { useMemo } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useConversations, useConversation } from "./useMessages";
import type { Message } from "@/lib/messages-api";

/**
 * Hook to get unread messages for notifications
 * Returns messages that are unread and sent to the current user
 * Uses WebSocket data from useConversations/useConversation hooks
 */
export const useUnreadMessages = (limit: number = 10) => {
  const { user } = useAuth();
  const { data: conversations = [] } = useConversations();
  const { data: conversationMessages = [] } = useConversation();

  const unreadMessages = useMemo(() => {
    if (!user) {
      return [];
    }

    const unreadMessagesList: Array<Message & { participantId: string; participantName: string }> =
      [];

    // Use uppercase comparison to handle any case variations
    const userRole = user.role?.toUpperCase();
    const isDoctor = userRole === "DOCTOR" || (!userRole && !!user); // Assume doctor if role not available (web app is doctor-only)

    if (isDoctor) {
      // For doctors, get unread messages from all conversations
      for (const conversation of conversations) {
        if (conversation.unreadCount > 0) {
          // Get unread messages from this conversation
          const unread = conversation.messages.filter(
            (msg) => !msg.read && msg.receiverId === user.id,
          );

          for (const msg of unread) {
            unreadMessagesList.push({
              ...msg,
              participantId: conversation.participant.id,
              participantName:
                conversation.participant.firstName && conversation.participant.lastName
                  ? `${conversation.participant.firstName} ${conversation.participant.lastName}`
                  : conversation.participant.email,
            });
          }
        }
      }
    } else if (userRole === "PATIENT") {
      // For patients, get unread messages from conversation with doctor
      const unread = conversationMessages.filter((msg) => !msg.read && msg.receiverId === user.id);

      for (const msg of unread) {
        unreadMessagesList.push({
          ...msg,
          participantId: msg.senderId,
          participantName:
            msg.sender.firstName && msg.sender.lastName
              ? `${msg.sender.firstName} ${msg.sender.lastName}`
              : msg.sender.email,
        });
      }
    }

    // Sort by creation date (newest first) and limit
    return unreadMessagesList
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }, [user, conversations, conversationMessages, limit]);

  return {
    data: unreadMessages,
    isLoading: false, // Data comes from WebSocket hooks which handle loading state
    isError: false,
    error: null,
  };
};
