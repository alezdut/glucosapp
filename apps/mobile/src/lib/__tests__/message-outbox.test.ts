import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as outbox from "../message-outbox";

const mockStorage = new Map<string, string>();

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockStorage.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      mockStorage.set(key, value);
    }),
  },
}));

const buildEntry = () => ({
  clientMessageId: "client-1",
  receiverId: "doctor-1",
  content: "Hola",
  createdAtClient: "2026-04-15T00:00:00.000Z",
  status: "queued" as const,
  attemptCount: 0,
  message: {
    id: "local:client-1",
    senderId: "patient-1",
    receiverId: "doctor-1",
    clientMessageId: "client-1",
    content: "Hola",
    read: false,
    createdAt: "2026-04-15T00:00:00.000Z",
    createdAtClient: "2026-04-15T00:00:00.000Z",
    sender: { id: "patient-1", email: "patient@example.com" },
    receiver: { id: "doctor-1", email: "doctor@example.com" },
    deliveryStatus: "queued" as const,
    isOptimistic: true,
  },
});

describe("mobile message outbox", () => {
  beforeEach(() => {
    mockStorage.clear();
    outbox.resetMessageOutboxForTests();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("persists enqueued entries and marks them sent after a successful flush", async () => {
    await outbox.enqueueMessageOutboxEntry(buildEntry());
    await outbox.flushMessageOutbox(async () => ({
      ...buildEntry().message,
      id: "server-1",
      deliveryStatus: "sent",
      isOptimistic: false,
    }));

    const snapshot = outbox.getMessageOutboxSnapshot();
    expect(snapshot).toHaveLength(1);
    expect(snapshot[0]).toMatchObject({
      status: "sent",
      message: {
        id: "server-1",
        deliveryStatus: "sent",
      },
    });
  });

  it("keeps temporary failures queued and removes sent entries once confirmed", async () => {
    const entry = buildEntry();

    await outbox.enqueueMessageOutboxEntry(entry);
    await outbox.flushMessageOutbox(async () => {
      throw new Error("Network timeout");
    });

    expect(outbox.getMessageOutboxSnapshot()[0]).toMatchObject({
      status: "queued",
      lastError: "Network timeout",
    });

    await outbox.retryMessageOutboxEntry("client-1");
    await outbox.flushMessageOutbox(async () => ({
      ...entry.message,
      id: "server-1",
      deliveryStatus: "sent",
      isOptimistic: false,
    }));

    await outbox.reconcileMessageOutbox([
      {
        ...entry.message,
        id: "server-1",
      },
    ]);

    expect(outbox.getMessageOutboxSnapshot()).toEqual([]);
  });
});
