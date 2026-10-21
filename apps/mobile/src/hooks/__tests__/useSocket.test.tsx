import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { act, screen, waitFor } from "@testing-library/react";
import { useSocket } from "../useSocket";
import { renderMobile } from "../../../test/render-mobile";
import { useAuth } from "../../contexts/AuthContext";
import { getAccessToken } from "../../lib/api";
import { disconnectSocket, getSocket } from "../../lib/socket-client";

jest.mock("../../contexts/AuthContext", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../../lib/api", () => ({
  getAccessToken: jest.fn(),
}));

jest.mock("../../lib/socket-client", () => ({
  getSocket: jest.fn(),
  disconnectSocket: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockGetAccessToken = getAccessToken as jest.MockedFunction<typeof getAccessToken>;
const mockGetSocket = getSocket as jest.MockedFunction<typeof getSocket>;
const mockDisconnectSocket = disconnectSocket as jest.MockedFunction<typeof disconnectSocket>;

type SocketHandler = (...args: any[]) => void;

const createSocketHarness = (connected: boolean = false) => {
  const handlers = new Map<string, Set<SocketHandler>>();

  const socket = {
    connected,
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
  } as never;

  const trigger = (event: string, payload?: any) => {
    handlers.get(event)?.forEach((handler) => handler(payload));
  };

  return { socket, trigger };
};

function SocketProbe() {
  const state = useSocket();

  return (
    <div>
      <span data-testid="socket-present">{state.socket ? "yes" : "no"}</span>
      <span data-testid="socket-connected">{String(state.isConnected)}</span>
      <span data-testid="socket-error">{state.error?.message ?? "none"}</span>
    </div>
  );
}

describe("useSocket", () => {
  let authState: { user: { id: string } | null; isAuthenticated: boolean };

  beforeEach(() => {
    jest.clearAllMocks();
    authState = {
      user: { id: "patient-1" },
      isAuthenticated: true,
    };

    mockUseAuth.mockImplementation(() => authState as never);
  });

  it("connects with access token and reacts to socket connect/disconnect events", async () => {
    const { socket, trigger } = createSocketHarness(false);

    mockGetAccessToken.mockResolvedValue("token-1");
    mockGetSocket.mockReturnValue(socket);

    renderMobile(<SocketProbe />);

    await waitFor(() => {
      expect(mockGetAccessToken).toHaveBeenCalled();
      expect(mockGetSocket).toHaveBeenCalledWith("token-1");
      expect(screen.getByTestId("socket-present").textContent).toBe("yes");
      expect(screen.getByTestId("socket-connected").textContent).toBe("false");
      expect(screen.getByTestId("socket-error").textContent).toBe("none");
    });

    await act(async () => {
      trigger("connect");
    });

    expect(screen.getByTestId("socket-connected").textContent).toBe("true");

    await act(async () => {
      trigger("disconnect");
    });

    expect(screen.getByTestId("socket-connected").textContent).toBe("false");
  });

  it("sets error when access token is missing", async () => {
    mockGetAccessToken.mockResolvedValue(null);

    renderMobile(<SocketProbe />);

    await waitFor(() => {
      expect(screen.getByTestId("socket-error").textContent).toBe("No access token available");
      expect(mockGetSocket).not.toHaveBeenCalled();
    });
  });

  it("sets error when socket creation fails", async () => {
    mockGetAccessToken.mockResolvedValue("token-2");
    mockGetSocket.mockReturnValue(null);

    renderMobile(<SocketProbe />);

    await waitFor(() => {
      expect(screen.getByTestId("socket-error").textContent).toBe(
        "Failed to create socket connection",
      );
    });
  });

  it("disconnects existing socket when user is no longer authenticated", async () => {
    const { socket } = createSocketHarness(true);

    mockGetAccessToken.mockResolvedValue("token-3");
    mockGetSocket.mockReturnValue(socket);

    const view = renderMobile(<SocketProbe />);

    await waitFor(() => {
      expect(screen.getByTestId("socket-present").textContent).toBe("yes");
    });

    authState = {
      user: null,
      isAuthenticated: false,
    };

    view.rerender(<SocketProbe />);

    await waitFor(() => {
      expect(mockDisconnectSocket).toHaveBeenCalled();
      expect(screen.getByTestId("socket-present").textContent).toBe("no");
      expect(screen.getByTestId("socket-connected").textContent).toBe("false");
    });
  });

  it("captures connect_error events", async () => {
    const { socket, trigger } = createSocketHarness(false);

    mockGetAccessToken.mockResolvedValue("token-4");
    mockGetSocket.mockReturnValue(socket);

    renderMobile(<SocketProbe />);

    await waitFor(() => {
      expect(screen.getByTestId("socket-present").textContent).toBe("yes");
    });

    await act(async () => {
      trigger("connect_error", new Error("socket failed"));
    });

    expect(screen.getByTestId("socket-connected").textContent).toBe("false");
    expect(screen.getByTestId("socket-error").textContent).toBe("socket failed");
  });
});
