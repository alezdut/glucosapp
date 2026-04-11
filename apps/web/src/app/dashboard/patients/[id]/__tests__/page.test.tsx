"use client";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import PatientDetailsPage from "../page";
import { usePatientDetails, useRemovePatient } from "@/hooks/usePatients";
import {
  usePatientGlucoseEvolution,
  usePatientInsulinStats,
  usePatientProfile,
} from "@/hooks/usePatientData";

const mockPush = jest.fn();
const mockSearchParamsGet = jest.fn(() => null);

jest.mock("next/navigation", () => ({
  useParams: jest.fn(() => ({ id: "patient-1" })),
  useRouter: jest.fn(() => ({ push: mockPush })),
  useSearchParams: jest.fn(() => ({ get: mockSearchParamsGet })),
}));

jest.mock("@/hooks/usePatients", () => ({
  usePatientDetails: jest.fn(),
  useRemovePatient: jest.fn(),
}));

jest.mock("@/hooks/usePatientData", () => ({
  usePatientGlucoseEvolution: jest.fn(),
  usePatientInsulinStats: jest.fn(),
  usePatientProfile: jest.fn(),
}));

jest.mock("@/components/protected-route", () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/components/dashboard/Sidebar", () => ({
  Sidebar: () => <div>Sidebar</div>,
}));

jest.mock("@/components/dashboard/Header", () => ({
  Header: () => <div>Header</div>,
}));

jest.mock("@/components/dashboard/Tabs", () => ({
  Tabs: ({ activeTab, onTabChange }: { activeTab: string; onTabChange: (tab: string) => void }) => (
    <div>
      <span>active-tab:{activeTab}</span>
      <button onClick={() => onTabChange("meals")}>show meals</button>
      <button onClick={() => onTabChange("notes")}>show notes</button>
      <button onClick={() => onTabChange("parameters")}>show parameters</button>
    </div>
  ),
}));

jest.mock("@/components/dashboard/PatientGlucoseChart", () => ({
  PatientGlucoseChart: ({ data }: { data: unknown[] }) => <div>Glucose chart {data.length}</div>,
}));

jest.mock("@/components/dashboard/PatientInsulinChart", () => ({
  PatientInsulinChart: ({ data }: { data: unknown[] }) => <div>Insulin chart {data.length}</div>,
}));

jest.mock("@/components/dashboard/PatientLogs", () => ({
  PatientLogs: ({ patientId }: { patientId: string }) => <div>Logs {patientId}</div>,
}));

jest.mock("@/components/dashboard/PatientParameters", () => ({
  PatientParameters: ({ patientId }: { patientId: string }) => <div>Parameters {patientId}</div>,
}));

jest.mock("@/components/dashboard/PatientChat", () => ({
  PatientChat: ({ patientId }: { patientId?: string }) => <div>Chat {patientId}</div>,
}));

jest.mock("@/components/dashboard/PatientAvatar", () => ({
  PatientAvatar: ({ patientName }: { patientName: string }) => <div>Avatar {patientName}</div>,
}));

const mockUsePatientDetails = usePatientDetails as jest.MockedFunction<typeof usePatientDetails>;
const mockUseRemovePatient = useRemovePatient as jest.MockedFunction<typeof useRemovePatient>;
const mockUsePatientGlucoseEvolution = usePatientGlucoseEvolution as jest.MockedFunction<
  typeof usePatientGlucoseEvolution
>;
const mockUsePatientInsulinStats = usePatientInsulinStats as jest.MockedFunction<
  typeof usePatientInsulinStats
>;
const mockUsePatientProfile = usePatientProfile as jest.MockedFunction<typeof usePatientProfile>;

