import React from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { Alert } from "react-native";
import OnboardingScreen from "../OnboardingScreen";
import { useAuth } from "../../contexts/AuthContext";
import { renderMobile } from "../../../test/render-mobile";
import { mobileFixtures } from "../../../test/fixtures";

jest.mock("../../contexts/AuthContext", () => ({
  useAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockAlert = Alert.alert as jest.MockedFunction<typeof Alert.alert>;

describe("OnboardingScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("validates missing first and last name inputs", async () => {
    mockUseAuth.mockReturnValue({
      user: mobileFixtures.patientUser,
      isLoading: false,
      isAuthenticated: true,
      needsOnboarding: true,
      signInWithGoogle: jest.fn(),
      signOut: jest.fn(),
      updateUserProfile: jest.fn(),
      completeOnboarding: jest.fn(),
      refreshUser: jest.fn(),
    });

    renderMobile(<OnboardingScreen />);

    fireEvent.change(screen.getByPlaceholderText("Ingresa tu nombre"), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByPlaceholderText("Ingresa tu apellido"), {
      target: { value: "" },
    });

    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith("Error", "Por favor ingresa tu nombre");
    });
  });

  it("submits a valid profile and completes onboarding", async () => {
    const updateUserProfile = jest.fn().mockResolvedValue(undefined);
    const completeOnboarding = jest.fn();

    mockUseAuth.mockReturnValue({
      user: mobileFixtures.onboardingUser,
      isLoading: false,
      isAuthenticated: true,
      needsOnboarding: true,
      signInWithGoogle: jest.fn(),
      signOut: jest.fn(),
      updateUserProfile,
      completeOnboarding,
      refreshUser: jest.fn(),
    });

    renderMobile(<OnboardingScreen />);

    fireEvent.change(screen.getByPlaceholderText("Ingresa tu nombre"), {
      target: { value: "  Ana  " },
    });
    fireEvent.change(screen.getByPlaceholderText("Ingresa tu apellido"), {
      target: { value: "  Paz  " },
    });

    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));

    await waitFor(() => {
      expect(updateUserProfile).toHaveBeenCalledWith("Ana", "Paz");
    });

    expect(completeOnboarding).toHaveBeenCalled();
  });

  it("shows a loading indicator when profile saving is blocked by auth loading", () => {
    mockUseAuth.mockReturnValue({
      user: mobileFixtures.patientUser,
      isLoading: true,
      isAuthenticated: true,
      needsOnboarding: true,
      signInWithGoogle: jest.fn(),
      signOut: jest.fn(),
      updateUserProfile: jest.fn(),
      completeOnboarding: jest.fn(),
      refreshUser: jest.fn(),
    });

    renderMobile(<OnboardingScreen />);

    expect(screen.getByTestId("activity-indicator")).toBeTruthy();
    expect(screen.getByRole("button")).toHaveProperty("disabled", true);
  });

  it("shows an error alert when profile persistence fails", async () => {
    const updateUserProfile = jest.fn().mockRejectedValue(new Error("save failed"));

    mockUseAuth.mockReturnValue({
      user: mobileFixtures.patientUser,
      isLoading: false,
      isAuthenticated: true,
      needsOnboarding: true,
      signInWithGoogle: jest.fn(),
      signOut: jest.fn(),
      updateUserProfile,
      completeOnboarding: jest.fn(),
      refreshUser: jest.fn(),
    });

    renderMobile(<OnboardingScreen />);

    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith(
        "Error",
        "No se pudo actualizar tu perfil. Por favor intenta de nuevo.",
      );
    });
  });
});
