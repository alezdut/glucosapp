import { makeApiClient } from "@glucosapp/api-client";
import * as SecureStore from "expo-secure-store";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000";

// Token storage keys
const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<{ accessToken: string; refreshToken: string } | null> | null = null;

/**
 * Decode JWT to get expiration time
 */
const getTokenExpiration = (token: string): number | null => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
};

/**
 * Check if token is expired or about to expire
 */
const isTokenExpiringSoon = (token: string): boolean => {
  const expiration = getTokenExpiration(token);
  if (!expiration) return true;

  const now = Date.now();
  const timeUntilExpiry = expiration - now;
  const oneMinute = 60 * 1000;

  // Consider token expiring if it expires in less than 1 minute
  return timeUntilExpiry < oneMinute;
};

/**
 * Store authentication tokens securely
 */
export async function storeTokens(accessToken: string, refreshToken: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
}

/**
 * Retrieve access token from secure storage
 */
export async function getAccessToken(): Promise<string | null> {
  const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  return token;
}

/**
 * Retrieve refresh token from secure storage
 */
export async function getRefreshToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

/**
 * Clear all authentication tokens
 */
export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

/**
 * Refresh access token using refresh token
 * Uses a singleton pattern to prevent multiple simultaneous refresh attempts
 */
export async function refreshAccessToken(): Promise<{
  accessToken: string;
  refreshToken: string;
} | null> {
  // If already refreshing, wait for the existing refresh to complete
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const currentRefreshToken = await getRefreshToken();
      if (!currentRefreshToken) {
        return null;
      }

      const { client } = makeApiClient(`${API_BASE_URL}/v1`);
      const response = await client.POST("/auth/refresh", {
        refreshToken: currentRefreshToken,
      });

      if (response.data) {
        const { accessToken, refreshToken } = response.data;
        await storeTokens(accessToken, refreshToken);
        return { accessToken, refreshToken };
      }

      // If refresh fails, clear tokens
      if (response.error) {
        console.error("Token refresh failed:", response.error);
        await clearTokens();
      }

      return null;
    } catch (error) {
      console.error("Failed to refresh token:", error);
      await clearTokens();
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Refresh token proactively if it's about to expire
 */
const refreshTokenIfNeeded = async (): Promise<boolean> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return false;

  if (isTokenExpiringSoon(accessToken)) {
    const result = await refreshAccessToken();
    return result !== null;
  }

  return true;
};

/**
 * Type for API error responses
 * Can be an HTTP error with status and message, or a caught error
 */
type ApiError =
  | {
      status: number;
      message: string;
    }
  | Error
  | unknown;

/**
 * Create API client with automatic token injection and refresh handling
 */
export function createApiClient() {
  const { client } = makeApiClient(`${API_BASE_URL}/v1`);

  /**
   * Execute a request with automatic token refresh on 401 errors
   */
  const executeWithAuth = async <T>(
    executeFn: () => Promise<{ data?: T; error?: ApiError }>,
    retryFn: () => Promise<{ data?: T; error?: ApiError }>,
    path: string,
  ): Promise<{ data?: T; error?: ApiError }> => {
    // Skip token refresh for auth endpoints
    const isAuthEndpoint =
      path.startsWith("/auth/refresh") ||
      path.startsWith("/auth/login") ||
      path.startsWith("/auth/register");

    if (isAuthEndpoint) {
      return executeFn();
    }

    // First, refresh token proactively if needed
    await refreshTokenIfNeeded();

    // Execute the request
    let response = await executeFn();

    // If we get a 401, try to refresh the token and retry once
    if (
      response.error &&
      typeof response.error === "object" &&
      "status" in response.error &&
      response.error.status === 401
    ) {
      console.log("Received 401, attempting to refresh token...");
      const refreshResult = await refreshAccessToken();

      if (refreshResult) {
        // Retry the request with the new token
        response = await retryFn();
      } else {
        // Refresh failed, clear tokens
        console.error("Token refresh failed, clearing tokens");
        await clearTokens();
      }
    }

    return response;
  };

  // Create a wrapper that automatically adds auth headers and handles token refresh
  const authenticatedClient = {
    ...client,
    GET: async (path: string, init?: Record<string, unknown>) => {
      return executeWithAuth(
        async () => {
          const accessToken = await getAccessToken();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const headers: Record<string, string> = {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...((init as any)?.headers as Record<string, string>),
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          };
          return client.GET(path, { ...init, headers });
        },
        async () => {
          const accessToken = await getAccessToken();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const headers: Record<string, string> = {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...((init as any)?.headers as Record<string, string>),
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          };
          return client.GET(path, { ...init, headers });
        },
        path,
      );
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    POST: async (path: string, body?: any, init?: RequestInit) => {
      return executeWithAuth(
        async () => {
          const accessToken = await getAccessToken();
          const headers: Record<string, string> = {
            ...((init?.headers as Record<string, string>) || {}),
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          };
          return client.POST(path, body, { ...init, headers });
        },
        async () => {
          const accessToken = await getAccessToken();
          const headers: Record<string, string> = {
            ...((init?.headers as Record<string, string>) || {}),
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          };
          return client.POST(path, body, { ...init, headers });
        },
        path,
      );
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    PATCH: async (path: string, body?: any, init?: RequestInit) => {
      return executeWithAuth(
        async () => {
          const accessToken = await getAccessToken();
          const headers: Record<string, string> = {
            ...((init?.headers as Record<string, string>) || {}),
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          };
          return client.PATCH(path, body, { ...init, headers });
        },
        async () => {
          const accessToken = await getAccessToken();
          const headers: Record<string, string> = {
            ...((init?.headers as Record<string, string>) || {}),
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          };
          return client.PATCH(path, body, { ...init, headers });
        },
        path,
      );
    },
  };

  return authenticatedClient;
}
