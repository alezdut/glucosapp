"use client";

import { fireEvent, render, screen } from "@testing-library/react";
import { usePatientLogEntries } from "@/hooks/usePatientData";
import { PatientLogs } from "../PatientLogs";

jest.mock("@/hooks/usePatientData", () => ({
  usePatientLogEntries: jest.fn(),
}));

jest.mock("@/components/dashboard/PatientLogCard", () => ({
  PatientLogCard: ({ entry }: { entry: { id: string } }) => <div>{`Log ${entry.id}`}</div>,
}));

const mockUsePatientLogEntries = usePatientLogEntries as jest.MockedFunction<
  typeof usePatientLogEntries
>;

const entries = Array.from({ length: 7 }, (_, index) => ({
  id: `entry-${index + 1}`,
}));

describe("PatientLogs", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePatientLogEntries.mockReturnValue({
      data: entries,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      isRefetching: false,
    } as never);
  });

  it("renders loading, error and empty states", () => {
    const refetch = jest.fn();
    mockUsePatientLogEntries.mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      error: null,
      refetch,
      isRefetching: false,
    } as never);

    const { rerender } = render(<PatientLogs patientId="patient-1" />);
    expect(screen.getByText(/cargando registros/i)).toBeInTheDocument();

    mockUsePatientLogEntries.mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      error: new Error("boom"),
      refetch,
      isRefetching: false,
    } as never);
    rerender(<PatientLogs patientId="patient-1" />);
    expect(screen.getByText(/error al cargar registros/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /reintentar/i }));
    expect(refetch).toHaveBeenCalled();

    mockUsePatientLogEntries.mockReturnValueOnce({
      data: [],
      isLoading: false,
      error: null,
      refetch,
      isRefetching: false,
    } as never);
    rerender(<PatientLogs patientId="patient-1" />);
    expect(screen.getByText(/no hay registros en el período seleccionado/i)).toBeInTheDocument();
  });

  it("renders entries, presets and pagination", () => {
    render(<PatientLogs patientId="patient-1" />);

    expect(screen.getByText("Log entry-1")).toBeInTheDocument();
    expect(screen.getByText("Log entry-5")).toBeInTheDocument();
    expect(screen.queryByText("Log entry-6")).not.toBeInTheDocument();
    expect(screen.getByText(/mostrando 1-5 de 7 registros/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /página siguiente/i }));
    expect(screen.getByText("Log entry-6")).toBeInTheDocument();
    expect(screen.getByText("Log entry-7")).toBeInTheDocument();
    expect(screen.getByText(/mostrando 6-7 de 7 registros/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "1" }));
    expect(screen.getByText("Log entry-1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /filtrar últimos 30 días/i }));
    expect(mockUsePatientLogEntries).toHaveBeenLastCalledWith(
      "patient-1",
      expect.stringContaining("T"),
      expect.stringContaining("T"),
    );
  });

  it("shows refetching state while keeping the current range controls", () => {
    mockUsePatientLogEntries.mockReturnValue({
      data: entries,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      isRefetching: true,
    } as never);

    render(<PatientLogs patientId="patient-1" />);

    expect(screen.getByText(/cargando registros/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /filtrar últimos 7 días/i })).toBeInTheDocument();
  });
});
