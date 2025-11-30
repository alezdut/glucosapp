"use client";

import { useEffect, useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

    // Register listener immediately (socket might already be connected)
    socket.on("message:new", handleNewMessage);

    // Also register when socket connects (in case it's not connected yet)
    const handleConnect = () => {
      socket.on("message:new", handleNewMessage);
    };

    if (!socket.connected) {
      socket.on("connect", handleConnect);
    }

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("connect", handleConnect);
    };
  }, [socket, user?.id]);

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
  }, [shouldEnable, socket, isConnected, patientId, user?.id]);

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
  }, [socket, isConnected, user?.id]);

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
  const queryClient = useQueryClient();
  const { user } = useAuth();
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
    onSuccess: () => {
      // Invalidate queries to update UI
      queryClient.invalidateQueries({ queryKey: ["messages", "conversation"] });
      queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] });
    },
  });
};

/**
 * Hook to mark a message as read
 */
export const useMarkAsRead = () => {
  const queryClient = useQueryClient();
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
    onSuccess: () => {
      // Invalidate queries to update read status
      queryClient.invalidateQueries({ queryKey: ["messages", "conversation"] });
      queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] });
    },
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
  const { socket, isConnected } = useSocket();
  const [notifications, setNotifications] = useState<
    Array<{
      message: Message;
      patientId: string;
      patientName: string;
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

      // Add notification (avoid duplicates)
      setNotifications((prev) => {
        // Check if notification already exists for this message
        if (prev.some((n) => n.message.id === newMessage.id)) {
          return prev;
        }
        return [...prev, { message: newMessage, patientId, patientName }];
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
  }, [socket, user?.id]);

  // Clear notifications when active patient changes (only if we're tracking active patient)
  useEffect(() => {
    if (activePatientId) {
      setNotifications((prev) => prev.filter((n) => n.patientId !== activePatientId));
    }
  }, [activePatientId]);

  const clearNotification = (messageId: string) => {
    setNotifications((prev) => prev.filter((n) => n.message.id !== messageId));
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
