import { makeApiClient, type ApiClientError } from "@glucosapp/api-client";
import { isTokenExpiringSoon } from "@glucosapp/auth-utils";
import { throwApiError } from "@glucosapp/utils";
import * as SecureStore from "expo-secure-store";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000";

// Token storage keys
const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<{ accessToken: string; refreshToken: string } | null> | null = null;

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
      const response = await client.POST<{ accessToken: string; refreshToken: string }>(
        "/auth/refresh",
        {
          refreshToken: currentRefreshToken,
        },
      );

      if (response.data) {
        const { accessToken, refreshToken } = response.data;
        await storeTokens(accessToken, refreshToken);
        return { accessToken, refreshToken };
      }

      // If refresh fails, clear tokens only for certain errors
      if (response.error) {
        console.error("Token refresh failed:", response.error);
        // Only clear tokens for 401/403 errors (invalid token), not for network/server errors
        const status = (response.error as { status?: number })?.status;
        if (status === 401 || status === 403) {
          await clearTokens();
        }
      }

      return null;
    } catch (error) {
      console.error("Failed to refresh token:", error);
      // Don't clear tokens on network/server errors, only on auth errors
      if (error instanceof Error && error.message.includes("401")) {
        await clearTokens();
      }
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
type ApiError = ApiClientError | Error | unknown;
type RequestBody = BodyInit | object | null | undefined;

type AuthenticatedHeaders = Record<string, string>;
type GetRequestOptions = Record<string, unknown> & {
  headers?: AuthenticatedHeaders;
};
type MutationRequestOptions = RequestInit & {
  headers?: HeadersInit;
};

const getRequestHeaders = (
  headers: HeadersInit | AuthenticatedHeaders | undefined,
  accessToken: string | null,
): AuthenticatedHeaders => ({
  ...((headers as AuthenticatedHeaders | undefined) ?? {}),
  ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
});

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
      const refreshResult = await refreshAccessToken();

      if (refreshResult) {
        // Retry the request with the new token
        response = await retryFn();
      }
    }

    return response;
  };

  // Create a wrapper that automatically adds auth headers and handles token refresh
  const authenticatedClient = {
    ...client,
    GET: async <T = unknown>(path: string, init?: GetRequestOptions) => {
      return executeWithAuth(
        async () => {
          const accessToken = await getAccessToken();
          const headers = getRequestHeaders(init?.headers, accessToken);
          return client.GET<T>(path, { ...init, headers });
        },
        async () => {
          const accessToken = await getAccessToken();
          const headers = getRequestHeaders(init?.headers, accessToken);
          return client.GET<T>(path, { ...init, headers });
        },
        path,
      );
    },
    POST: async <TResponse = unknown, TBody extends RequestBody = RequestBody>(
      path: string,
      body?: TBody,
      init?: MutationRequestOptions,
    ): Promise<{ data?: TResponse; error?: ApiError }> => {
      return executeWithAuth<TResponse>(
        async () => {
          const accessToken = await getAccessToken();
          const headers = getRequestHeaders(init?.headers, accessToken);
          return client.POST<TResponse>(path, body, { ...init, headers });
        },
        async () => {
          const accessToken = await getAccessToken();
          const headers = getRequestHeaders(init?.headers, accessToken);
          return client.POST<TResponse>(path, body, { ...init, headers });
        },
        path,
      );
    },
    PATCH: async <TResponse = unknown, TBody extends RequestBody = RequestBody>(
      path: string,
      body?: TBody,
      init?: MutationRequestOptions,
    ): Promise<{ data?: TResponse; error?: ApiError }> => {
      return executeWithAuth<TResponse>(
        async () => {
          const accessToken = await getAccessToken();
          const headers = getRequestHeaders(init?.headers, accessToken);
          return client.PATCH<TResponse>(path, body, { ...init, headers });
        },
        async () => {
          const accessToken = await getAccessToken();
          const headers = getRequestHeaders(init?.headers, accessToken);
          return client.PATCH<TResponse>(path, body, { ...init, headers });
        },
        path,
      );
    },
    PUT: async <TResponse = unknown, TBody extends RequestBody = RequestBody>(
      path: string,
      body?: TBody,
      init?: MutationRequestOptions,
    ): Promise<{ data?: TResponse; error?: ApiError }> => {
      return executeWithAuth<TResponse>(
        async () => {
          const accessToken = await getAccessToken();
          const headers = getRequestHeaders(init?.headers, accessToken);
          return client.PUT<TResponse>(path, body, { ...init, headers });
        },
        async () => {
          const accessToken = await getAccessToken();
          const headers = getRequestHeaders(init?.headers, accessToken);
          return client.PUT<TResponse>(path, body, { ...init, headers });
        },
        path,
      );
    },
    DELETE: async (path: string, init?: MutationRequestOptions) => {
      return executeWithAuth(
        async () => {
          const accessToken = await getAccessToken();
          const headers = getRequestHeaders(init?.headers, accessToken);
          return client.DELETE(path, { ...init, headers });
        },
        async () => {
          const accessToken = await getAccessToken();
          const headers = getRequestHeaders(init?.headers, accessToken);
          return client.DELETE(path, { ...init, headers });
        },
        path,
      );
    },
  };

  return authenticatedClient;
}

/**
 * Get doctor assigned to the current patient
 */
export interface AssignedDoctor {
  id: string;
  doctorId: string;
  patientId: string;
  createdAt: string;
  doctor: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
  };
}

export async function getAssignedDoctor(): Promise<AssignedDoctor | null> {
  const client = createApiClient();
  const response = await client.GET<AssignedDoctor | null>("/profile/doctor");

  if (response.error) {
    throwApiError(response.error, "Failed to fetch assigned doctor");
  }

  return response.data ?? null;
}

/**
 * Mark multiple messages as read (batch operation)
 */
export async function markMessagesAsReadBatch(
  messageIds: string[],
): Promise<{ count: number; messageIds: string[] }> {
  const client = createApiClient();
  const response = await client.POST("/messages/mark-read-batch", { messageIds });

  if (response.error) {
    throwApiError(response.error, "Failed to mark messages as read");
  }

  if (!response.data) {
    throw new Error("No data returned from mark-read-batch endpoint");
  }

  return response.data as { count: number; messageIds: string[] };
}

export async function registerPushToken(input: {
  expoPushToken: string;
  platform: string;
  deviceId?: string;
}): Promise<void> {
  const client = createApiClient();
  const response = await client.POST("/push/register", input);

  if (response.error) {
    throwApiError(response.error, "Failed to register push token");
  }
}

export async function unregisterPushToken(expoPushToken: string): Promise<void> {
  const client = createApiClient();
  const response = await client.POST("/push/unregister", { expoPushToken });

  if (response.error) {
    throwApiError(response.error, "Failed to unregister push token");
  }
}
