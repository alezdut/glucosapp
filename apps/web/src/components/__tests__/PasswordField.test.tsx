import { fireEvent, render, screen } from "@testing-library/react";
import { PasswordField } from "@/components/PasswordField";
import { renderWithProviders } from "@/test/test-utils";

describe("PasswordField", () => {
  it("toggles password visibility and notifies password strength", () => {
    const onChange = jest.fn();
    const onStrengthChange = jest.fn();

    renderWithProviders(
      <PasswordField
        label="Contraseña"
        value="Password1!"
        onChange={onChange}
        onStrengthChange={onStrengthChange}
        showStrengthIndicator
      />,
    );

    const input = screen.getByLabelText("Contraseña");
    expect(input).toHaveAttribute("type", "password");

    fireEvent.click(screen.getByRole("button", { name: "Mostrar contraseña" }));
    expect(screen.getByLabelText("Contraseña")).toHaveAttribute("type", "text");

    fireEvent.change(screen.getByLabelText("Contraseña"), {
      target: { value: "OtherPass1!" },
    });

    expect(onChange).toHaveBeenCalledWith("OtherPass1!");
    expect(onStrengthChange).toHaveBeenCalledWith("strong");
    expect(screen.getByText(/fortaleza:/i)).toHaveTextContent("Fortaleza: Fuerte");
  });

  it("renders helper text when strength indicator is disabled", () => {
    render(
      <PasswordField
        label="Contraseña"
        value=""
        onChange={jest.fn()}
        helperText="Usa una contraseña segura"
      />,
    );

    expect(screen.getByText("Usa una contraseña segura")).toBeInTheDocument();
  });
});
