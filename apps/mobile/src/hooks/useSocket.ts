import { useEffect, useState, useRef } from "react";
import { Socket } from "socket.io-client";
import { getSocket, disconnectSocket } from "../lib/socket-client";
import { useAuth } from "../contexts/AuthContext";
import { getAccessToken } from "../lib/api";

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

  useEffect(() => {
    if (!isAuthenticated || !user) {
      // Disconnect if not authenticated
      if (socketRef.current) {
        disconnectSocket();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Get access token
    const connectSocket = async () => {
      try {
        const token = await getAccessToken();
        if (!token) {
          setError(new Error("No access token available"));
          return;
        }

        // Get or create socket connection
        const socketInstance = getSocket(token);
        if (!socketInstance) {
          setError(new Error("Failed to create socket connection"));
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

        // Set up event listeners (only once per socket instance)
        const handleConnect = () => {
          setIsConnected(true);
          setError(null);
        };

        const handleDisconnect = () => {
          setIsConnected(false);
        };

        const handleError = (err: Error) => {
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
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to get access token"));
      }
    };

    connectSocket();

    // Cleanup: remove listeners when dependencies change
    return () => {
      if (socketRef.current) {
        socketRef.current.off("connect");
        socketRef.current.off("disconnect");
        socketRef.current.off("connect_error");
      }
    };
  }, [isAuthenticated, user?.id]);

  // Don't disconnect socket on unmount - let it persist
  // The socket singleton will be managed by socket-client.ts
  // Only disconnect on explicit logout or token change

  return { socket, isConnected, error };
};
