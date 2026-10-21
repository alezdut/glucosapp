import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { Alert } from "react-native";
import { DiabetesType, GlucoseUnit, Language, Theme, type UserProfile } from "@glucosapp/types";
import ProfileScreen from "../ProfileScreen";
import { renderMobile } from "../../../test/render-mobile";
import * as reactQuery from "@tanstack/react-query";
import * as authContext from "../../contexts/AuthContext";
import * as utils from "@glucosapp/utils";

const mockNavigate = jest.fn();
const mockInvalidateQueries = jest.fn();

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock("../../contexts/AuthContext", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../../components", () => ({
  CustomDateTimePicker: ({
    label,
    onDateChange,
  }: {
    label: string;
    onDateChange: (value: Date) => void;
  }) => (
    <button type="button" onClick={() => onDateChange(new Date("2010-01-01T00:00:00.000Z"))}>
      {label}
    </button>
  ),
}));

jest.mock("../../lib/api", () => ({
  createApiClient: jest.fn(),
}));

jest.mock("@glucosapp/utils", () => ({
  calculateAge: jest.fn(() => 25),
}));

jest.mock("@tanstack/react-query", () => {
  const actual = jest.requireActual("@tanstack/react-query");

  return {
    ...actual,
    useQuery: jest.fn(),
    useMutation: jest.fn(),
    useQueryClient: jest.fn(),
  };
});

const mockUseAuth = authContext.useAuth as jest.MockedFunction<typeof authContext.useAuth>;
const mockUseQuery = reactQuery.useQuery as jest.MockedFunction<typeof reactQuery.useQuery>;
const mockUseMutation = reactQuery.useMutation as jest.MockedFunction<
  typeof reactQuery.useMutation
>;
const mockUseQueryClient = reactQuery.useQueryClient as jest.MockedFunction<
  typeof reactQuery.useQueryClient
>;
const mockCalculateAge = utils.calculateAge as jest.MockedFunction<typeof utils.calculateAge>;

const baseProfile: UserProfile = {
  id: "profile-1",
  userId: "patient-1",
  diabetesType: DiabetesType.TYPE_1,
  glucoseUnit: GlucoseUnit.MG_DL,
  theme: Theme.DARK,
  language: Language.ES,
  weight: 72,
  birthDate: "2000-01-01T00:00:00.000Z",
};

