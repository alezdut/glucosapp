"use client";

import {
  getMessageErrorMessage,
  isTemporaryMessageError,
  messagesMatch,
  upsertMessage,
} from "@glucosapp/utils";
import type { Message, MessageOutboxEntry, SendMessagePayload } from "./messages-api";

type Listener = (entries: MessageOutboxEntry[]) => void;
type SendMessageFn = (payload: SendMessagePayload) => Promise<Message>;

let entries: MessageOutboxEntry[] = [];
let flushPromise: Promise<void> | null = null;
const listeners = new Set<Listener>();

const notify = () => {
  const snapshot = [...entries];
  listeners.forEach((listener) => listener(snapshot));
};

export const subscribeToMessageOutbox = (listener: Listener) => {
  listeners.add(listener);
  listener([...entries]);

  return () => {
    listeners.delete(listener);
  };
};

export const enqueueMessageOutboxEntry = async (entry: MessageOutboxEntry): Promise<void> => {
  entries = upsertOutboxEntry(entries, entry);
  notify();
};

export const retryMessageOutboxEntry = async (clientMessageId: string): Promise<void> => {
  entries = entries.map((entry) =>
    entry.clientMessageId === clientMessageId
      ? {
          ...entry,
          status: "queued",
          lastError: undefined,
          message: {
            ...entry.message,
            deliveryStatus: "queued",
          },
        }
      : entry,
  );
  notify();
};

export const reconcileMessageOutbox = async (confirmedMessages: Message[]): Promise<void> => {
  const nextEntries = entries.filter(
    (entry) =>
      entry.status !== "sent" ||
      !confirmedMessages.some((confirmedMessage) => messagesMatch(entry.message, confirmedMessage)),
  );

  if (nextEntries.length === entries.length) {
    return;
  }

  entries = nextEntries;
  notify();
};

export const flushMessageOutbox = async (sendMessageFn: SendMessageFn): Promise<void> => {
  if (flushPromise) {
    return flushPromise;
  }

  flushPromise = (async () => {
    const pendingEntries = [...entries].filter(
      (entry) => entry.status === "queued" || entry.status === "sending",
    );

    for (const pendingEntry of pendingEntries) {
      entries = entries.map((entry) =>
        entry.clientMessageId === pendingEntry.clientMessageId
          ? {
              ...entry,
              attemptCount: entry.attemptCount + 1,
              status: "sending",
              lastError: undefined,
              message: {
                ...entry.message,
                deliveryStatus: "sending",
              },
            }
          : entry,
      );
      notify();

      try {
        const serverMessage = await sendMessageFn({
          receiverId: pendingEntry.receiverId,
          content: pendingEntry.content,
          clientMessageId: pendingEntry.clientMessageId,
          createdAtClient: pendingEntry.createdAtClient,
        });

        entries = entries.map((entry) =>
          entry.clientMessageId === pendingEntry.clientMessageId
            ? {
                ...entry,
                status: "sent",
                lastError: undefined,
                message: {
                  ...serverMessage,
                  deliveryStatus: "sent",
                  isOptimistic: false,
                },
              }
            : entry,
        );
        notify();
      } catch (error) {
        const nextStatus = isTemporaryMessageError(error) ? "queued" : "failed";

        entries = entries.map((entry) =>
          entry.clientMessageId === pendingEntry.clientMessageId
            ? {
                ...entry,
                status: nextStatus,
                lastError: getMessageErrorMessage(error),
                message: {
                  ...entry.message,
                  deliveryStatus: nextStatus,
                },
              }
            : entry,
        );
        notify();
      }
    }
  })().finally(() => {
    flushPromise = null;
  });

  return flushPromise;
};

export const resetMessageOutboxForTests = (): void => {
  entries = [];
  flushPromise = null;
  listeners.clear();
};

const upsertOutboxEntry = (
  currentEntries: MessageOutboxEntry[],
  nextEntry: MessageOutboxEntry,
): MessageOutboxEntry[] => {
  const existingIndex = currentEntries.findIndex(
    (entry) => entry.clientMessageId === nextEntry.clientMessageId,
  );

  if (existingIndex === -1) {
    return [...currentEntries, nextEntry];
  }

  const updatedEntries = [...currentEntries];
  updatedEntries[existingIndex] = {
    ...updatedEntries[existingIndex],
    ...nextEntry,
    message: upsertMessage([updatedEntries[existingIndex].message], nextEntry.message)[0],
  };
  return updatedEntries;
};
