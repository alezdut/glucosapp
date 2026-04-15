"use client";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useAuth } from "@/contexts/auth-context";
import { disconnectSocket, getSocket } from "@/lib/socket-client";
import { useSocket } from "../useSocket";

jest.mock("@/contexts/auth-context", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/lib/socket-client", () => ({
  getSocket: jest.fn(),
  disconnectSocket: jest.fn(),
}));

type Listener = (...args: unknown[]) => void;

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockGetSocket = getSocket as jest.MockedFunction<typeof getSocket>;
const mockDisconnectSocket = disconnectSocket as jest.MockedFunction<typeof disconnectSocket>;

const createSocket = (token: string, connected = true) => {
  const listeners = new Map<string, Set<Listener>>();

  return {
    connected,
    io: {
      opts: {
        query: { token },
        reconnection: false,
      },
    },
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
    connect: jest.fn(),
    trigger: (event: string, ...payload: unknown[]) => {
      listeners.get(event)?.forEach((listener) => listener(...payload));
    },
  };
};

describe("useSocket", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("disconnects when the user is not authenticated", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      refreshUser: jest.fn(),
    } as never);

    const { result } = renderHook(() => useSocket());

    expect(result.current.socket).toBeNull();
    expect(result.current.isConnected).toBe(false);
    expect(mockDisconnectSocket).not.toHaveBeenCalled();
  });

  it("returns an error when there is no token or socket instance", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "doctor-1" },
      isAuthenticated: true,
      isLoading: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      refreshUser: jest.fn(),
    } as never);

    const { result, unmount } = renderHook(() => useSocket());
    expect(result.current.error?.message).toBe("No access token available");

    unmount();
    localStorage.setItem("accessToken", "token-1");
    mockGetSocket.mockReturnValue(null as never);
    const { result: resultWithoutSocket } = renderHook(() => useSocket());

    expect(resultWithoutSocket.current.error?.message).toBe("Failed to create socket connection");
  });

  it("connects, reconnects on auth disconnect, and reacts to token polling", async () => {
    localStorage.setItem("accessToken", "token-1");
    const socket1 = createSocket("token-1", false);
    const socket2 = createSocket("token-2", true);
    const socket3 = createSocket("token-3", true);

    mockUseAuth.mockReturnValue({
      user: { id: "doctor-1" },
      isAuthenticated: true,
      isLoading: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      refreshUser: jest.fn(),
    } as never);
    mockGetSocket.mockImplementation((token: string) =>
      token === "token-2"
        ? (socket2 as never)
        : token === "token-3"
          ? (socket3 as never)
          : (socket1 as never),
    );

    const { result } = renderHook(() => useSocket());

    expect(result.current.socket).toBe(socket1);
    expect(result.current.isConnected).toBe(false);

    act(() => {
      socket1.trigger("connect");
    });
    expect(result.current.isConnected).toBe(true);

    localStorage.setItem("accessToken", "token-2");
    act(() => {
      socket1.trigger("disconnect", "io server disconnect");
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => expect(result.current.socket).toBe(socket2));
    expect(result.current.isConnected).toBe(true);

    localStorage.setItem("accessToken", "token-3");
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    await waitFor(() => expect(result.current.socket).toBe(socket3));
    expect(result.current.isConnected).toBe(true);
  });

  it("re-enables reconnection when the same token socket is disconnected", () => {
    localStorage.setItem("accessToken", "token-1");
    const socket = createSocket("token-1", false);

    mockUseAuth.mockReturnValue({
      user: { id: "doctor-1" },
      isAuthenticated: true,
      isLoading: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      refreshUser: jest.fn(),
    } as never);
    mockGetSocket.mockReturnValue(socket as never);

    renderHook(() => useSocket());

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(socket.connect).toHaveBeenCalled();
    expect(socket.io.opts.reconnection).toBe(true);
  });

  it("handles expired token errors by reconnecting with a refreshed token", async () => {
    localStorage.setItem("accessToken", "token-old");
    const socketOld = createSocket("token-old", true);
    const socketNew = createSocket("token-new", true);

    mockUseAuth.mockReturnValue({
      user: { id: "doctor-1" },
      isAuthenticated: true,
      isLoading: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      refreshUser: jest.fn(),
    } as never);
    mockGetSocket.mockImplementation((token: string) =>
      token === "token-new" ? (socketNew as never) : (socketOld as never),
    );

    const { result } = renderHook(() => useSocket());

    localStorage.setItem("accessToken", "token-new");
    act(() => {
      socketOld.trigger("connect_error", new Error("jwt expired"));
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => expect(result.current.socket).toBe(socketNew));
    expect(result.current.error?.message).toContain("jwt expired");
  });
});
