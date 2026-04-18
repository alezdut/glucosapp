import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { createClientMessageId } from "@glucosapp/utils";
import { useAuth } from "../contexts/AuthContext";
import { sendMessage, type Message, type MessageOutboxEntry } from "../lib/messages-api";
import {
  enqueueMessageOutboxEntry,
  flushMessageOutbox,
  loadMessageOutbox,
  reconcileMessageOutbox,
  retryMessageOutboxEntry,
  subscribeToMessageOutbox,
} from "../lib/message-outbox";
import { useSocket } from "./useSocket";

export const useMessageOutbox = (otherUserId?: string) => {
  const { user } = useAuth();
  const { connectionState } = useSocket();
  const [entries, setEntries] = useState<MessageOutboxEntry[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToMessageOutbox(setEntries);
    void loadMessageOutbox();
    return unsubscribe;
  }, []);

  const flush = useCallback(async () => {
    if (!user) {
      return;
    }

    await flushMessageOutbox(sendMessage);
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    if (connectionState === "connected" || connectionState === "degraded") {
      void flush();
    }
  }, [connectionState, flush, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        void flush();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [flush, user]);

  const queueMessage = useCallback(
    async ({ receiverId, content }: { receiverId: string; content: string }) => {
      if (!user) {
        throw new Error("User not authenticated");
      }

      const createdAtClient = new Date().toISOString();
      const clientMessageId = createClientMessageId();
      const localMessage: Message = {
        id: `local:${clientMessageId}`,
        senderId: user.id,
        receiverId,
        clientMessageId,
        content,
        read: false,
        createdAt: createdAtClient,
        createdAtClient,
        sender: {
          id: user.id,
          email: user.email ?? "",
          firstName: user.firstName ?? undefined,
          lastName: user.lastName ?? undefined,
        },
        receiver: {
          id: receiverId,
          email: "",
        },
        deliveryStatus: connectionState === "connected" ? "sending" : "queued",
        isOptimistic: true,
      };

      await enqueueMessageOutboxEntry({
        clientMessageId,
        receiverId,
        content,
        createdAtClient,
        status: connectionState === "connected" ? "sending" : "queued",
        attemptCount: 0,
        message: localMessage,
      });

      void flush();

      return localMessage;
    },
    [connectionState, flush, user],
  );

  const retryMessage = useCallback(
    async (clientMessageId: string) => {
      await retryMessageOutboxEntry(clientMessageId);
      void flush();
    },
    [flush],
  );

  const reconcileMessages = useCallback(async (confirmedMessages: Message[]) => {
    await reconcileMessageOutbox(confirmedMessages);
  }, []);

  const conversationEntries = entries.filter(
    (entry) =>
      !!otherUserId &&
      (entry.message.receiverId === otherUserId || entry.message.senderId === otherUserId),
  );

  return {
    entries: conversationEntries,
    queueMessage,
    retryMessage,
    reconcileMessages,
    flush,
  };
};
