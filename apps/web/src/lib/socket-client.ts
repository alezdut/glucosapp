import { io, Socket } from "socket.io-client";
import { isTemporaryMessageError } from "@glucosapp/utils";
import { getWebApiOrigin } from "./env";

const socketUrl = getWebApiOrigin();

let socket: Socket | null = null;

const isAuthError = (message: string): boolean =>
  /expired|jwt|token|unauthorized|forbidden|invalid/i.test(message);

/**
 * Get or create Socket.io connection
 * @param token - JWT access token for authentication
 * @returns Socket instance
 */
export const getSocket = (token: string | null): Socket | null => {
  if (!token) {
    if (socket?.connected) {
      socket.disconnect();
      socket = null;
    }
    return null;
  }

  // If socket exists, check if token matches
  if (socket) {
    const currentToken = socket.io.opts.query?.token as string | undefined;
    if (currentToken === token) {
      // Socket exists with same token
      // If disconnected and token is the same, socket.io will handle reconnection
      return socket;
    }
    // Token changed, disconnect old socket and create new one
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  // Create new socket connection only if one doesn't exist
  if (!socket) {
    // Ensure socketUrl doesn't have trailing slash
    const cleanSocketUrl = socketUrl.replace(/\/$/, "");
    const socketUrlWithNamespace = `${cleanSocketUrl}/messages`;

    socket = io(socketUrlWithNamespace, {
      query: {
        token,
      },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity, // Keep trying to reconnect indefinitely
      // Force path to ensure namespace is used
      path: "/socket.io/",
    });

    socket.on("connect_error", (error) => {
      if (isAuthError(error.message)) {
        console.error("Socket authentication error:", error.message);
      } else if (isTemporaryMessageError(error)) {
        if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
          console.warn("Socket connection degraded:", error.message);
        }
      } else {
        console.error("Socket connection error:", error.message);
      }

      // If token expired, disable auto-reconnection and disconnect
      // The useSocket hook will handle reconnection with new token
      if (socket && isAuthError(error.message)) {
        socket.io.opts.reconnection = false; // Disable auto-reconnection
        socket.disconnect();
      }
    });

    socket.on("disconnect", (reason) => {
      // If disconnected due to authentication error, don't auto-reconnect
      // The useSocket hook will handle reconnection with new token
      if (reason === "io server disconnect") {
        // Check if it was due to auth error by checking if socket is still configured
        // If token expired, useSocket hook will reconnect with new token
      }
    });
  }

  return socket;
};

/**
 * Disconnect socket
 * Only call this when you really want to disconnect (e.g., logout)
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
};

/**
 * Check if socket is connected
 */
export const isSocketConnected = (): boolean => {
  return socket?.connected ?? false;
};
