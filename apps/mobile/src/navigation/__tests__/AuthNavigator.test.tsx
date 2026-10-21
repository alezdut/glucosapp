import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { render, screen } from "@testing-library/react";
import AuthNavigator from "../AuthNavigator";
import { useAuth } from "../../contexts/AuthContext";

jest.mock("@react-navigation/native-stack", () => ({
  createNativeStackNavigator: jest.fn(() => ({
    Navigator: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Screen: ({ name }: { name: string }) => <div data-testid={`auth-screen-${name}`}>{name}</div>,
  })),
}));

jest.mock("../../contexts/AuthContext", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../../screens/WelcomeScreen", () => () => <div>welcome</div>);
jest.mock("../../screens/OnboardingScreen", () => () => <div>onboarding</div>);

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe("AuthNavigator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows welcome when unauthenticated", () => {
    mockUseAuth.mockReturnValue({
      needsOnboarding: false,
      isAuthenticated: false,
    } as never);

    render(<AuthNavigator />);

    expect(screen.getByTestId("auth-screen-Welcome")).toBeTruthy();
  });

  it("shows onboarding when authenticated but needs onboarding", () => {
    mockUseAuth.mockReturnValue({
      needsOnboarding: true,
      isAuthenticated: true,
    } as never);

    render(<AuthNavigator />);

    expect(screen.getByTestId("auth-screen-Onboarding")).toBeTruthy();
  });

  it("renders no auth screens when authenticated and onboarded", () => {
    mockUseAuth.mockReturnValue({
      needsOnboarding: false,
      isAuthenticated: true,
    } as never);

    render(<AuthNavigator />);

    expect(screen.queryByTestId(/auth-screen-/)).toBeNull();
  });
});
