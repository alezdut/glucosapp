import { fireEvent, render, screen } from "@testing-library/react";
import { PatientEmptyState } from "../PatientEmptyState";

describe("PatientEmptyState", () => {
  it("renders the empty copy and lets the user add a patient", () => {
    const onAddPatient = jest.fn();
    render(<PatientEmptyState onAddPatient={onAddPatient} />);

    expect(screen.getByText(/no tienes pacientes asignados aún/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /añadir paciente/i }));
    expect(onAddPatient).toHaveBeenCalled();
  });
});
