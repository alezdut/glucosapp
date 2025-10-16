import { makeApiClient } from "@glucosapp/api-client";
import { AuthResponse, User } from "@glucosapp/types";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";
const { client } = makeApiClient(`${apiBaseUrl}/v1`);

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginData {
  email: string;
  password: string;
}

/**
 * Register a new user
 */
export async function register(data: RegisterData): Promise<{ message: string }> {
  const response = await client.POST<{ message: string }>("/auth/register", data);
  if (response.error) {
    throw new Error(response.error.message || "Registration failed");
  }
  return response.data!;
}

/**
 * Login with email and password
 */
export async function login(data: LoginData): Promise<AuthResponse> {
  const response = await client.POST<AuthResponse>("/auth/login", data);
  if (response.error) {
    throw new Error(response.error.message || "Login failed");
  }
  return response.data!;
}

/**
 * Get current user information
 */
export async function getCurrentUser(accessToken: string): Promise<User> {
  const response = await client.GET<User>("/auth/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (response.error) {
    throw new Error(response.error.message || "Failed to fetch user");
  }
  return response.data!;
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const response = await client.POST<{ accessToken: string; refreshToken: string }>(
    "/auth/refresh",
    { refreshToken },
  );
  if (response.error) {
    throw new Error(response.error.message || "Failed to refresh token");
  }
  return response.data!;
}

/**
 * Logout user
 */
export async function logout(accessToken: string, refreshToken: string): Promise<void> {
  await client.POST(
    "/auth/logout",
    { refreshToken },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
}

/**
 * Verify email with token
 */
export async function verifyEmail(token: string): Promise<{ message: string }> {
  const response = await client.POST<{ message: string }>("/auth/verify-email", { token });
  if (response.error) {
    throw new Error(response.error.message || "Email verification failed");
  }
  return response.data!;
}

/**
 * Resend verification email
 */
export async function resendVerification(email: string): Promise<{ message: string }> {
  const response = await client.POST<{ message: string }>("/auth/resend-verification", {
    email,
  });
  if (response.error) {
    throw new Error(response.error.message || "Failed to resend verification");
  }
  return response.data!;
}

/**
 * Request password reset email
 */
export async function forgotPassword(email: string): Promise<{ message: string }> {
  const response = await client.POST<{ message: string }>("/auth/forgot-password", { email });
  if (response.error) {
    throw new Error(response.error.message || "Failed to send password reset email");
  }
  return response.data!;
}

/**
 * Reset password with token
 */
export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<{ message: string }> {
  const response = await client.POST<{ message: string }>("/auth/reset-password", {
    token,
    newPassword,
  });
  if (response.error) {
    throw new Error(response.error.message || "Password reset failed");
  }
  return response.data!;
}
