import { io, Socket } from "socket.io-client";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";
const socketUrl = apiBaseUrl.replace(/\/v1$/, ""); // Remove /v1 if present

let socket: Socket | null = null;

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
      reconnectionAttempts: 5,
      // Force path to ensure namespace is used
      path: "/socket.io/",
    });

    socket.on("connect_error", (error) => {
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
