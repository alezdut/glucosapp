import { io, Socket } from "socket.io-client";
import { isTemporaryMessageError } from "@glucosapp/utils";
import { getMobileApiOrigin } from "./env";

const socketUrl = getMobileApiOrigin();

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
      // Socket exists with same token, return it (even if not connected yet)
      return socket;
    }
    // Token changed, disconnect old socket
    socket.disconnect();
    socket.removeAllListeners();
    socket = null;
  }

  // Create new socket connection only if one doesn't exist
  if (!socket) {
    const socketUrlWithNamespace = `${socketUrl}/messages`;

    socket = io(socketUrlWithNamespace, {
      query: {
        token,
      },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socket.on("connect_error", (error) => {
      if (isAuthError(error.message)) {
        console.error("Socket authentication error:", error.message);
        return;
      }

      if (isTemporaryMessageError(error)) {
        if (typeof __DEV__ !== "undefined" && __DEV__) {
          console.warn("Socket connection degraded:", error.message);
        }
        return;
      }

      console.error("Socket connection error:", error.message);
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
