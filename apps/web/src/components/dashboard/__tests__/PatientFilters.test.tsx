import { fireEvent, render, screen } from "@testing-library/react";
import { PatientFilters } from "../PatientFilters";

describe("PatientFilters", () => {
  it("propagates search, diabetes type and active state changes", () => {
    const onFiltersChange = jest.fn();
    const onAddPatient = jest.fn();

    render(
      <PatientFilters
        filters={{ search: "", diabetesType: undefined, activeOnly: false }}
        onFiltersChange={onFiltersChange}
        onAddPatient={onAddPatient}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText(/buscar por nombre/i), {
      target: { value: "ana" },
    });
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "TYPE_1" },
    });
    fireEvent.click(screen.getByText(/solo control activo/i));
    fireEvent.click(screen.getByRole("button", { name: /añadir paciente/i }));

    expect(onFiltersChange).toHaveBeenCalledWith(expect.objectContaining({ search: "ana" }));
    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ diabetesType: "TYPE_1" }),
    );
    expect(onFiltersChange).toHaveBeenCalledWith(expect.objectContaining({ activeOnly: true }));
    expect(onAddPatient).toHaveBeenCalled();
  });
});
