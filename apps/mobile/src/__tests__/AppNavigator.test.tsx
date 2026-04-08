import React from "react";
import { render, screen } from "@testing-library/react";
import { AppNavigator } from "../../App";
import { useAuth } from "../contexts/AuthContext";

jest.mock("../contexts/AuthContext", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../hooks/usePushNotifications", () => ({
  usePushNotifications: jest.fn(),
}));

jest.mock("@react-navigation/native", () => ({
  NavigationContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="navigation-container">{children}</div>
  ),
}));

jest.mock("../navigation", () => ({
  RootNavigator: () => <div>root-navigator</div>,
  AuthNavigator: () => <div>auth-navigator</div>,
}));

jest.mock("../navigation/navigation-service", () => ({
  navigationRef: {},
  flushPendingNavigationActions: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe("AppNavigator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading state while auth is resolving", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: true,
      isAuthenticated: false,
      needsOnboarding: false,
      signInWithGoogle: jest.fn(),
      signOut: jest.fn(),
      updateUserProfile: jest.fn(),
      completeOnboarding: jest.fn(),
      refreshUser: jest.fn(),
    });

    render(<AppNavigator />);

    expect(screen.getByTestId("activity-indicator")).toBeTruthy();
    expect(screen.queryByText("auth-navigator")).toBeNull();
    expect(screen.queryByText("root-navigator")).toBeNull();
  });

  it("routes unauthenticated users to auth flow", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      needsOnboarding: false,
      signInWithGoogle: jest.fn(),
      signOut: jest.fn(),
      updateUserProfile: jest.fn(),
      completeOnboarding: jest.fn(),
      refreshUser: jest.fn(),
    });

    render(<AppNavigator />);

    expect(screen.getByText("auth-navigator")).toBeTruthy();
  });

  it("routes authenticated users that still need onboarding to the auth flow", () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: "patient-1",
        email: "patient@example.com",
        firstName: "",
        lastName: "",
        emailVerified: true,
        role: "PATIENT",
        createdAt: new Date().toISOString(),
      },
      isLoading: false,
      isAuthenticated: true,
      needsOnboarding: true,
      signInWithGoogle: jest.fn(),
      signOut: jest.fn(),
      updateUserProfile: jest.fn(),
      completeOnboarding: jest.fn(),
      refreshUser: jest.fn(),
    });

    render(<AppNavigator />);

    expect(screen.getByText("auth-navigator")).toBeTruthy();
  });

  it("routes authenticated and onboarded users to the main navigator", () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: "patient-1",
        email: "patient@example.com",
        firstName: "Ana",
        lastName: "Paz",
        emailVerified: true,
        role: "PATIENT",
        createdAt: new Date().toISOString(),
      },
      isLoading: false,
      isAuthenticated: true,
      needsOnboarding: false,
      signInWithGoogle: jest.fn(),
      signOut: jest.fn(),
      updateUserProfile: jest.fn(),
      completeOnboarding: jest.fn(),
      refreshUser: jest.fn(),
    });

    render(<AppNavigator />);

    expect(screen.getByText("root-navigator")).toBeTruthy();
  });
});
