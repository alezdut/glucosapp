import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { act } from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { DeviceEventEmitter } from "react-native";
import {
  useAssignedDoctor,
  useConversationWithDoctor,
  useConversations,
  useMarkAsRead,
  useMarkAsReadBatch,
  useSendMessage,
  useUnreadMessagesCount,
  useUnreadMessagesFromDoctor,
} from "../useMessages";
import { renderMobile } from "../../../test/render-mobile";
import type { Message, Conversation } from "../../lib/messages-api";
import { useAuth } from "../../contexts/AuthContext";
import { useSocket } from "../useSocket";
import { useMessageOutbox } from "../useMessageOutbox";
import * as api from "../../lib/api";

jest.mock("../../contexts/AuthContext", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../useSocket", () => ({
  useSocket: jest.fn(),
}));

jest.mock("../useMessageOutbox", () => ({
  useMessageOutbox: jest.fn(),
}));

jest.mock("../../lib/api", () => ({
  getAssignedDoctor: jest.fn(),
  markMessagesAsReadBatch: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseSocket = useSocket as jest.MockedFunction<typeof useSocket>;
const mockUseMessageOutbox = useMessageOutbox as jest.MockedFunction<typeof useMessageOutbox>;
const mockGetAssignedDoctor = api.getAssignedDoctor as jest.MockedFunction<
  typeof api.getAssignedDoctor
>;
const mockMarkMessagesAsReadBatch = api.markMessagesAsReadBatch as jest.MockedFunction<
  typeof api.markMessagesAsReadBatch
>;

type SocketHandler = (payload: any) => void;
type SocketEmit = (event: string, payload?: unknown, callback?: (response: any) => void) => void;
type TestSocket = {
  on: jest.MockedFunction<(event: string, handler: SocketHandler) => void>;
  off: jest.MockedFunction<(event: string, handler?: SocketHandler) => void>;
  emit: jest.MockedFunction<SocketEmit>;
};

const createSocketHarness = () => {
  const handlers = new Map<string, Set<SocketHandler>>();

  const socket: TestSocket = {
    on: jest.fn((event: string, handler: SocketHandler) => {
      const eventHandlers = handlers.get(event) ?? new Set();
      eventHandlers.add(handler);
      handlers.set(event, eventHandlers);
    }),
    off: jest.fn((event: string, handler?: SocketHandler) => {
      if (!handler) {
        handlers.delete(event);
        return;
      }
      handlers.get(event)?.delete(handler);
    }),
    emit: jest.fn(),
  };

  const trigger = (event: string, payload: any) => {
    handlers.get(event)?.forEach((handler) => handler(payload));
  };

  return { socket, trigger };
};

const buildMessage = (overrides: Partial<Message> = {}): Message => ({
  id: "msg-1",
  senderId: "doctor-1",
  receiverId: "patient-1",
  content: "Hola",
  read: false,
  createdAt: "2026-04-09T10:00:00.000Z",
  sender: { id: "doctor-1", email: "doctor@example.com" },
  receiver: { id: "patient-1", email: "patient@example.com" },
  ...overrides,
});

function ConversationProbe() {
  const conversation = useConversationWithDoctor("doctor-1");
  const batchRead = useMarkAsReadBatch();

  return (
    <div>
      <span data-testid="conversation-loading">{String(conversation.isLoading)}</span>
      <span data-testid="conversation-messages">
        {conversation.data.map((msg) => `${msg.id}:${msg.read}`).join(",")}
      </span>
      <button type="button" onClick={() => batchRead.mutate(["msg-1"])}>
        batch-read
      </button>
    </div>
  );
}

function UnreadProbe() {
  const unread = useUnreadMessagesFromDoctor();

  return <span data-testid="unread-count">{String(unread.data)}</span>;
}

function SendReadProbe() {
  const sendMessage = useSendMessage();
  const markAsRead = useMarkAsRead();
  const [status, setStatus] = React.useState("idle");

  return (
    <div>
      <button
        type="button"
        onClick={() =>
          sendMessage.mutate(
            { receiverId: "doctor-1", content: "mensaje" },
            {
              onSuccess: (message) => setStatus(`sent:${message.id}`),
              onError: (error) => setStatus(`send-error:${(error as Error).message}`),
            },
          )
        }
      >
        send
      </button>
      <button
        type="button"
        onClick={() =>
          markAsRead.mutate("msg-1", {
            onSuccess: (message) => setStatus(`read:${message.id}`),
            onError: (error) => setStatus(`read-error:${(error as Error).message}`),
          })
        }
      >
        read
      </button>
      <span data-testid="mutation-status">{status}</span>
    </div>
  );
}

function ConversationsCountProbe() {
  const conversations = useConversations();
  const unreadCount = useUnreadMessagesCount();

  return (
    <div>
      <span data-testid="conversations-size">{String(conversations.data.length)}</span>
      <span data-testid="unread-total">{String(unreadCount.data)}</span>
    </div>
  );
}

function AssignedDoctorProbe() {
  const assignedDoctor = useAssignedDoctor();

  return <span data-testid="assigned-doctor">{assignedDoctor.data?.id ?? "none"}</span>;
}

describe("useMessages", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: "patient-1", email: "patient@example.com" },
    } as never);
    mockUseMessageOutbox.mockReturnValue({
      entries: [],
      queueMessage: jest.fn(),
      retryMessage: jest.fn(),
      reconcileMessages: jest.fn(),
      flush: jest.fn(),
    } as never);
  });

  it("joins conversation room and reacts to message/new/read and batch-read events", async () => {
    const { socket, trigger } = createSocketHarness();

    socket.emit.mockImplementation((event, _payload, callback) => {
      if (event === "conversation:join") {
        callback?.({ success: true, room: "r1" });
      }
    });

    mockUseSocket.mockReturnValue({
      socket,
      isConnected: true,
      error: null,
      connectionState: "connected",
    } as never);
    mockMarkMessagesAsReadBatch.mockResolvedValue({ count: 1, messageIds: ["msg-1"] } as never);

    renderMobile(<ConversationProbe />);

    expect(screen.getByTestId("conversation-loading").textContent).toBe("false");

    await act(async () => {
      trigger("conversation:messages", [buildMessage({ id: "msg-1", read: false })]);
    });

    await waitFor(() => {
      expect(screen.getByTestId("conversation-loading").textContent).toBe("false");
      expect(screen.getByTestId("conversation-messages").textContent).toBe("msg-1:false");
    });

    await act(async () => {
      trigger("message:new", buildMessage({ id: "msg-2", read: false }));
      trigger("message:new", buildMessage({ id: "msg-2", read: false }));
      trigger("message:read", { messageId: "msg-2", read: true });
    });

    await waitFor(() => {
      expect(screen.getByTestId("conversation-messages").textContent).toContain("msg-2:true");
    });

    fireEvent.click(screen.getByRole("button", { name: "batch-read" }));

    await waitFor(() => {
      expect(mockMarkMessagesAsReadBatch).toHaveBeenCalledWith(["msg-1"]);
      expect(screen.getByTestId("conversation-messages").textContent).toContain("msg-1:true");
    });
  });

  it("tracks unread doctor messages and ignores duplicates/other receivers", async () => {
    const { socket, trigger } = createSocketHarness();

    socket.emit.mockImplementation((event, _payload, callback) => {
      if (event === "conversation:join") {
        callback?.({ success: true, room: "r1" });
      }
    });

    mockUseSocket.mockReturnValue({
      socket,
      isConnected: true,
      error: null,
      connectionState: "connected",
    } as never);

    renderMobile(<UnreadProbe />);

    await act(async () => {
      trigger("conversation:messages", [
        buildMessage({ id: "base-1", read: false, receiverId: "patient-1" }),
        buildMessage({ id: "base-2", read: true, receiverId: "patient-1" }),
        buildMessage({ id: "base-3", read: false, receiverId: "someone-else" }),
      ]);
    });

    await waitFor(() => {
      expect(screen.getByTestId("unread-count").textContent).toBe("1");
    });

    const incoming = buildMessage({ id: "incoming-1", read: false, receiverId: "patient-1" });
    await act(async () => {
      trigger("message:new", incoming);
      trigger("message:new", incoming);
      trigger(
        "message:new",
        buildMessage({ id: "incoming-2", receiverId: "doctor-1", read: false }),
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("unread-count").textContent).toBe("2");
    });

    await act(async () => {
      trigger("message:read", { messageId: "incoming-1", read: true });
    });

    await waitFor(() => {
      expect(screen.getByTestId("unread-count").textContent).toBe("1");
    });

    await act(async () => {
      DeviceEventEmitter.emit("messages:batch-read", { messageIds: ["base-1"] });
    });

    await waitFor(() => {
      expect(screen.getByTestId("unread-count").textContent).toBe("0");
    });
  });

  it("queues messages and marks them as read through socket callbacks", async () => {
    const { socket } = createSocketHarness();
    const queueMessage = jest
      .fn()
      .mockResolvedValue(buildMessage({ id: "local-1", clientMessageId: "client-1" }));

    socket.emit.mockImplementation((event, payload, callback) => {
      if (event === "message:read") {
        const readPayload = payload as { messageId: string };
        callback?.({
          success: true,
          message: buildMessage({ id: readPayload.messageId, read: true }),
        });
      }
    });

    mockUseMessageOutbox.mockReturnValue({
      entries: [],
      queueMessage,
      retryMessage: jest.fn(),
      reconcileMessages: jest.fn(),
      flush: jest.fn(),
    } as never);
    mockUseSocket.mockReturnValue({
      socket,
      isConnected: true,
      error: null,
      connectionState: "connected",
    } as never);

    renderMobile(<SendReadProbe />);

    fireEvent.click(screen.getByRole("button", { name: "send" }));

    await waitFor(() => {
      expect(screen.getByTestId("mutation-status").textContent).toBe("sent:local-1");
    });

    expect(queueMessage).toHaveBeenCalledWith({ receiverId: "doctor-1", content: "mensaje" });

    fireEvent.click(screen.getByRole("button", { name: "read" }));

    await waitFor(() => {
      expect(screen.getByTestId("mutation-status").textContent).toBe("read:msg-1");
    });
  });

  it("returns queued optimistic messages when socket is disconnected", async () => {
    const queueMessage = jest
      .fn()
      .mockResolvedValue(buildMessage({ id: "local-offline", deliveryStatus: "queued" }));
    mockUseMessageOutbox.mockReturnValue({
      entries: [],
      queueMessage,
      retryMessage: jest.fn(),
      reconcileMessages: jest.fn(),
      flush: jest.fn(),
    } as never);
    mockUseSocket.mockReturnValue({
      socket: null,
      isConnected: false,
      error: null,
      connectionState: "offline",
    });

    renderMobile(<SendReadProbe />);

    fireEvent.click(screen.getByRole("button", { name: "send" }));

    await waitFor(() => {
      expect(screen.getByTestId("mutation-status").textContent).toBe("sent:local-offline");
    });
  });

  it("loads conversations list, computes unread count and fetches assigned doctor", async () => {
    const { socket } = createSocketHarness();
    const conversations: Conversation[] = [
      { participant: { id: "d1", email: "d1@example.com" }, messages: [], unreadCount: 2 },
      { participant: { id: "d2", email: "d2@example.com" }, messages: [], unreadCount: 1 },
    ];

    socket.emit.mockImplementation((event, _payload, callback) => {
      if (event === "conversation:list") {
        callback?.({ success: true, conversations });
      }
    });

    mockUseSocket.mockReturnValue({
      socket,
      isConnected: true,
      error: null,
      connectionState: "connected",
    } as never);
    mockGetAssignedDoctor.mockResolvedValue({ id: "doctor-1" } as never);

    renderMobile(
      <>
        <ConversationsCountProbe />
        <AssignedDoctorProbe />
      </>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("conversations-size").textContent).toBe("2");
      expect(screen.getByTestId("unread-total").textContent).toBe("3");
      expect(screen.getByTestId("assigned-doctor").textContent).toBe("doctor-1");
    });

    expect(mockGetAssignedDoctor).toHaveBeenCalled();
  });
});
