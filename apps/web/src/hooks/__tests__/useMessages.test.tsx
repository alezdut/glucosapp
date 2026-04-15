"use client";

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useAuth } from "@/contexts/auth-context";
import { useSocket } from "../useSocket";
import * as messageOutbox from "@/lib/message-outbox";
import * as messagesApi from "@/lib/messages-api";
import {
  useConversation,
  useConversations,
  useMarkAsRead,
  useNewMessageNotifications,
  useSendMessage,
  useUnreadMessagesCount,
} from "../useMessages";

jest.mock("@/contexts/auth-context", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../useSocket", () => ({
  useSocket: jest.fn(),
}));

jest.mock("@/lib/message-outbox", () => ({
  enqueueMessageOutboxEntry: jest.fn(),
  flushMessageOutbox: jest.fn(),
  reconcileMessageOutbox: jest.fn(),
  retryMessageOutboxEntry: jest.fn(),
  subscribeToMessageOutbox: jest.fn(() => jest.fn()),
}));

jest.mock("@/lib/messages-api", () => ({
  sendMessage: jest.fn(),
}));

type Listener = (...args: unknown[]) => void;

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseSocket = useSocket as jest.MockedFunction<typeof useSocket>;
const mockEnqueueMessageOutboxEntry =
  messageOutbox.enqueueMessageOutboxEntry as jest.MockedFunction<
    typeof messageOutbox.enqueueMessageOutboxEntry
  >;
const mockFlushMessageOutbox = messageOutbox.flushMessageOutbox as jest.MockedFunction<
  typeof messageOutbox.flushMessageOutbox
>;
const mockSubscribeToMessageOutbox = messageOutbox.subscribeToMessageOutbox as jest.MockedFunction<
  typeof messageOutbox.subscribeToMessageOutbox
>;
const mockSendMessageApi = messagesApi.sendMessage as jest.MockedFunction<
  typeof messagesApi.sendMessage
>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = "MessagesHookWrapper";
  return Wrapper;
};

const createSocket = () => {
  const listeners = new Map<string, Set<Listener>>();

  const socket = {
    connected: true,
    on: jest.fn((event: string, callback: Listener) => {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event)?.add(callback);
    }),
    off: jest.fn((event: string, callback?: Listener) => {
      if (!callback) {
        listeners.delete(event);
        return;
      }
      listeners.get(event)?.delete(callback);
    }),
    emit: jest.fn((event: string, payload: unknown, callback?: (response: unknown) => void) => {
      if (event === "conversation:join") {
        callback?.({ success: true, room: "room-1" });
      }

      if (event === "conversation:list") {
        callback?.({
          success: true,
          conversations: [
            { patientId: "patient-1", unreadCount: 2 },
            { patientId: "patient-2", unreadCount: 1 },
          ],
        });
      }

      if (event === "message:send") {
        callback?.({
          success: true,
          message: {
            id: "message-sent",
            senderId: "doctor-1",
            receiverId: (payload as { receiverId: string }).receiverId,
            content: (payload as { content: string }).content,
          },
        });
      }

      if (event === "message:read") {
        callback?.({
          success: true,
          message: {
            id: (payload as { messageId: string }).messageId,
            senderId: "patient-1",
            receiverId: "doctor-1",
            content: "read",
          },
        });
      }
    }),
  };

  const trigger = (event: string, payload: unknown) => {
    listeners.get(event)?.forEach((listener) => listener(payload));
  };

  return { socket, trigger };
};

