"use client";

import { useEffect, useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { useSocket } from "./useSocket";
import type { Message, Conversation } from "@/lib/messages-api";

/**
 * Hook to get conversation
 * For patients: returns conversation with their doctor
 * For doctors: requires patientId parameter
 */
export const useConversation = (patientId?: string) => {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const joinedPatientIdRef = useRef<string | undefined>(undefined);
  const currentPatientIdRef = useRef<string | undefined>(patientId);

  // Keep ref in sync with patientId
  useEffect(() => {
    currentPatientIdRef.current = patientId;
  }, [patientId]);

  const userRole = user?.role?.toUpperCase();
  const isDoctor = userRole === "DOCTOR" || (!userRole && !!user);
  const shouldEnable =
    !!user &&
    isConnected &&
    (userRole === "PATIENT" ||
      (isDoctor && patientId !== undefined && patientId !== null && patientId !== ""));

  // Always listen for new messages when socket is connected
  useEffect(() => {
    if (!socket || !user) return;

    // Listen for new messages (always active)
    const handleNewMessage = (newMessage: Message) => {
      const currentPatient = currentPatientIdRef.current;

      // Only add message if it's relevant to current conversation
      if (!currentPatient) return;

      const isRelevant =
        (newMessage.senderId === user.id && newMessage.receiverId === currentPatient) ||
        (newMessage.receiverId === user.id && newMessage.senderId === currentPatient);

      if (isRelevant) {
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.some((msg) => msg.id === newMessage.id)) {
            return prev;
          }
          return [...prev, newMessage];
        });
      }
    };

    // Register listener when socket connects
    const handleConnect = () => {
      socket.on("message:new", handleNewMessage);
    };

    // Register listener if socket is already connected, otherwise wait for connect event
    if (socket.connected) {
      handleConnect();
    } else {
      socket.on("connect", handleConnect);
    }

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("connect", handleConnect);
    };
  }, [socket, user]);

  // Join conversation room when enabled
  useEffect(() => {
    if (!shouldEnable || !socket || !isConnected) {
      setIsLoading(true);
      return;
    }

    // Reset when patientId changes
    const currentPatientId = patientId;
    if (
      joinedPatientIdRef.current !== undefined &&
      joinedPatientIdRef.current !== currentPatientId
    ) {
      setMessages([]);
      setIsLoading(true);
    }

    if (joinedPatientIdRef.current === currentPatientId) {
      return;
    }

    setIsLoading(true);
    joinedPatientIdRef.current = currentPatientId;

    // Join conversation room
    socket.emit(
      "conversation:join",
      { patientId },
      (response: { success: boolean; room?: string; error?: string }) => {
        if (!response.success) {
          console.error("Failed to join conversation:", response.error);
          setIsLoading(false);
        }
      },
    );

    // Listen for conversation messages (initial load)
    const handleConversationMessages = (conversationMessages: Message[]) => {
      setMessages(conversationMessages);
      setIsLoading(false);
    };

    socket.on("conversation:messages", handleConversationMessages);

    return () => {
      socket.off("conversation:messages", handleConversationMessages);
      if (socket.connected) {
        socket.emit("conversation:leave", { patientId });
      }
    };
  }, [shouldEnable, socket, isConnected, patientId, user]);

  return {
    data: messages,
    isLoading: !isConnected || isLoading,
    isError: false,
    error: null,
  };
};

/**
 * Hook to get all conversations (web app - doctor interface)
 */
export const useConversations = () => {
  const { user } = useAuth();
  const { socket, isConnected, error: socketError } = useSocket();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const hasRequestedRef = useRef(false);

  // Request conversations list when connected
  useEffect(() => {
    if (!socket || !isConnected || !user) {
      return;
    }

    // Reset request flag when socket or user changes
    if (hasRequestedRef.current) {
      return;
    }

    hasRequestedRef.current = true;

    // Request conversations list
    socket.emit(
      "conversation:list",
      {},
      (response: { success: boolean; conversations?: Conversation[]; error?: string }) => {
        if (response.success && response.conversations) {
          setConversations(response.conversations);
        } else if (response.error) {
          console.error("Error getting conversations:", response.error);
        }
      },
    );

    // Listen for conversation updates
    const handleConversationUpdated = (updatedConversations: Conversation[]) => {
      setConversations(updatedConversations);
    };

    socket.on("conversation:updated", handleConversationUpdated);

    return () => {
      socket.off("conversation:updated", handleConversationUpdated);
    };
  }, [socket, isConnected, user]);

  // Reset request flag when socket disconnects
  useEffect(() => {
    if (!isConnected) {
      hasRequestedRef.current = false;
    }
  }, [isConnected]);

  return {
    data: conversations,
    isLoading: !isConnected || (!hasRequestedRef.current && isConnected),
    isError: !!socketError,
    error: socketError,
  };
};

/**
 * Hook to send a message
 */
