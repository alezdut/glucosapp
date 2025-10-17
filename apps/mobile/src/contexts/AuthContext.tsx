import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import * as WebBrowser from "expo-web-browser";
import { createApiClient, storeTokens, getAccessToken, clearTokens } from "../lib/api";
import * as Linking from "expo-linking";

// Enable web browser to properly dismiss after auth
WebBrowser.maybeCompleteAuthSession();

// Types
interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  emailVerified: boolean;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  needsOnboarding: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateUserProfile: (firstName: string, lastName: string) => Promise<void>;
  completeOnboarding: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000";

/**
 * AuthProvider component that manages authentication state
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  /**
   * Fetch current user from backend
   */
  const fetchUser = async (): Promise<User | null> => {
    try {
      const client = createApiClient();
      const response = await client.GET("/auth/me", {});

      if (response.data) {
        return response.data as User;
      }
      return null;
    } catch (error) {
      console.error("Failed to fetch user:", error);
      return null;
    }
  };

  /**
   * Refresh user data
   */
  const refreshUser = async () => {
    const userData = await fetchUser();
    setUser(userData);
  };

  /**
   * Check authentication status on mount
   */
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await getAccessToken();
        if (token) {
          const userData = await fetchUser();
          if (userData) {
            setUser(userData);
            // Check if user needs onboarding (no first name or last name)
            if (!userData.firstName || !userData.lastName) {
              setNeedsOnboarding(true);
            }
          } else {
            await clearTokens();
          }
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        await clearTokens();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  /**
   * Handle deep link auth callback
   */
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      try {
        const url = event.url;

        // Check if this is an auth callback (support both glucosapp:// and exp:// schemes)
        if (url.includes("auth/callback")) {
          setIsLoading(true);

          // Parse URL for auth data (tokens will be in query params or hash)
          const urlParams = new URL(url);
          const params = new URLSearchParams(urlParams.search || urlParams.hash.substring(1));

          const accessToken = params.get("accessToken");
          const refreshToken = params.get("refreshToken");
          const userData = params.get("user");

          if (accessToken && refreshToken && userData) {
            // Store tokens
            await storeTokens(accessToken, refreshToken);

            // Parse and set user
            // TODO: Check if userData is already parsed
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);

            // Check if user needs onboarding
            if (!parsedUser.firstName || !parsedUser.lastName) {
              setNeedsOnboarding(true);
            }
          }

          setIsLoading(false);
        }
      } catch (error) {
        console.error("Deep link handling error:", error);
        setIsLoading(false);
      }
    };

    // Add deep link listener
    const subscription = Linking.addEventListener("url", handleDeepLink);

    // Check if app was opened with a URL
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  /**
   * Sign in with Google
   */
  const signInWithGoogle = async () => {
    try {
      setIsLoading(true);

      // Use custom scheme for better iOS compatibility
      const redirectUrl = "glucosapp://auth/callback";
      console.log("Redirect URL:", redirectUrl);

      // Pass redirect URL to backend so it knows where to redirect
      const authUrl = `${API_BASE_URL}/v1/auth/google/mobile?redirect_uri=${encodeURIComponent(redirectUrl)}`;
      console.log("Auth URL:", authUrl);

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
      console.log("Auth result:", result);

      if (result.type === "success" && result.url) {
        // Parse the callback URL for tokens
        const urlParams = new URL(result.url);
        const params = new URLSearchParams(urlParams.search || urlParams.hash.substring(1));

        const accessToken = params.get("accessToken");
        const refreshToken = params.get("refreshToken");
        const userData = params.get("user");

        console.log("Tokens received:", {
          accessToken: !!accessToken,
          refreshToken: !!refreshToken,
          userData: !!userData,
        });

        if (accessToken && refreshToken && userData) {
          // Store tokens
          await storeTokens(accessToken, refreshToken);

          // Parse and set user
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);

          // Check if user needs onboarding
          if (!parsedUser.firstName || !parsedUser.lastName) {
            setNeedsOnboarding(true);
          }
        }
      }
    } catch (error) {
      console.error("Sign in failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Sign out
   */
  const signOut = async () => {
    try {
      setIsLoading(true);

      // Call logout endpoint
      const client = createApiClient();
      await client.POST("/auth/logout", {});

      // Clear local tokens
      await clearTokens();

      // Clear user state
      setUser(null);
      setNeedsOnboarding(false);
    } catch (error) {
      console.error("Sign out failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Update user profile
   */
  const updateUserProfile = async (firstName: string, lastName: string) => {
    try {
      setIsLoading(true);

      const client = createApiClient();
      // TODO: Implement update profile endpoint in backend
      // For now, we'll just update locally

      if (user) {
        setUser({
          ...user,
          firstName,
          lastName,
        });
      }
    } catch (error) {
      console.error("Profile update failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Complete onboarding
   */
  const completeOnboarding = () => {
    setNeedsOnboarding(false);
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    needsOnboarding,
    signInWithGoogle,
    signOut,
    updateUserProfile,
    completeOnboarding,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use auth context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
