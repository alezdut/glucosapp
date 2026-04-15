import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getMessageErrorMessage,
  isTemporaryMessageError,
  messagesMatch,
  upsertMessage,
} from "@glucosapp/utils";
import type { Message, MessageOutboxEntry, SendMessagePayload } from "./messages-api";

const STORAGE_KEY = "@glucosapp/message-outbox";

type Listener = (entries: MessageOutboxEntry[]) => void;
type SendMessageFn = (payload: SendMessagePayload) => Promise<Message>;

let entries: MessageOutboxEntry[] = [];
let loaded = false;
let loadPromise: Promise<void> | null = null;
let flushPromise: Promise<void> | null = null;
const listeners = new Set<Listener>();

const notify = () => {
  const snapshot = [...entries];
  listeners.forEach((listener) => listener(snapshot));
};

const persist = async () => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
};

export const loadMessageOutbox = async (): Promise<void> => {
  if (loaded) {
    return;
  }

  if (!loadPromise) {
    loadPromise = (async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      entries = stored ? ((JSON.parse(stored) as MessageOutboxEntry[]) ?? []) : [];
      loaded = true;
      notify();
    })().finally(() => {
      loadPromise = null;
    });
  }

  await loadPromise;
};

export const subscribeToMessageOutbox = (listener: Listener) => {
  listeners.add(listener);
  void loadMessageOutbox().then(() => listener([...entries]));

  return () => {
    listeners.delete(listener);
  };
};

export const getMessageOutboxSnapshot = (): MessageOutboxEntry[] => [...entries];

export const enqueueMessageOutboxEntry = async (entry: MessageOutboxEntry): Promise<void> => {
  await loadMessageOutbox();
  entries = upsertOutboxEntry(entries, entry);
  await persist();
  notify();
};

export const retryMessageOutboxEntry = async (clientMessageId: string): Promise<void> => {
  await loadMessageOutbox();
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
  await persist();
  notify();
};

export const reconcileMessageOutbox = async (confirmedMessages: Message[]): Promise<void> => {
  await loadMessageOutbox();
  const nextEntries = entries.filter(
    (entry) =>
      entry.status !== "sent" ||
      !confirmedMessages.some((confirmedMessage) => messagesMatch(entry.message, confirmedMessage)),
  );

  if (nextEntries.length === entries.length) {
    return;
  }

  entries = nextEntries;
  await persist();
  notify();
};

export const flushMessageOutbox = async (sendMessageFn: SendMessageFn): Promise<void> => {
  await loadMessageOutbox();

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
      await persist();
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
        await persist();
        notify();
      } catch (error) {
        const nextStatus = isTemporaryMessageError(error) ? "queued" : "failed";
        const errorMessage = getMessageErrorMessage(error);

        entries = entries.map((entry) =>
          entry.clientMessageId === pendingEntry.clientMessageId
            ? {
                ...entry,
                status: nextStatus,
                lastError: errorMessage,
                message: {
                  ...entry.message,
                  deliveryStatus: nextStatus,
                },
              }
            : entry,
        );
        await persist();
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
  loaded = false;
  loadPromise = null;
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
