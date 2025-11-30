import { io, Socket } from "socket.io-client";

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000";
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
    socket.disconnect();
    socket.removeAllListeners();
    socket = null;
  }

  // Create new socket connection only if one doesn't exist
  if (!socket) {
    const socketUrlWithNamespace = `${socketUrl}/messages`;
    console.log("🔌 [MOBILE] Creating socket connection", {
      url: socketUrlWithNamespace,
      hasToken: !!token,
      tokenLength: token?.length || 0,
    });

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

    socket.on("connect", () => {
      console.log("🔌 [MOBILE] Socket connected", {
        socketId: socket?.id,
        url: socketUrlWithNamespace,
      });
    });

    socket.on("disconnect", (reason) => {
      console.log("🔌 [MOBILE] Socket disconnected", { reason });
    });

    socket.on("connect_error", (error) => {
      console.error("🔌 [MOBILE] Socket connection error", {
        error: error.message,
        url: socketUrlWithNamespace,
        token: token ? `${token.substring(0, 20)}...` : "no token",
      });
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
    console.log("🔌 [MOBILE] Disconnecting socket intentionally");
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