describe("useMessages hooks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem("accessToken", "token-123");
    mockUseAuth.mockReturnValue({
      user: { id: "doctor-1", role: "DOCTOR" },
      isLoading: false,
      isAuthenticated: true,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      refreshUser: jest.fn(),
    } as never);
    mockSubscribeToMessageOutbox.mockImplementation((listener) => {
      listener([]);
      return jest.fn();
    });
    mockFlushMessageOutbox.mockResolvedValue(undefined);
    mockSendMessageApi.mockResolvedValue({
      id: "message-sent",
      senderId: "doctor-1",
      receiverId: "patient-1",
      content: "Hola",
      read: false,
      createdAt: "2026-04-15T00:00:00.000Z",
      sender: { id: "doctor-1", email: "doctor@example.com" },
      receiver: { id: "patient-1", email: "patient@example.com" },
    } as never);
  });

  it("loads and updates a conversation through socket events", async () => {
    const { socket, trigger } = createSocket();
    mockUseSocket.mockReturnValue({
      socket,
      isConnected: true,
      error: null,
      connectionState: "connected",
    } as never);

    const { result, unmount } = renderHook(() => useConversation("patient-1"), {
      wrapper: createWrapper(),
    });

    expect(socket.emit).toHaveBeenCalledWith(
      "conversation:join",
      { patientId: "patient-1" },
      expect.any(Function),
    );

    act(() => {
      trigger("conversation:messages", [
        { id: "msg-1", senderId: "patient-1", receiverId: "doctor-1", content: "Hola" },
      ]);
    });

    await waitFor(() => expect(result.current.data).toHaveLength(1));

    act(() => {
      trigger("message:new", {
        id: "msg-2",
        senderId: "patient-1",
        receiverId: "doctor-1",
        content: "Seguimiento",
      });
      trigger("message:new", {
        id: "msg-2",
        senderId: "patient-1",
        receiverId: "doctor-1",
        content: "Seguimiento",
      });
      trigger("message:new", {
        id: "msg-3",
        senderId: "patient-2",
        receiverId: "doctor-1",
        content: "Otro paciente",
      });
    });

    expect(result.current.data).toEqual([
      expect.objectContaining({
        id: "msg-1",
        senderId: "patient-1",
        receiverId: "doctor-1",
        content: "Hola",
      }),
      expect.objectContaining({
        id: "msg-2",
        senderId: "patient-1",
        receiverId: "doctor-1",
        content: "Seguimiento",
      }),
    ]);

    unmount();
    expect(socket.emit).toHaveBeenCalledWith("conversation:leave", { patientId: "patient-1" });
  });

  it("loads conversations and calculates unread counts", async () => {
    const { socket, trigger } = createSocket();
    mockUseSocket.mockReturnValue({
      socket,
      isConnected: true,
      error: null,
      connectionState: "connected",
    } as never);

    const { result } = renderHook(() => useConversations(), {
      wrapper: createWrapper(),
    });
    const { result: unreadResult } = renderHook(() => useUnreadMessagesCount(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toHaveLength(2));
    expect(unreadResult.current.data).toBe(3);

    act(() => {
      trigger("conversation:updated", [{ patientId: "patient-3", unreadCount: 5 }]);
    });

    await waitFor(() =>
      expect(result.current.data).toEqual([{ patientId: "patient-3", unreadCount: 5 }]),
    );
  });

  it("queues messages and marks them as read through mutations", async () => {
    const { socket } = createSocket();
    mockUseSocket.mockReturnValue({
      socket,
      isConnected: true,
      error: null,
      connectionState: "connected",
    } as never);

    const { result: sendResult } = renderHook(() => useSendMessage(), {
      wrapper: createWrapper(),
    });
    const { result: readResult } = renderHook(() => useMarkAsRead(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await expect(
        sendResult.current.mutateAsync({ receiverId: "patient-1", content: "Hola" }),
      ).resolves.toEqual(expect.objectContaining({ receiverId: "patient-1", content: "Hola" }));

      await expect(readResult.current.mutateAsync("msg-9")).resolves.toEqual(
        expect.objectContaining({ id: "msg-9" }),
      );
    });

    expect(mockEnqueueMessageOutboxEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        receiverId: "patient-1",
        content: "Hola",
      }),
    );
    expect(mockFlushMessageOutbox).toHaveBeenCalled();
    expect(socket.emit).toHaveBeenCalledWith(
      "message:read",
      { messageId: "msg-9" },
      expect.any(Function),
    );
  });

  it("groups and clears new message notifications", async () => {
    const { socket, trigger } = createSocket();
    mockUseSocket.mockReturnValue({
      socket,
      isConnected: true,
      error: null,
      connectionState: "connected",
    } as never);

    const { result, rerender } = renderHook(
      ({ activePatientId }: { activePatientId?: string }) =>
        useNewMessageNotifications(activePatientId),
      {
        initialProps: { activePatientId: "patient-active" },
        wrapper: createWrapper(),
      },
    );

    act(() => {
      trigger("message:new", {
        id: "ignored",
        senderId: "patient-active",
        receiverId: "doctor-1",
        content: "Current chat",
        sender: { firstName: "Act", lastName: "Ive", email: "active@example.com" },
      });
      trigger("message:new", {
        id: "msg-1",
        senderId: "patient-9",
        receiverId: "doctor-1",
        content: "Primero",
        sender: { firstName: "Lia", lastName: "Suarez", email: "lia@example.com" },
      });
      trigger("message:new", {
        id: "msg-2",
        senderId: "patient-9",
        receiverId: "doctor-1",
        content: "Segundo",
        sender: { firstName: "Lia", lastName: "Suarez", email: "lia@example.com" },
      });
    });

    expect(result.current.notifications).toEqual([
      expect.objectContaining({
        patientId: "patient-9",
        patientName: "Lia Suarez",
        messageCount: 2,
        latestMessage: expect.objectContaining({ id: "msg-2" }),
      }),
    ]);

    act(() => {
      result.current.clearNotification("patient-9");
    });
    expect(result.current.notifications).toEqual([]);

    act(() => {
      trigger("message:new", {
        id: "msg-3",
        senderId: "patient-7",
        receiverId: "doctor-1",
        content: "Tercero",
        sender: { firstName: "", lastName: "", email: "fallback@example.com" },
      });
    });

    rerender({ activePatientId: "patient-7" });
    expect(result.current.notifications).toEqual([]);

    act(() => {
      trigger("message:new", {
        id: "msg-4",
        senderId: "patient-8",
        receiverId: "doctor-1",
        content: "Cuarto",
        sender: { firstName: "Nora", lastName: "Diaz", email: "nora@example.com" },
      });
      result.current.clearAllNotifications();
    });

    expect(result.current.notifications).toEqual([]);
  });

  it("still queues messages when socket is not connected", async () => {
    mockUseSocket.mockReturnValue({
      socket: null,
      isConnected: false,
      error: new Error("down"),
      connectionState: "offline",
    } as never);

    const { result: sendResult } = renderHook(() => useSendMessage(), {
      wrapper: createWrapper(),
    });
    const { result: readResult } = renderHook(() => useMarkAsRead(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await expect(
        sendResult.current.mutateAsync({ receiverId: "patient-1", content: "Hola" }),
      ).resolves.toEqual(expect.objectContaining({ receiverId: "patient-1", content: "Hola" }));
      await expect(readResult.current.mutateAsync("msg-1")).rejects.toThrow("Socket not connected");
    });
  });
});
