import {
  createClientMessageId,
  filterUnconfirmedMessages,
  getMessageErrorMessage,
  getMessageIdentityKey,
  isTemporaryMessageError,
  mergeMessages,
  messagesMatch,
  normalizeClientMessageId,
  upsertMessage,
} from "./message-utils";

describe("message-utils", () => {
  it("normalizes client message ids", () => {
    expect(normalizeClientMessageId("  abc  ")).toBe("abc");
    expect(normalizeClientMessageId("")).toBeUndefined();
    expect(normalizeClientMessageId(undefined)).toBeUndefined();
  });

  it("creates a client message id", () => {
    expect(createClientMessageId()).toMatch(/^msg_|^[0-9a-f-]{10,}$/i);
  });

  it("builds identity keys preferring client message id", () => {
    expect(getMessageIdentityKey({ id: "1", clientMessageId: "abc" })).toBe("client:abc");
    expect(getMessageIdentityKey({ id: "1" })).toBe("id:1");
  });

  it("matches messages by client message id before server id", () => {
    expect(messagesMatch({ clientMessageId: "abc" }, { clientMessageId: "abc", id: "2" })).toBe(
      true,
    );
    expect(messagesMatch({ id: "1" }, { id: "1" })).toBe(true);
    expect(messagesMatch({ id: "1" }, { id: "2" })).toBe(false);
  });

  it("upserts and sorts messages", () => {
    const initial = [
      { id: "1", createdAt: "2024-01-01T00:00:00.000Z", content: "first" },
      {
        id: "local-2",
        clientMessageId: "client-2",
        createdAt: "2024-01-03T00:00:00.000Z",
        content: "third",
      },
    ];

    const withSecond = upsertMessage(initial, {
      id: "2",
      createdAt: "2024-01-02T00:00:00.000Z",
      content: "second",
    });

    expect(withSecond.map((message) => message.content)).toEqual(["first", "second", "third"]);

    const reconciled = upsertMessage(withSecond, {
      id: "server-2",
      clientMessageId: "client-2",
      createdAt: "2024-01-03T00:00:00.000Z",
      content: "third confirmed",
    });

    expect(reconciled).toHaveLength(3);
    expect(reconciled[2]).toMatchObject({
      id: "server-2",
      clientMessageId: "client-2",
      content: "third confirmed",
    });
  });

  it("merges messages without duplicating optimistic and confirmed copies", () => {
    const merged = mergeMessages(
      [{ id: "1", createdAt: "2024-01-01T00:00:00.000Z", content: "remote" }],
      [
        {
          id: "local-1",
          clientMessageId: "client-1",
          createdAt: "2024-01-02T00:00:00.000Z",
          content: "optimistic",
        },
        {
          id: "server-1",
          clientMessageId: "client-1",
          createdAt: "2024-01-02T00:00:00.000Z",
          content: "confirmed",
        },
      ],
    );

    expect(merged).toHaveLength(2);
    expect(merged[1]).toMatchObject({ id: "server-1", content: "confirmed" });
  });

  it("filters out queued messages already confirmed by the server", () => {
    const queued = [
      { clientMessageId: "a", id: "local-a" },
      { clientMessageId: "b", id: "local-b" },
    ];
    const confirmed = [{ clientMessageId: "b", id: "server-b" }];

    expect(filterUnconfirmedMessages(queued, confirmed)).toEqual([
      { clientMessageId: "a", id: "local-a" },
    ]);
  });

  it("classifies temporary and permanent errors", () => {
    expect(isTemporaryMessageError({ status: 503 })).toBe(true);
    expect(isTemporaryMessageError({ status: 422 })).toBe(false);
    expect(isTemporaryMessageError(new Error("Socket not connected"))).toBe(true);
    expect(isTemporaryMessageError(new Error("Forbidden"))).toBe(false);
  });

  it("extracts a human-friendly error message", () => {
    expect(getMessageErrorMessage(new Error("Nope"))).toBe("Nope");
    expect(getMessageErrorMessage({ message: "Bad request" })).toBe("Bad request");
    expect(getMessageErrorMessage({})).toBe("Failed to send message");
  });
});
