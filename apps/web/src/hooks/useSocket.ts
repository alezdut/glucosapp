"use client";

import { useEffect, useState, useRef } from "react";
import { Socket } from "socket.io-client";
import { getSocket, disconnectSocket } from "@/lib/socket-client";
import { useAuth } from "@/contexts/auth-context";

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
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [connectionState, setConnectionState] = useState<SocketConnectionState>("connecting");
  const socketRef = useRef<Socket | null>(null);
  const tokenRef = useRef<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      // Disconnect if not authenticated
      if (socketRef.current) {
        disconnectSocket();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
        setConnectionState("offline");
      }
      tokenRef.current = null;
      return;
    }

    // Get access token from localStorage
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

    if (!token) {
      setError(new Error("No access token available"));
      setIsConnected(false);
      setConnectionState("auth_error");
      tokenRef.current = null;
      return;
    }

    // Check if token changed
    if (tokenRef.current !== token) {
      tokenRef.current = token;
    }

    // Get or create socket connection
    const socketInstance = getSocket(token);
    if (!socketInstance) {
      setError(new Error("Failed to create socket connection"));
      setIsConnected(false);
      setConnectionState("degraded");
      return;
    }

    // Always update socket state (socket might have changed if token was refreshed)
    if (socketRef.current !== socketInstance) {
      socketRef.current = socketInstance;
      setSocket(socketInstance);
      setIsConnected(socketInstance.connected);
    } else {
      setIsConnected(socketInstance.connected);
    }

    setConnectionState(socketInstance.connected ? "connected" : "connecting");

    // Set up event listeners (only once per socket instance)
    const handleConnect = () => {
      setIsConnected(true);
      setError(null);
      setConnectionState("connected");
    };

    const handleDisconnect = (reason: string) => {
      setIsConnected(false);
      setConnectionState(reason === "io server disconnect" ? "auth_error" : "offline");

      // If disconnected due to authentication error, try to reconnect with fresh token
      if (reason === "io server disconnect") {
        const freshToken =
          typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
        if (freshToken) {
          // Clear any existing timeout before creating a new one
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          // Try to reconnect with fresh token after a delay
          reconnectTimeoutRef.current = setTimeout(() => {
            const newSocket = getSocket(freshToken);
            if (newSocket && newSocket !== socketInstance) {
              socketRef.current = newSocket;
              setSocket(newSocket);
              setIsConnected(newSocket.connected);
            }
            reconnectTimeoutRef.current = null;
          }, 1000);
        }
      }
    };

    const handleError = (err: Error) => {
      setError(err);
      setIsConnected(false);
      if (isAuthError(err.message)) {
        setConnectionState("auth_error");
      } else {
        setConnectionState(isOfflineError(err.message) ? "offline" : "degraded");
      }

      // If token expired, try to reconnect with fresh token
      if (isAuthError(err.message)) {
        const freshToken =
          typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
        if (freshToken && freshToken !== token) {
          // Clear any existing timeout before creating a new one
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          // Token was refreshed, reconnect with new token
          reconnectTimeoutRef.current = setTimeout(() => {
            const newSocket = getSocket(freshToken);
            if (newSocket && newSocket !== socketInstance) {
              socketRef.current = newSocket;
              setSocket(newSocket);
              setIsConnected(newSocket.connected);
            }
            reconnectTimeoutRef.current = null;
          }, 1000);
        }
      }
    };

    // Remove old listeners before adding new ones
    socketInstance.off("connect", handleConnect);
    socketInstance.off("disconnect", handleDisconnect);
    socketInstance.off("connect_error", handleError);

    socketInstance.on("connect", handleConnect);
    socketInstance.on("disconnect", handleDisconnect);
    socketInstance.on("connect_error", handleError);

    // Cleanup: remove listeners and clear timeouts when dependencies change
    return () => {
      if (socketInstance) {
        socketInstance.off("connect", handleConnect);
        socketInstance.off("disconnect", handleDisconnect);
        socketInstance.off("connect_error", handleError);
      }
      // Clear any pending reconnection timeout to prevent state updates after unmount
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [isAuthenticated, user]);

  // Poll for token changes and handle reconnection (token refresh happens in same tab, so storage event won't fire)
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const checkTokenChange = () => {
      const currentToken =
        typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

      if (!currentToken) {
        return;
      }

      // If token changed, reconnect socket
      if (currentToken !== tokenRef.current) {
        tokenRef.current = currentToken;

        // Get new socket with fresh token
        const socketInstance = getSocket(currentToken);
        if (socketInstance && socketInstance !== socketRef.current) {
          // Update socket reference
          socketRef.current = socketInstance;
          setSocket(socketInstance);
          setIsConnected(socketInstance.connected);
        }
      } else if (socketRef.current && !socketRef.current.connected) {
        // If socket exists but is disconnected, check if token changed
        // This handles cases where socket disconnected due to expired token
        const currentSocketToken = socketRef.current.io.opts.query?.token as string | undefined;
        if (currentSocketToken !== currentToken) {
          // Token changed, get new socket with fresh token
          const socketInstance = getSocket(currentToken);
          if (socketInstance && socketInstance !== socketRef.current) {
            socketRef.current = socketInstance;
            setSocket(socketInstance);
            setIsConnected(socketInstance.connected);
          }
        } else {
          // Same token but disconnected, re-enable reconnection
          if (socketRef.current.io.opts.reconnection === false) {
            socketRef.current.io.opts.reconnection = true;
            socketRef.current.connect();
          }
        }
      }
    };

    // Check immediately
    checkTokenChange();

    // Check every 2 seconds (token refresh typically happens every few minutes)
    const interval = setInterval(checkTokenChange, 2000);

    return () => {
      clearInterval(interval);
    };
  }, [isAuthenticated, user]);

  // Don't disconnect socket on unmount - let it persist
  // The socket singleton will be managed by socket-client.ts
  // Only disconnect on explicit logout or token change

  return { socket, isConnected, error, connectionState };
};
