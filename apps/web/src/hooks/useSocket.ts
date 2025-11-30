"use client";

import { useEffect, useState, useRef } from "react";
import { Socket } from "socket.io-client";
import { getSocket, disconnectSocket, isSocketConnected } from "@/lib/socket-client";
import { useAuth } from "@/contexts/auth-context";

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  error: Error | null;
}

/**
 * Hook to manage Socket.io connection
 * Automatically connects/disconnects based on authentication state
 */
export const useSocket = (): UseSocketReturn => {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      // Disconnect if not authenticated
      if (socketRef.current) {
        disconnectSocket();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      tokenRef.current = null;
      return;
    }

    // Get access token from localStorage
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

    if (!token) {
      setError(new Error("No access token available"));
      setIsConnected(false);
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

    // Set up event listeners (only once per socket instance)
    const handleConnect = () => {
      setIsConnected(true);
      setError(null);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleError = (err: Error) => {
      console.error("Socket connection error:", err.message);
      setError(err);
      setIsConnected(false);
    };

    // Remove old listeners before adding new ones
    socketInstance.off("connect", handleConnect);
    socketInstance.off("disconnect", handleDisconnect);
    socketInstance.off("connect_error", handleError);

    socketInstance.on("connect", handleConnect);
    socketInstance.on("disconnect", handleDisconnect);
    socketInstance.on("connect_error", handleError);

    // Cleanup: remove listeners when dependencies change
    return () => {
      if (socketInstance) {
        socketInstance.off("connect", handleConnect);
        socketInstance.off("disconnect", handleDisconnect);
        socketInstance.off("connect_error", handleError);
      }
    };
  }, [isAuthenticated, user?.id]);

  // Poll for token changes (token refresh happens in same tab, so storage event won't fire)
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const checkTokenChange = () => {
      const currentToken =
        typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
      if (currentToken && currentToken !== tokenRef.current) {
        tokenRef.current = currentToken;
        const socketInstance = getSocket(currentToken);
        if (socketInstance && socketInstance !== socketRef.current) {
          socketRef.current = socketInstance;
          setSocket(socketInstance);
          setIsConnected(socketInstance.connected);
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
  }, [isAuthenticated, user?.id]);

  // Don't disconnect socket on unmount - let it persist
  // The socket singleton will be managed by socket-client.ts
  // Only disconnect on explicit logout or token change

  return { socket, isConnected, error };
};
