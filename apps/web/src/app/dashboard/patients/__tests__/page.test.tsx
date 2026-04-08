"use client";

import { fireEvent, render, screen } from "@testing-library/react";
import PatientsPage from "../page";
import { usePatients } from "@/hooks/usePatients";
import { useSearch } from "@/contexts/search-context";

jest.mock("@/hooks/usePatients", () => ({
  usePatients: jest.fn(),
}));

jest.mock("@/contexts/search-context", () => ({
  useSearch: jest.fn(),
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

jest.mock("@/components/dashboard/PatientCard", () => ({
  PatientCard: ({ patient }: { patient: { id: string; email: string } }) => (
    <div>{patient.email}</div>
  ),
}));

jest.mock("@/components/dashboard/PatientFilters", () => ({
  PatientFilters: ({
    onFiltersChange,
    onAddPatient,
  }: {
    onFiltersChange: (filters: { search?: string }) => void;
    onAddPatient: () => void;
  }) => (
    <div>
      <button onClick={() => onFiltersChange({ search: "manual" })}>change filters</button>
      <button onClick={onAddPatient}>open add modal</button>
    </div>
  ),
}));

jest.mock("@/components/dashboard/PatientEmptyState", () => ({
  PatientEmptyState: ({ onAddPatient }: { onAddPatient: () => void }) => (
    <button onClick={onAddPatient}>empty add patient</button>
  ),
}));

jest.mock("@/components/dashboard/AddPatientModal", () => ({
  AddPatientModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
    <div>
      <span>{isOpen ? "modal open" : "modal closed"}</span>
      <button onClick={onClose}>close modal</button>
    </div>
  ),
}));

const mockUsePatients = usePatients as jest.MockedFunction<typeof usePatients>;
const mockUseSearch = useSearch as jest.MockedFunction<typeof useSearch>;

describe("PatientsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSearch.mockReturnValue({ searchQuery: "" } as never);
  });

  it("renders loading and error states", () => {
    mockUsePatients.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as never);

    const { rerender } = render(<PatientsPage />);

    expect(screen.getByText(/cargando pacientes/i)).toBeInTheDocument();

    mockUsePatients.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("boom"),
    } as never);
    rerender(<PatientsPage />);

    expect(screen.getByText(/error al cargar pacientes/i)).toBeInTheDocument();
    expect(screen.getByText(/\(boom\)/i)).toBeInTheDocument();
  });

  it("syncs header search, renders patients and toggles the add modal", () => {
    mockUseSearch.mockReturnValue({ searchQuery: "ada" } as never);
    mockUsePatients.mockReturnValue({
      data: [
        { id: "patient-1", email: "patient-1@example.com" },
        { id: "patient-2", email: "patient-2@example.com" },
      ],
      isLoading: false,
      error: null,
    } as never);

    render(<PatientsPage />);

    expect(mockUsePatients).toHaveBeenCalledWith({ search: "ada" });
    expect(screen.getByText("patient-1@example.com")).toBeInTheDocument();
    expect(screen.getByText("patient-2@example.com")).toBeInTheDocument();
    expect(screen.getByText("modal closed")).toBeInTheDocument();

    fireEvent.click(screen.getByText("open add modal"));
    expect(screen.getByText("modal open")).toBeInTheDocument();

    fireEvent.click(screen.getByText("close modal"));
    expect(screen.getByText("modal closed")).toBeInTheDocument();
  });

  it("shows the empty state when there are no patients", () => {
    mockUsePatients.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as never);

    render(<PatientsPage />);

    expect(screen.getByText("empty add patient")).toBeInTheDocument();
  });
});
