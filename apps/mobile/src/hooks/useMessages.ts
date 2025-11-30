import { useEffect, useState, useRef } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useSocket } from "./useSocket";
import { useAuth } from "../contexts/AuthContext";
import { getAssignedDoctor } from "../lib/api";
import type { Message, Conversation } from "../lib/messages-api";

/**
 * Hook to get conversation with doctor (for patients)
 */
export const useConversationWithDoctor = () => {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const hasJoinedRef = useRef(false);

  // Join conversation room when enabled
  useEffect(() => {
    if (!socket || !isConnected || !user) {
      setIsLoading(true);
      return;
    }

    if (hasJoinedRef.current) {
      return;
    }

    setIsLoading(true);
    hasJoinedRef.current = true;

    // Join conversation room (patients chat with their doctor)
    socket.emit(
      "conversation:join",
      {},
      (response: { success: boolean; room?: string; error?: string }) => {
        if (!response.success) {
          console.error("Failed to join conversation:", response.error);
          setIsLoading(false);
        }
      },
    );

    // Listen for conversation messages
    const handleConversationMessages = (conversationMessages: Message[]) => {
      setMessages(conversationMessages);
      setIsLoading(false);
    };

    // Listen for new messages
    const handleNewMessage = (newMessage: Message) => {
      setMessages((prev) => {
        // Avoid duplicates
        if (prev.some((msg) => msg.id === newMessage.id)) {
          return prev;
        }
        return [...prev, newMessage];
      });
    };

    socket.on("conversation:messages", handleConversationMessages);
    socket.on("message:new", handleNewMessage);

    return () => {
      socket.off("conversation:messages", handleConversationMessages);
      socket.off("message:new", handleNewMessage);
      // Don't leave room - useUnreadMessagesFromDoctor needs to stay in room for notifications
      // The room will be cleaned up when socket disconnects
      hasJoinedRef.current = false;
    };
  }, [socket, isConnected, user?.id]);

  return {
    data: messages,
    isLoading: !isConnected || isLoading,
    isError: false,
    error: null,
  };
};

/**
 * Hook to get all conversations (doctors only)
 */
export const useConversations = () => {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const [conversations, setConversations] = useState<Conversation[]>([]);

  // Request conversations list when connected
  useEffect(() => {
    if (!socket || !isConnected || !user) return;

    // Request conversations list
    socket.emit(
      "conversation:list",
      {},
      (response: { success: boolean; conversations?: Conversation[]; error?: string }) => {
        if (response.success && response.conversations) {
          setConversations(response.conversations);
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

  return {
    data: conversations,
    isLoading: !isConnected,
    isError: false,
    error: null,
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
 * Hook to get unread messages count from doctor (for patients)
 * Always listens for new messages, even when not on Communication screen
 */
export const useUnreadMessagesFromDoctor = () => {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesRef = useRef<Message[]>([]);
  const hasJoinedRef = useRef(false);

  // Always listen for new messages (even before joining room)
  useEffect(() => {
    if (!socket || !isConnected || !user) {
      return;
    }

    // Listen for new messages - this listener is ALWAYS active
    // It will receive messages even if we're not in the room (server emits directly to socket)
    const handleNewMessage = (newMessage: Message) => {
      // Only process messages for the current user
      if (newMessage.receiverId !== user.id) {
        return; // Not for this user, ignore
      }

      // Check if message already exists to avoid duplicates
      const messageExists = messagesRef.current.some((msg) => msg.id === newMessage.id);

      if (messageExists) {
        return; // Skip if message already exists
      }

      // Update messages ref first
      messagesRef.current = [...messagesRef.current, newMessage];

      // Only count if message is not read
      if (!newMessage.read) {
        setUnreadCount((prev) => {
          const newCount = prev + 1;
          return newCount;
        });
      }
    };

    // Listen for message read updates
    const handleMessageRead = (data: { messageId: string; read: boolean }) => {
      // Update the message in our ref
      messagesRef.current = messagesRef.current.map((msg) =>
        msg.id === data.messageId ? { ...msg, read: data.read } : msg,
      );
      // Recalculate unread count
      const count = messagesRef.current.filter(
        (msg) => !msg.read && msg.receiverId === user.id,
      ).length;
      setUnreadCount(count);
    };

    // Register listeners (remove old ones first to avoid duplicates)
    socket.off("message:new", handleNewMessage);
    socket.off("message:read", handleMessageRead);

    // Register listeners - these will fire for ALL messages received on this socket
    socket.on("message:new", handleNewMessage);
    socket.on("message:read", handleMessageRead);

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("message:read", handleMessageRead);
    };
  }, [socket, isConnected, user?.id]);

  // Join conversation room to get initial messages and stay in room
  // This hook should ALWAYS stay in the room to receive notifications
  useEffect(() => {
    if (!socket || !isConnected || !user) {
      setUnreadCount(0);
      messagesRef.current = [];
      hasJoinedRef.current = false;
      return;
    }

    // Join conversation room to receive messages (only once, and stay in room)
    if (!hasJoinedRef.current) {
      hasJoinedRef.current = true;
      socket.emit(
        "conversation:join",
        {},
        (response: { success: boolean; room?: string; error?: string }) => {
          if (!response.success) {
            console.error("Failed to join conversation for unread count:", response.error);
            hasJoinedRef.current = false;
          }
        },
      );
    }

    // Listen for conversation messages (initial load)
    const handleConversationMessages = (conversationMessages: Message[]) => {
      messagesRef.current = conversationMessages;
      const count = conversationMessages.filter(
        (msg) => !msg.read && msg.receiverId === user.id,
      ).length;
      setUnreadCount(count);
    };

    socket.off("conversation:messages", handleConversationMessages);
    socket.on("conversation:messages", handleConversationMessages);

    return () => {
      socket.off("conversation:messages", handleConversationMessages);
      // NEVER leave room - we need to stay in room to receive notifications
      // This hook should persist for the lifetime of the app session
    };
  }, [socket, isConnected, user?.id]);

  return {
    data: unreadCount,
    isLoading: !isConnected,
    isError: false,
    error: null,
  };
};

/**
 * Hook to get assigned doctor (for patients)
 * This uses REST API as doctor assignment is not part of messaging system
 */
export const useAssignedDoctor = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["assigned-doctor"],
    queryFn: async () => {
      return getAssignedDoctor();
    },
    enabled: !!user,
    staleTime: 1 * 60 * 5000, // Cache for 1 minute (reduced to avoid stale data)
    refetchOnMount: true, // Always refetch when component mounts
  });
};