describe("PatientDetailsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParamsGet.mockReturnValue(null);
    mockUsePatientDetails.mockReturnValue({
      data: {
        id: "patient-1",
        email: "patient@example.com",
        firstName: "Ana",
        lastName: "Paz",
        status: "Riesgo",
        activityStatus: "Activo",
        diabetesType: "TYPE_1",
        birthDate: "2000-04-08",
        registrationDate: "2026-01-01T00:00:00.000Z",
        lastGlucoseReading: {
          value: 145,
          recordedAt: "2026-04-08T10:00:00.000Z",
        },
      },
      isLoading: false,
      error: null,
    } as never);
    mockUsePatientGlucoseEvolution.mockReturnValue({
      data: { data: [{ month: "2026-04", averageGlucose: 120 }] },
      isLoading: false,
      error: null,
    } as never);
    mockUsePatientInsulinStats.mockReturnValue({
      data: { data: [{ month: "2026-04", averageBasal: 10, averageBolus: 5 }] },
      isLoading: false,
      error: null,
    } as never);
    mockUsePatientProfile.mockReturnValue({
      data: { id: "profile-1" },
    } as never);
    mockUseRemovePatient.mockReturnValue({
      mutateAsync: jest.fn().mockResolvedValue({}),
      isPending: false,
    } as never);
  });

  it("renders loading and error states", () => {
    mockUsePatientDetails.mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      error: null,
    } as never);

    const { rerender } = render(<PatientDetailsPage />);
    expect(screen.getByText(/cargando información del paciente/i)).toBeInTheDocument();

    mockUsePatientDetails.mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      error: new Error("boom"),
    } as never);
    rerender(<PatientDetailsPage />);

    expect(screen.getByText(/error al cargar la información del paciente/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/volver a la lista de pacientes/i));
    expect(mockPush).toHaveBeenCalledWith("/dashboard/patients");
  });

  it("renders patient details and tab content", () => {
    mockSearchParamsGet.mockReturnValue("glucose-insulin");

    const { rerender } = render(<PatientDetailsPage />);

    expect(screen.getByText("Ana Paz")).toBeInTheDocument();
    expect(screen.getByText(/145 mg\/dL/i)).toBeInTheDocument();
    expect(screen.getByText("Tipo 1")).toBeInTheDocument();
    expect(screen.getByText(/glucose chart 1/i)).toBeInTheDocument();
    expect(screen.getByText(/insulin chart 1/i)).toBeInTheDocument();

    mockSearchParamsGet.mockReturnValue("meals");
    rerender(<PatientDetailsPage />);
    expect(screen.getByText("Logs patient-1")).toBeInTheDocument();

    mockSearchParamsGet.mockReturnValue("notes");
    rerender(<PatientDetailsPage />);
    expect(screen.getByText("Chat patient-1")).toBeInTheDocument();

    mockSearchParamsGet.mockReturnValue("parameters");
    rerender(<PatientDetailsPage />);
    expect(screen.getByText("Parameters patient-1")).toBeInTheDocument();
  });

  it("renders chart loading and error states", () => {
    mockUsePatientGlucoseEvolution.mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      error: null,
    } as never);
    mockUsePatientInsulinStats.mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      error: new Error("insulin down"),
    } as never);

    render(<PatientDetailsPage />);

    expect(screen.getByText(/cargando datos de glucosa/i)).toBeInTheDocument();
    expect(screen.getByText(/error al cargar datos de insulina/i)).toBeInTheDocument();
    expect(screen.getByText("insulin down")).toBeInTheDocument();
  });

  it("removes the patient after confirmation and navigates to communication", async () => {
    const mutateAsync = jest.fn().mockResolvedValue({});
    mockUseRemovePatient.mockReturnValue({
      mutateAsync,
      isPending: false,
    } as never);

    render(<PatientDetailsPage />);

    fireEvent.click(screen.getByRole("button", { name: /contactar/i }));
    expect(mockPush).toHaveBeenCalledWith("/dashboard/communication?patientId=patient-1");

    fireEvent.click(screen.getAllByRole("button", { name: /desvincular/i })[0]);
    expect(screen.getByText(/esta acción no se puede deshacer/i)).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /desvincular/i })[1]);

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith("patient-1"));
    expect(mockPush).toHaveBeenCalledWith("/dashboard/patients");
  });
});