export const useSendMessage = () => {
  const { socket, isConnected } = useSocket();

  return useMutation({
    mutationFn: async ({
      receiverId,
      content,
    }: {
      receiverId: string;
      content: string;
    }): Promise<Message> => {
      if (!socket || !isConnected) {
        throw new Error("Socket not connected");
      }

      return new Promise((resolve, reject) => {
        socket.emit(
          "message:send",
          { receiverId, content },
          (response: { success: boolean; message?: Message; error?: string }) => {
            if (response.success && response.message) {
              resolve(response.message);
            } else {
              reject(new Error(response.error || "Failed to send message"));
            }
          },
        );
      });
    },
    // UI updates automatically via socket listeners (useConversation/useConversations)
    // No need to invalidate queries as these hooks use useState, not React Query
  });
};

/**
 * Hook to mark a message as read
 */
export const useMarkAsRead = () => {
  const { socket, isConnected } = useSocket();

  return useMutation({
    mutationFn: async (messageId: string): Promise<Message> => {
      if (!socket || !isConnected) {
        throw new Error("Socket not connected");
      }

      return new Promise((resolve, reject) => {
        socket.emit(
          "message:read",
          { messageId },
          (response: { success: boolean; message?: Message; error?: string }) => {
            if (response.success && response.message) {
              resolve(response.message);
            } else {
              reject(new Error(response.error || "Failed to mark message as read"));
            }
          },
        );
      });
    },
    // UI updates automatically via socket listeners (useConversation/useConversations)
    // No need to invalidate queries as these hooks use useState, not React Query
  });
};

/**
 * Hook to get unread messages count
 * Calculated from conversations data
 */
export const useUnreadMessagesCount = () => {
  const { data: conversations } = useConversations();

  const count = conversations?.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0) || 0;

  return {
    data: count,
    isLoading: false,
    isError: false,
    error: null,
  };
};

/**
 * Hook to detect new messages from patients when doctor is not viewing that conversation
 * Returns notifications for new messages from patients not in the active conversation
 * Works globally - can be used in Header or in specific pages
 */
export const useNewMessageNotifications = (activePatientId?: string) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState<
    Array<{
      patientId: string;
      patientName: string;
      latestMessage: Message;
      messageCount: number;
    }>
  >([]);
  const activePatientIdRef = useRef<string | undefined>(activePatientId);

  // Update ref when activePatientId changes
  useEffect(() => {
    activePatientIdRef.current = activePatientId;
  }, [activePatientId]);

  // Always listen for new messages
  useEffect(() => {
    if (!socket || !user) {
      return;
    }

    // Use ref to get current activePatientId
    const currentActivePatientId = activePatientIdRef.current;

    // Listen for new messages
    const handleNewMessage = (newMessage: Message) => {
      // Only process messages for the current user (doctor)
      if (newMessage.receiverId !== user.id) {
        return; // Not for this user, ignore
      }

      // Only show notification if message is from a patient not in the active conversation
      // If activePatientId is undefined (not in communication page), show all notifications
      if (currentActivePatientId && newMessage.senderId === currentActivePatientId) {
        return; // Message is from the active conversation, don't show notification
      }

      // Extract patient info from message
      const patientId = newMessage.senderId;
      const patientName =
        newMessage.sender.firstName && newMessage.sender.lastName
          ? `${newMessage.sender.firstName} ${newMessage.sender.lastName}`
          : newMessage.sender.email;

      // Update or create notification grouped by patient
      setNotifications((prev) => {
        // Check if notification already exists for this patient
        const existingIndex = prev.findIndex((n) => n.patientId === patientId);

        if (existingIndex >= 0) {
          // Update existing notification with latest message and increment count
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            latestMessage: newMessage,
            messageCount: updated[existingIndex].messageCount + 1,
          };
          return updated;
        } else {
          // Create new notification for this patient
          return [...prev, { patientId, patientName, latestMessage: newMessage, messageCount: 1 }];
        }
      });
    };

    // Register listener function
    const registerListener = () => {
      if (!socket.connected) {
        return;
      }

      // Remove any existing listener first to avoid duplicates
      socket.off("message:new", handleNewMessage);
      socket.on("message:new", handleNewMessage);
    };

    // Register listener immediately if socket is already connected
    if (socket.connected) {
      registerListener();
    }

    // Also register when socket connects (in case it's not connected yet)
    const handleConnect = () => {
      registerListener();
    };

    socket.on("connect", handleConnect);

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("connect", handleConnect);
    };
  }, [socket, user]);

  // Clear notifications when active patient changes (only if we're tracking active patient)
  useEffect(() => {
    if (activePatientId) {
      setNotifications((prev) => prev.filter((n) => n.patientId !== activePatientId));
    }
  }, [activePatientId]);

  const clearNotification = (patientId: string) => {
    setNotifications((prev) => prev.filter((n) => n.patientId !== patientId));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  return {
    notifications,
    clearNotification,
    clearAllNotifications,
  };
};
