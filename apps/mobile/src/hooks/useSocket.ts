import { useEffect, useState, useRef, useCallback } from "react";
import { Socket } from "socket.io-client";
import { getSocket, disconnectSocket } from "../lib/socket-client";
import { useAuth } from "../contexts/AuthContext";
import { getAccessToken, refreshAccessToken } from "../lib/api";

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

const MAX_AUTH_REFRESH_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;
const RETRY_MAX_DELAY_MS = 8000;

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
  const [authRetryNonce, setAuthRetryNonce] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const hasTriedTokenRefreshRef = useRef(false);
  const authRefreshRetryCountRef = useRef(0);
  const authRefreshRetryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAuthRetryTimeout = useCallback(() => {
    if (authRefreshRetryTimeoutRef.current) {
      clearTimeout(authRefreshRetryTimeoutRef.current);
      authRefreshRetryTimeoutRef.current = null;
    }
  }, []);

  const scheduleRefreshRetry = useCallback(() => {
    if (authRefreshRetryCountRef.current >= MAX_AUTH_REFRESH_RETRIES) {
      return;
    }

    clearAuthRetryTimeout();

    const retryCount = authRefreshRetryCountRef.current;
    const delay = Math.min(RETRY_BASE_DELAY_MS * 2 ** retryCount, RETRY_MAX_DELAY_MS);

    authRefreshRetryTimeoutRef.current = setTimeout(async () => {
      authRefreshRetryTimeoutRef.current = null;
      let shouldRetry = true;

      try {
        const refreshedTokens = await refreshAccessToken();
        if (refreshedTokens?.accessToken) {
          authRefreshRetryCountRef.current = 0;
          hasTriedTokenRefreshRef.current = false;
          shouldRetry = false;
          setAuthRetryNonce((value) => value + 1);
          return;
        }
      } catch {
        // Fall through to schedule the next retry.
      } finally {
        if (shouldRetry) {
          authRefreshRetryCountRef.current += 1;
        }

        if (shouldRetry && authRefreshRetryCountRef.current < MAX_AUTH_REFRESH_RETRIES) {
          scheduleRefreshRetry();
        }
      }
    }, delay);
  }, [clearAuthRetryTimeout]);

  // Stable handler functions using useCallback
  const handleConnect = useCallback(() => {
    setIsConnected(true);
    setError(null);
    setConnectionState("connected");
    clearAuthRetryTimeout();
    authRefreshRetryCountRef.current = 0;
    hasTriedTokenRefreshRef.current = false;
  }, [clearAuthRetryTimeout]);

  const handleDisconnect = useCallback(() => {
    setIsConnected(false);
    setConnectionState("offline");
  }, []);

  const handleError = useCallback(
    (err: Error) => {
      setError(err);
      setIsConnected(false);

      if (isAuthError(err.message)) {
        setConnectionState("auth_error");

        if (hasTriedTokenRefreshRef.current) {
          if (authRefreshRetryCountRef.current < MAX_AUTH_REFRESH_RETRIES) {
            scheduleRefreshRetry();
          }
          return;
        }

        hasTriedTokenRefreshRef.current = true;
        void refreshAccessToken().then((refreshedTokens) => {
          if (refreshedTokens?.accessToken) {
            authRefreshRetryCountRef.current = 0;
            hasTriedTokenRefreshRef.current = false;
            setAuthRetryNonce((value) => value + 1);
            return;
          }

          authRefreshRetryCountRef.current = 1;
          scheduleRefreshRetry();
        });

        return;
      }

      setConnectionState(isOfflineError(err.message) ? "offline" : "degraded");
    },
    [scheduleRefreshRetry],
  );

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      clearAuthRetryTimeout();
      hasTriedTokenRefreshRef.current = false;
      authRefreshRetryCountRef.current = 0;

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
      clearAuthRetryTimeout();
      if (socketRef.current) {
        socketRef.current.off("connect", handleConnect);
        socketRef.current.off("disconnect", handleDisconnect);
        socketRef.current.off("connect_error", handleError);
      }
    };
  }, [
    isAuthenticated,
    userId,
    authRetryNonce,
    handleConnect,
    handleDisconnect,
    handleError,
    clearAuthRetryTimeout,
  ]);

  // Don't disconnect socket on unmount - let it persist
  // The socket singleton will be managed by socket-client.ts
  // Only disconnect on explicit logout or token change

  return { socket, isConnected, error, connectionState };
};
