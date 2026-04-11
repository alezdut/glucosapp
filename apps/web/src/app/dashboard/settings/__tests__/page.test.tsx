"use client";

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import SettingsPage from "../page";
import { useAuth } from "@/contexts/auth-context";
import { updateProfile } from "@/lib/profile-api";
import { useAlertSettings, useUpdateAlertSettings } from "@/hooks/useAlertSettings";
import { usePatients } from "@/hooks/usePatients";
import { generateGroupReport, generateIndividualReport } from "@/lib/dashboard-api";
import { NotificationFrequency } from "@glucosapp/types";

jest.mock("@/components/protected-route", () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/components/dashboard/Sidebar", () => ({
  Sidebar: () => <div>Sidebar</div>,
}));

jest.mock("@/components/dashboard/Header", () => ({
  Header: () => <div>Header</div>,
}));

jest.mock("@/components/FeedbackSnackbar", () => ({
  FeedbackSnackbar: ({ open, message }: { open: boolean; message: string }) =>
    open ? <div>{message}</div> : null,
}));

jest.mock("@/components/dashboard/AlertConfigCard", () => ({
  AlertConfigCard: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section>
      <h3>{title}</h3>
      {children}
    </section>
  ),
}));

jest.mock("@/components/dashboard/IndividualAlertConfig", () => ({
  IndividualAlertConfig: ({
    thresholdLabel,
    threshold,
    thresholdError,
    onThresholdChange,
    onFrequencyChange,
  }: {
    thresholdLabel: string;
    threshold: number;
    thresholdError?: string;
    onThresholdChange: (value: number) => void;
    onFrequencyChange: (value: NotificationFrequency) => void;
  }) => (
    <div>
      <span>{`${thresholdLabel}: ${threshold}`}</span>
      {thresholdError ? <span>{thresholdError}</span> : null}
      <button type="button" onClick={() => onThresholdChange(20)}>
        {`invalid-${thresholdLabel}`}
      </button>
      <button type="button" onClick={() => onThresholdChange(75)}>
        {`set-${thresholdLabel}`}
      </button>
      <button type="button" onClick={() => onFrequencyChange(NotificationFrequency.WEEKLY)}>
        {`weekly-${thresholdLabel}`}
      </button>
    </div>
  ),
}));

jest.mock("@/components/dashboard/NotificationPreferences", () => ({
  NotificationPreferences: () => <div>Notification Preferences</div>,
}));

jest.mock("@/components/dashboard/SeverityBadge", () => ({
  SeverityBadge: ({ severity }: { severity: string }) => <div>{severity}</div>,
}));

jest.mock("@/contexts/auth-context", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/lib/profile-api", () => ({
  updateProfile: jest.fn(),
}));

jest.mock("@/hooks/useAlertSettings", () => ({
  useAlertSettings: jest.fn(),
  useUpdateAlertSettings: jest.fn(),
}));

jest.mock("@/hooks/usePatients", () => ({
  usePatients: jest.fn(),
}));