describe("ProfileScreen", () => {
  const signOut = jest.fn();
  const mutate = jest.fn();
  const alertSpy = jest.spyOn(Alert, "alert");
  let doctorInfo: unknown = null;
  let currentProfile: UserProfile = baseProfile;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCalculateAge.mockReturnValue(25);
    alertSpy.mockImplementation(jest.fn());
    doctorInfo = null;
    currentProfile = baseProfile;

    mockUseAuth.mockReturnValue({
      user: {
        id: "patient-1",
        email: "lucia@example.com",
        firstName: "Lucía",
        lastName: "Martínez",
      },
      signOut,
    } as never);

    mockUseQuery.mockImplementation(({ queryKey }) => {
      if (queryKey[0] === "profile") {
        return {
          data: currentProfile,
          isLoading: false,
        } as never;
      }

      if (queryKey[0] === "my-doctor") {
        return {
          data: doctorInfo,
          isLoading: false,
        } as never;
      }

      return {
        data: undefined,
        isLoading: false,
      } as never;
    });

    mockUseMutation.mockReturnValue({
      mutate,
      isPending: false,
    } as never);

    mockUseQueryClient.mockReturnValue({
      invalidateQueries: mockInvalidateQueries,
    } as never);
  });

  it("shows a loading state while the profile query resolves", () => {
    mockUseQuery.mockImplementation(({ queryKey }) => {
      if (queryKey[0] === "profile") {
        return {
          data: undefined,
          isLoading: true,
        } as never;
      }

      return {
        data: null,
        isLoading: false,
      } as never;
    });

    renderMobile(<ProfileScreen />);

    expect(screen.getByTestId("activity-indicator")).toBeTruthy();
  });

  it("renders profile details and navigates to treatment parameters when no doctor is assigned", () => {
    renderMobile(<ProfileScreen />);

    expect(screen.getByText("Perfil")).toBeTruthy();
    expect(screen.getByText("Lucía Martínez")).toBeTruthy();
    expect(screen.getByText("25 años")).toBeTruthy();
    expect(screen.getByText("Tipo 1")).toBeTruthy();
    expect(screen.getByText("mg/dL")).toBeTruthy();
    expect(screen.getByText("Oscuro")).toBeTruthy();
    expect(screen.getByText("Español")).toBeTruthy();
    expect(screen.getByText("Parámetros de tratamiento")).toBeTruthy();

    fireEvent.click(screen.getByText("Parámetros de tratamiento"));

    expect(mockNavigate).toHaveBeenCalledWith("TreatmentParameters");
  });

  it("shows the doctor-managed treatment parameters state and confirms logout", async () => {
    doctorInfo = {
      doctor: { id: "doctor-1", email: "doctor@example.com" },
    };

    renderMobile(<ProfileScreen />);

    expect(screen.getByText("Administrados por tu médico.")).toBeTruthy();
    expect(screen.queryByText("Configurar insulina y objetivos")).toBeNull();

    fireEvent.click(screen.getByText("Cerrar sesión"));

    const logoutAlert = alertSpy.mock.calls.find(([title]) => title === "Cerrar sesión");
    expect(logoutAlert).toBeTruthy();

    await (logoutAlert?.[2]?.[1] as { onPress?: () => Promise<void> } | undefined)?.onPress?.();

    await waitFor(() => {
      expect(signOut).toHaveBeenCalled();
    });
  });

  it("submits updated weight when profile data is valid", async () => {
    renderMobile(<ProfileScreen />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("60")).toBeTruthy();
    });

    fireEvent.change(screen.getByPlaceholderText("60"), {
      target: { value: "75" },
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(mutate).toHaveBeenCalledWith({
      weight: 75,
    });
  });

  it("shows validation error for invalid weight input", async () => {
    currentProfile = {
      ...baseProfile,
      diabetesType: undefined,
    } as UserProfile;

    mockUseQuery.mockImplementation(({ queryKey }) => {
      if (queryKey[0] === "profile") {
        return {
          data: currentProfile,
          isLoading: false,
        } as never;
      }

      if (queryKey[0] === "my-doctor") {
        return {
          data: doctorInfo,
          isLoading: false,
        } as never;
      }

      return {
        data: undefined,
        isLoading: false,
      } as never;
    });

    renderMobile(<ProfileScreen />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("60")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Tipo 1" }));

    fireEvent.change(screen.getByPlaceholderText("60"), {
      target: { value: "abc" },
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(alertSpy).toHaveBeenCalledWith("Error", "Por favor ingresa un peso válido");
    expect(mutate).not.toHaveBeenCalled();
  });

  it("shows validation error when weight is outside allowed range", async () => {
    renderMobile(<ProfileScreen />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("60")).toBeTruthy();
    });

    fireEvent.change(screen.getByPlaceholderText("60"), {
      target: { value: "19" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(alertSpy).toHaveBeenCalledWith("Error", "El peso debe estar entre 20 y 300 kg");
    expect(mutate).not.toHaveBeenCalled();
  });

  it("shows validation error when birth date is required but missing", async () => {
    currentProfile = {
      ...baseProfile,
      birthDate: undefined,
      diabetesType: DiabetesType.TYPE_1,
    } as UserProfile;

    mockUseQuery.mockImplementation(({ queryKey }) => {
      if (queryKey[0] === "profile") {
        return {
          data: currentProfile,
          isLoading: false,
        } as never;
      }

      return {
        data: null,
        isLoading: false,
      } as never;
    });

    renderMobile(<ProfileScreen />);

    fireEvent.change(screen.getByPlaceholderText("60"), {
      target: { value: "75" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(alertSpy).toHaveBeenCalledWith("Error", "Por favor selecciona tu fecha de nacimiento");
    expect(mutate).not.toHaveBeenCalled();
  });

  it("shows validation error when calculated age is outside allowed range", async () => {
    currentProfile = {
      ...baseProfile,
      birthDate: undefined,
      diabetesType: DiabetesType.TYPE_1,
    } as UserProfile;

    mockCalculateAge.mockReturnValue(130);

    mockUseQuery.mockImplementation(({ queryKey }) => {
      if (queryKey[0] === "profile") {
        return {
          data: currentProfile,
          isLoading: false,
        } as never;
      }

      return {
        data: null,
        isLoading: false,
      } as never;
    });

    renderMobile(<ProfileScreen />);

    fireEvent.click(screen.getByText("Fecha de Nacimiento"));
    fireEvent.change(screen.getByPlaceholderText("60"), {
      target: { value: "75" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(alertSpy).toHaveBeenCalledWith("Error", "La edad debe estar entre 1 y 120 años");
    expect(mutate).not.toHaveBeenCalled();
  });

  it("falls back to user email when first and last names are unavailable", () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: "patient-1",
        email: "fallback@example.com",
      },
      signOut,
    } as never);

    renderMobile(<ProfileScreen />);

    expect(screen.getByText("fallback@example.com")).toBeTruthy();
  });

  it("renders fallback preference labels for non-default enum values", () => {
    currentProfile = {
      ...baseProfile,
      diabetesType: DiabetesType.TYPE_2,
      glucoseUnit: GlucoseUnit.MMOL_L,
      theme: Theme.LIGHT,
      language: Language.EN,
    } as UserProfile;

    mockUseQuery.mockImplementation(({ queryKey }) => {
      if (queryKey[0] === "profile") {
        return {
          data: currentProfile,
          isLoading: false,
        } as never;
      }

      return {
        data: null,
        isLoading: false,
      } as never;
    });

    renderMobile(<ProfileScreen />);

    expect(screen.getByText("Tipo 2")).toBeTruthy();
    expect(screen.getByText("mmol/L")).toBeTruthy();
    expect(screen.getByText("Claro")).toBeTruthy();
    expect(screen.getByText("English")).toBeTruthy();
  });

  it("submits birth date and diabetes type when profile is incomplete", async () => {
    currentProfile = {
      ...baseProfile,
      birthDate: undefined,
      diabetesType: undefined,
      weight: undefined,
    } as UserProfile;

    mockUseQuery.mockImplementation(({ queryKey }) => {
      if (queryKey[0] === "profile") {
        return {
          data: currentProfile,
          isLoading: false,
        } as never;
      }

      return {
        data: null,
        isLoading: false,
      } as never;
    });

    renderMobile(<ProfileScreen />);

    fireEvent.click(screen.getByText("Fecha de Nacimiento"));
    fireEvent.click(screen.getByRole("button", { name: "Tipo 2" }));
    fireEvent.change(screen.getByPlaceholderText("60"), {
      target: { value: "75,5" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => {
      expect(mutate).toHaveBeenCalledWith({
        birthDate: "2010-01-01T00:00:00.000Z",
        diabetesType: DiabetesType.TYPE_2,
        weight: 75.5,
      });
    });
  });

  it("does not render save button when there are no pending changes", () => {
    renderMobile(<ProfileScreen />);

    expect(screen.queryByRole("button", { name: "Guardar cambios" })).toBeNull();
  });
});
