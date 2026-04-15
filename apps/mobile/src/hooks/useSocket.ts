import { useEffect, useState, useRef, useCallback } from "react";
import { Socket } from "socket.io-client";
import { getSocket, disconnectSocket } from "../lib/socket-client";
import { useAuth } from "../contexts/AuthContext";
import { getAccessToken } from "../lib/api";

export type SocketConnectionState =
  | "connected"
  | "connecting"
  | "degraded"
  | "offline"
  | "auth_error";

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  error: Error | null;
  connectionState: SocketConnectionState;
}

const isAuthError = (message: string): boolean =>
  /expired|jwt|token|unauthorized|forbidden|invalid/i.test(message);

const isOfflineError = (message: string): boolean =>
  /network|offline|timeout|closed|unavailable/i.test(message);

/**
 * Hook to manage Socket.io connection
 * Automatically connects/disconnects based on authentication state
 */
export const useSocket = (): UseSocketReturn => {
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id ?? null;
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [connectionState, setConnectionState] = useState<SocketConnectionState>("connecting");
  const socketRef = useRef<Socket | null>(null);

  // Stable handler functions using useCallback
  const handleConnect = useCallback(() => {
    setIsConnected(true);
    setError(null);
    setConnectionState("connected");
  }, []);

  const handleDisconnect = useCallback(() => {
    setIsConnected(false);
    setConnectionState("offline");
  }, []);

  const handleError = useCallback((err: Error) => {
    setError(err);
    setIsConnected(false);
    if (isAuthError(err.message)) {
      setConnectionState("auth_error");
      return;
    }
    setConnectionState(isOfflineError(err.message) ? "offline" : "degraded");
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      // Disconnect if not authenticated
      if (socketRef.current) {
        disconnectSocket();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
        setConnectionState("offline");
      }
      return;
    }

    // Get access token
    const connectSocket = async () => {
      try {
        const token = await getAccessToken();
        if (!token) {
          setError(new Error("No access token available"));
          setConnectionState("auth_error");
          return;
        }

        // Get or create socket connection
        const socketInstance = getSocket(token);
        if (!socketInstance) {
          setError(new Error("Failed to create socket connection"));
          setConnectionState("degraded");
          return;
        }

        // Only update ref and state if socket changed
        if (socketRef.current !== socketInstance) {
          socketRef.current = socketInstance;
          setSocket(socketInstance);
          setIsConnected(socketInstance.connected);
        } else {
          // Socket already exists, just update connected state
          setIsConnected(socketInstance.connected);
        }

        setConnectionState(socketInstance.connected ? "connected" : "connecting");

        // Remove old listeners before adding new ones (using stable handlers)
        socketInstance.off("connect", handleConnect);
        socketInstance.off("disconnect", handleDisconnect);
        socketInstance.off("connect_error", handleError);

        // Register event listeners with stable handler functions
        socketInstance.on("connect", handleConnect);
        socketInstance.on("disconnect", handleDisconnect);
        socketInstance.on("connect_error", handleError);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to get access token"));
        setConnectionState("auth_error");
      }
    };

    connectSocket();

    // Cleanup: remove only the specific handlers registered by this hook
    return () => {
      if (socketRef.current) {
        socketRef.current.off("connect", handleConnect);
        socketRef.current.off("disconnect", handleDisconnect);
        socketRef.current.off("connect_error", handleError);
      }
    };
  }, [isAuthenticated, userId, handleConnect, handleDisconnect, handleError]);

  // Don't disconnect socket on unmount - let it persist
  // The socket singleton will be managed by socket-client.ts
  // Only disconnect on explicit logout or token change

  return { socket, isConnected, error, connectionState };
};