jest.mock("@/lib/dashboard-api", () => ({
  generateIndividualReport: jest.fn(),
  generateGroupReport: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUpdateProfile = updateProfile as jest.MockedFunction<typeof updateProfile>;
const mockUseAlertSettings = useAlertSettings as jest.MockedFunction<typeof useAlertSettings>;
const mockUseUpdateAlertSettings = useUpdateAlertSettings as jest.MockedFunction<
  typeof useUpdateAlertSettings
>;
const mockUsePatients = usePatients as jest.MockedFunction<typeof usePatients>;
const mockGenerateIndividualReport = generateIndividualReport as jest.MockedFunction<
  typeof generateIndividualReport
>;
const mockGenerateGroupReport = generateGroupReport as jest.MockedFunction<
  typeof generateGroupReport
>;

describe("SettingsPage", () => {
  const refreshUser = jest.fn();
  const mutateAsync = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    localStorage.clear();

    Object.defineProperty(window.URL, "createObjectURL", {
      configurable: true,
      value: jest.fn(() => "blob:mock"),
    });
    Object.defineProperty(window.URL, "revokeObjectURL", {
      configurable: true,
      value: jest.fn(),
    });
    jest.spyOn(console, "error").mockImplementation(() => undefined);

    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: true,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      refreshUser,
    });

    mockUseAlertSettings.mockReturnValue({
      data: {
        alertsEnabled: true,
        hypoglycemiaEnabled: true,
        hypoglycemiaThreshold: 70,
        severeHypoglycemiaEnabled: true,
        severeHypoglycemiaThreshold: 54,
        hyperglycemiaEnabled: true,
        hyperglycemiaThreshold: 250,
        persistentHyperglycemiaEnabled: true,
        persistentHyperglycemiaThreshold: 250,
        persistentHyperglycemiaWindowHours: 4,
        persistentHyperglycemiaMinReadings: 2,
        notificationChannels: { dashboard: true, email: true, push: true },
        dailySummaryEnabled: false,
        dailySummaryTime: "08:00",
        quietHoursEnabled: false,
        quietHoursStart: "22:00",
        quietHoursEnd: "07:00",
        criticalAlertsIgnoreQuietHours: false,
        notificationFrequency: NotificationFrequency.IMMEDIATE,
      },
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useAlertSettings>);

    mockUseUpdateAlertSettings.mockReturnValue({
      mutateAsync,
      isPending: false,
    } as ReturnType<typeof useUpdateAlertSettings>);

    mockUsePatients.mockReturnValue({
      data: [],
      isLoading: false,
    } as ReturnType<typeof usePatients>);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("initializes the alert UI from the fetched settings", () => {
    render(<SettingsPage />);

    expect(screen.getByText("Hipoglucemia: 70")).toBeInTheDocument();
    expect(screen.getByText("Hipoglucemia Severa: 54")).toBeInTheDocument();
  });

  it("debounces validation and blocks saving invalid alert settings", async () => {
    render(<SettingsPage />);

    fireEvent.click(screen.getByRole("button", { name: "invalid-Hipoglucemia" }));
    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(screen.getByText("El valor debe estar entre 40 y 80 mg/dL")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Guardar Configuración" })).toBeDisabled();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("restores the default alert thresholds", () => {
    render(<SettingsPage />);

    fireEvent.click(screen.getByRole("button", { name: "set-Hipoglucemia" }));
    expect(screen.getByText("Hipoglucemia: 75")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Restaurar Valores por Defecto" }));

    expect(screen.getByText("Hipoglucemia: 70")).toBeInTheDocument();
    expect(screen.getByText("Hipoglucemia Severa: 54")).toBeInTheDocument();
  });

  it("shows an error when saving general settings without an active session", async () => {
    render(<SettingsPage />);

    fireEvent.click(screen.getByRole("button", { name: "Guardar Cambios" }));

    expect(
      screen.getByText("No hay una sesión activa para guardar los cambios."),
    ).toBeInTheDocument();
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it("saves general settings and refreshes the user when a token exists", async () => {
    localStorage.setItem("accessToken", "stored-token");
    mockUpdateProfile.mockResolvedValue(undefined as never);

    render(<SettingsPage />);

    fireEvent.click(screen.getByRole("button", { name: "Guardar Cambios" }));

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith("stored-token", {
        glucoseUnit: "MG_DL",
        language: "ES",
      });
    });
    expect(refreshUser).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByText("Preferencias guardadas correctamente.")).toBeInTheDocument();
    });
  });

  it("saves alert settings with normalized doctor notification payload", async () => {
    mutateAsync.mockResolvedValue(undefined);

    render(<SettingsPage />);

    fireEvent.click(screen.getByRole("button", { name: "weekly-Hipoglucemia" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar Configuración" }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          notificationChannels: { dashboard: true, email: true, push: false },
          notificationFrequency: NotificationFrequency.WEEKLY,
          dailySummaryEnabled: true,
        }),
      );
    });
    await waitFor(() => {
      expect(
        screen.getByText("Configuración de alertas guardada correctamente."),
      ).toBeInTheDocument();
    });
  });

  it("shows loading state while alert settings are being fetched", () => {
    mockUseAlertSettings.mockReturnValue({
      data: null,
      isLoading: true,
      isError: false,
      error: null,
    } as ReturnType<typeof useAlertSettings>);

    render(<SettingsPage />);

    expect(screen.getByText("Cargando configuración...")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Guardar Configuración" })).not.toBeInTheDocument();
  });

  it("shows an API error when alert settings fail to load", () => {
    mockUseAlertSettings.mockReturnValue({
      data: {
        alertsEnabled: true,
        hypoglycemiaEnabled: true,
        hypoglycemiaThreshold: 70,
        severeHypoglycemiaEnabled: true,
        severeHypoglycemiaThreshold: 54,
        hyperglycemiaEnabled: true,
        hyperglycemiaThreshold: 250,
        persistentHyperglycemiaEnabled: true,
        persistentHyperglycemiaThreshold: 250,
        persistentHyperglycemiaWindowHours: 4,
        persistentHyperglycemiaMinReadings: 2,
        notificationChannels: { dashboard: true, email: true, push: true },
        dailySummaryEnabled: false,
        dailySummaryTime: "08:00",
        quietHoursEnabled: false,
        quietHoursStart: "22:00",
        quietHoursEnd: "07:00",
        criticalAlertsIgnoreQuietHours: false,
        notificationFrequency: NotificationFrequency.IMMEDIATE,
      },
      isLoading: false,
      isError: true,
      error: new Error("Error de red"),
    } as ReturnType<typeof useAlertSettings>);

    render(<SettingsPage />);

    expect(screen.getByText(/Error al cargar la configuración/i)).toBeInTheDocument();
  });

  it("shows mutation error feedback when saving alert settings fails", async () => {
    mutateAsync.mockRejectedValue(new Error("No se pudo guardar"));

    render(<SettingsPage />);

    fireEvent.click(screen.getByRole("button", { name: "Guardar Configuración" }));

    expect(await screen.findByText("No se pudo guardar")).toBeInTheDocument();
  });

  it("requires a selected patient before generating an individual report", async () => {
    render(<SettingsPage />);

    fireEvent.click(screen.getAllByRole("button", { name: "Generar PDF" })[0]);

    expect(screen.getByText("Por favor selecciona un paciente")).toBeInTheDocument();
    expect(mockGenerateIndividualReport).not.toHaveBeenCalled();
  });

  it("requires at least one report type before generating a group report", async () => {
    render(<SettingsPage />);

    const glucoseCheckbox = screen.getByLabelText("Glucosa");
    const mealsCheckboxes = screen.getAllByLabelText("Comidas");

    fireEvent.click(glucoseCheckbox);
    fireEvent.click(mealsCheckboxes[1]);
    fireEvent.click(screen.getAllByRole("button", { name: "Generar PDF" })[1]);

    expect(
      screen.getByText("Por favor selecciona al menos un tipo de reporte"),
    ).toBeInTheDocument();
    expect(mockGenerateGroupReport).not.toHaveBeenCalled();
  });

  it("searches patients and generates individual PDF and CSV reports", async () => {
    localStorage.setItem("accessToken", "stored-token");
    mockUsePatients.mockImplementation((filters) => {
      if (filters?.search) {
        return {
          data: [
            {
              id: "patient-9",
              firstName: "Ada",
              lastName: "Lovelace",
              email: "ada@example.com",
            },
          ],
          isLoading: false,
        } as ReturnType<typeof usePatients>;
      }

      return {
        data: [],
        isLoading: false,
      } as ReturnType<typeof usePatients>;
    });
    mockGenerateIndividualReport.mockResolvedValue(new Blob(["report"]));

    render(<SettingsPage />);

    const patientInput = screen.getByRole("combobox", {
      name: /seleccionar paciente/i,
    });

    fireEvent.focus(patientInput);
    fireEvent.change(patientInput, {
      target: { value: "Ada" },
    });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(mockUsePatients).toHaveBeenLastCalledWith({ search: "Ada" });
    });

    fireEvent.click(await screen.findByText("Ada Lovelace"));

    expect(await screen.findByDisplayValue("Ada Lovelace")).toBeInTheDocument();

    fireEvent.click(screen.getAllByLabelText("Lecturas del Sensor")[0]);
    fireEvent.click(screen.getAllByLabelText("Insulina")[0]);
    fireEvent.click(screen.getAllByLabelText("Resumen por IA")[0]);

    fireEvent.click(screen.getAllByRole("button", { name: "Generar PDF" })[0]);

    await waitFor(() => {
      expect(mockGenerateIndividualReport).toHaveBeenCalledWith(
        "stored-token",
        "patient-9",
        expect.objectContaining({
          format: "pdf",
          includeAISummary: true,
          reportTypes: expect.arrayContaining([
            "glucosa",
            "lecturas_sensor",
            "insulina",
            "comidas",
          ]),
        }),
      );
    });
  });

  it("adds group filters and generates grouped PDF and CSV reports", async () => {
    localStorage.setItem("accessToken", "stored-token");
    mockGenerateGroupReport.mockResolvedValue(new Blob(["group-report"]));

    render(<SettingsPage />);

    fireEvent.click(screen.getAllByLabelText("Insulina")[1]);
    fireEvent.click(screen.getAllByLabelText("Resumen por IA")[1]);

    fireEvent.click(screen.getAllByRole("button", { name: "Generar PDF" })[1]);

    await waitFor(() => {
      expect(mockGenerateGroupReport).toHaveBeenCalledWith(
        "stored-token",
        expect.objectContaining({
          format: "pdf",
          includeAISummary: true,
          filters: undefined,
          reportTypes: expect.arrayContaining(["glucosa", "insulina", "comidas"]),
        }),
      );
    });
  });
});
