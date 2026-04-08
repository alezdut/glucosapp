import React from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import WelcomeScreen from "../WelcomeScreen";
import { useAuth } from "../../contexts/AuthContext";
import { renderMobile } from "../../../test/render-mobile";

jest.mock("../../contexts/AuthContext", () => ({
  useAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe("WelcomeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("triggers Google sign-in from the main CTA", async () => {
    const signInWithGoogle = jest.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      needsOnboarding: false,
      signInWithGoogle,
      signOut: jest.fn(),
      updateUserProfile: jest.fn(),
      completeOnboarding: jest.fn(),
      refreshUser: jest.fn(),
    });

    renderMobile(<WelcomeScreen />);

    fireEvent.click(screen.getByRole("button", { name: /continuar con google/i }));

    await waitFor(() => {
      expect(signInWithGoogle).toHaveBeenCalled();
    });
  });

  it("shows a loading state and disables the CTA while auth is resolving", () => {
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

    renderMobile(<WelcomeScreen />);

    expect(screen.getByTestId("activity-indicator")).toBeTruthy();
    expect(screen.getByRole("button")).toHaveProperty("disabled", true);
  });

  it("keeps rendering if Google sign-in rejects", async () => {
    const signInWithGoogle = jest.fn().mockRejectedValue(new Error("oauth failed"));
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      needsOnboarding: false,
      signInWithGoogle,
      signOut: jest.fn(),
      updateUserProfile: jest.fn(),
      completeOnboarding: jest.fn(),
      refreshUser: jest.fn(),
    });

    renderMobile(<WelcomeScreen />);

    fireEvent.click(screen.getByRole("button", { name: /continuar con google/i }));

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalled();
    });

    expect(screen.getByText("Bienvenido")).toBeTruthy();
    errorSpy.mockRestore();
  });
});
