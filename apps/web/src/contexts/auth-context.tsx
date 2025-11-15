"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "@glucosapp/types";
import * as authApi from "@/lib/auth-api";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Hook to access auth context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Auth provider component that manages authentication state
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Get tokens from localStorage
   */
  const getTokens = () => {
    if (typeof window === "undefined") return { accessToken: null, refreshToken: null };
    return {
      accessToken: localStorage.getItem("accessToken"),
      refreshToken: localStorage.getItem("refreshToken"),
    };
  };

  /**
   * Store tokens in localStorage
   */
  const setTokens = (accessToken: string, refreshToken: string) => {
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
  };

  /**
   * Clear tokens from localStorage
   */
  const clearTokens = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  };

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
   * Refresh access token if needed
   */
  const refreshTokenIfNeeded = async () => {
    const { accessToken, refreshToken } = getTokens();
    if (!accessToken || !refreshToken) return false;

    const expiration = getTokenExpiration(accessToken);
    if (!expiration) return false;

    const now = Date.now();
    const timeUntilExpiry = expiration - now;
    const oneMinute = 60 * 1000;

    // Refresh if token expires in less than 1 minute
    if (timeUntilExpiry < oneMinute) {
      try {
        const tokens = await authApi.refreshAccessToken(refreshToken);
        setTokens(tokens.accessToken, tokens.refreshToken);
        return true;
      } catch (error) {
        clearTokens();
        setUser(null);
        return false;
      }
    }
    return true;
  };

  /**
   * Fetch current user from API
   */
  const fetchCurrentUser = async () => {
    let { accessToken } = getTokens();
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    try {
      // Refresh token if needed and re-read to get fresh token
      await refreshTokenIfNeeded();
      // Re-read tokens in case they were refreshed
      const tokens = getTokens();
      accessToken = tokens.accessToken;

      if (!accessToken) {
        setIsLoading(false);
        return;
      }

      const currentUser = await authApi.getCurrentUser(accessToken);
      setUser(currentUser);
    } catch (error) {
      clearTokens();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Login user
   */
  const login = async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    setTokens(response.accessToken, response.refreshToken);
    setUser(response.user);
  };

  /**
   * Register user
   */
  const register = async (email: string, password: string, firstName: string, lastName: string) => {
    await authApi.register({ email, password, firstName, lastName });
  };

  /**
   * Logout user
   */
  const logout = async () => {
    const { accessToken, refreshToken } = getTokens();
    if (accessToken && refreshToken) {
      try {
        await authApi.logout(accessToken, refreshToken);
      } catch (error) {
        // Ignore logout errors, still clear local state
      }
    }
    clearTokens();
    setUser(null);
  };

  /**
   * Refresh user data
   */
  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  // Initialize auth state on mount
  useEffect(() => {
    fetchCurrentUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set up token refresh interval
  useEffect(() => {
    const interval = setInterval(() => {
      refreshTokenIfNeeded();
    }, 30 * 1000); // Check every 30 seconds

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
