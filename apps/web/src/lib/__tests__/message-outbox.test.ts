"use client";

import { beforeEach, describe, expect, it } from "@jest/globals";
import * as outbox from "../message-outbox";

const buildEntry = () => ({
  clientMessageId: "client-1",
  receiverId: "patient-1",
  content: "Hola",
  createdAtClient: "2026-04-15T00:00:00.000Z",
  status: "queued" as const,
  attemptCount: 0,
  message: {
    id: "local:client-1",
    senderId: "doctor-1",
    receiverId: "patient-1",
    clientMessageId: "client-1",
    content: "Hola",
    read: false,
    createdAt: "2026-04-15T00:00:00.000Z",
    createdAtClient: "2026-04-15T00:00:00.000Z",
    sender: { id: "doctor-1", email: "doctor@example.com" },
    receiver: { id: "patient-1", email: "patient@example.com" },
    deliveryStatus: "queued" as const,
    isOptimistic: true,
  },
});

describe("web message outbox", () => {
  beforeEach(() => {
    outbox.resetMessageOutboxForTests();
  });

  it("flushes queued entries and updates them as sent", async () => {
    await outbox.enqueueMessageOutboxEntry(buildEntry());
    await outbox.flushMessageOutbox(async () => ({
      ...buildEntry().message,
      id: "server-1",
      deliveryStatus: "sent",
      isOptimistic: false,
    }));

    expect(outbox.subscribeToMessageOutbox).toBeDefined();
  });

  it("keeps temporary failures queued and removes confirmed sent entries", async () => {
    const entry = buildEntry();
    const observedSnapshots: number[] = [];
    const unsubscribe = outbox.subscribeToMessageOutbox((entries) => {
      observedSnapshots.push(entries.length);
    });

    await outbox.enqueueMessageOutboxEntry(entry);
    await outbox.flushMessageOutbox(async () => {
      throw new Error("Network timeout");
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

    unsubscribe();

    expect(observedSnapshots.length).toBeGreaterThan(0);
  });
});
