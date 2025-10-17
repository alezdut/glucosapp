import { makeApiClient } from "@glucosapp/api-client";
import * as SecureStore from "expo-secure-store";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000";

// Token storage keys
const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

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
 * Create API client with automatic token injection
 */
export function createApiClient() {
  const { client } = makeApiClient(`${API_BASE_URL}/v1`);

  // Create a wrapper that automatically adds auth headers
  const authenticatedClient = {
    ...client,
    GET: async (path: string, init?: Record<string, unknown>) => {
      const accessToken = await getAccessToken();
      const headers = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(init as any)?.headers,
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      };
      return client.GET(path, { ...init, headers });
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    POST: async (path: string, body?: any, init?: RequestInit) => {
      const accessToken = await getAccessToken();
      const headers = {
        ...init?.headers,
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      };
      return client.POST(path, body, { ...init, headers });
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    PATCH: async (path: string, body?: any, init?: RequestInit) => {
      const accessToken = await getAccessToken();
      const headers = {
        ...init?.headers,
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      };
      return client.PATCH(path, body, { ...init, headers });
    },
  };

  return authenticatedClient;
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(): Promise<{
  accessToken: string;
  refreshToken: string;
} | null> {
  try {
    const currentRefreshToken = await getRefreshToken();
    if (!currentRefreshToken) {
      return null;
    }

    const { client } = makeApiClient(`${API_BASE_URL}/v1`);
    const response = await client.POST("/auth/refresh", {
      body: { refreshToken: currentRefreshToken },
    });

    if (response.data) {
      const { accessToken, refreshToken } = response.data;
      await storeTokens(accessToken, refreshToken);
      return { accessToken, refreshToken };
    }

    return null;
  } catch (error) {
    console.error("Failed to refresh token:", error);
    return null;
  }
}
