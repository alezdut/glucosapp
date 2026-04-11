import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AddPatientModal } from "../AddPatientModal";
import { useAssignPatient, useSearchGlobalPatients } from "@/hooks/usePatients";

jest.mock("@/hooks/usePatients", () => ({
  useSearchGlobalPatients: jest.fn(),
  useAssignPatient: jest.fn(),
}));

jest.mock("@/components/FeedbackSnackbar", () => ({
  FeedbackSnackbar: ({ open, message }: { open: boolean; message: string }) =>
    open ? <div>{message}</div> : null,
}));

const mockUseSearchGlobalPatients = useSearchGlobalPatients as jest.MockedFunction<
  typeof useSearchGlobalPatients
>;
const mockUseAssignPatient = useAssignPatient as jest.MockedFunction<typeof useAssignPatient>;

describe("AddPatientModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSearchGlobalPatients.mockReturnValue({
      data: [],
      isLoading: false,
    } as never);
    mockUseAssignPatient.mockReturnValue({
      mutateAsync: jest.fn().mockResolvedValue({}),
    } as never);
  });

  it("renders search states and closes when hidden", () => {
    const { rerender } = render(<AddPatientModal isOpen={false} onClose={jest.fn()} />);
    expect(screen.queryByText(/añadir paciente/i)).not.toBeInTheDocument();

    rerender(<AddPatientModal isOpen={true} onClose={jest.fn()} />);
    expect(screen.getByText(/ingresa un término de búsqueda/i)).toBeInTheDocument();
  });

  it("assigns a searched patient and closes the modal", async () => {
    const onClose = jest.fn();
    const mutateAsync = jest.fn().mockResolvedValue({});
    mockUseSearchGlobalPatients.mockReturnValue({
      data: [
        {
          id: "patient-1",
          email: "patient@example.com",
          firstName: "Ana",
          lastName: "Paz",
          diabetesType: "TYPE_1",
        },
      ],
      isLoading: false,
    } as never);
    mockUseAssignPatient.mockReturnValue({ mutateAsync } as never);

    render(<AddPatientModal isOpen={true} onClose={onClose} />);

    fireEvent.change(screen.getByPlaceholderText(/buscar por nombre/i), {
      target: { value: "ana" },
    });
    fireEvent.click(screen.getByRole("button", { name: /añadir/i }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith("patient-1"));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows assignment errors", async () => {
    const mutateAsync = jest.fn().mockRejectedValue(new Error("assignment failed"));
    mockUseSearchGlobalPatients.mockReturnValue({
      data: [{ id: "patient-1", email: "patient@example.com" }],
      isLoading: false,
    } as never);
    mockUseAssignPatient.mockReturnValue({ mutateAsync } as never);

    render(<AddPatientModal isOpen={true} onClose={jest.fn()} />);

    fireEvent.change(screen.getByPlaceholderText(/buscar por nombre/i), {
      target: { value: "ana" },
    });
    fireEvent.click(screen.getByRole("button", { name: /añadir/i }));

    expect(await screen.findByText(/assignment failed/i)).toBeInTheDocument();
  });
});
