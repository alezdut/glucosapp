import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
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
      signInWithPassword: jest.fn(),
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

  it("submits password credentials and displays a useful error on rejection", async () => {
    const signInWithPassword = jest.fn().mockRejectedValue(new Error("invalid credentials"));
    mockUseAuth.mockReturnValue({
      isLoading: false,
      signInWithPassword,
      signInWithGoogle: jest.fn(),
    } as never);
    renderMobile(<WelcomeScreen />);
    expect(screen.getByRole("button", { name: /^iniciar sesión$/i })).toHaveProperty(
      "disabled",
      true,
    );
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "demo-patient-1@glucosapp.demo" },
    });
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "Demo123!" } });
    fireEvent.click(screen.getByRole("button", { name: /^iniciar sesión$/i }));
    await waitFor(() =>
      expect(signInWithPassword).toHaveBeenCalledWith("demo-patient-1@glucosapp.demo", "Demo123!"),
    );
    expect(await screen.findByText(/revisá tus credenciales/i)).toBeTruthy();
  });

  it("shows a loading state and disables the CTA while auth is resolving", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: true,
      isAuthenticated: false,
      needsOnboarding: false,
      signInWithGoogle: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      updateUserProfile: jest.fn(),
      completeOnboarding: jest.fn(),
      refreshUser: jest.fn(),
    });

    renderMobile(<WelcomeScreen />);

    expect(screen.getByTestId("activity-indicator")).toBeTruthy();
    expect(screen.getByRole("button", { name: /continuar con google/i })).toHaveProperty(
      "disabled",
      true,
    );
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
      signInWithPassword: jest.fn(),
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
