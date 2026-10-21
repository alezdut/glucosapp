import { fireEvent, screen } from "@testing-library/react";
import { AlertConfigCard } from "@/components/dashboard/AlertConfigCard";
import { renderWithProviders } from "@/test/test-utils";

describe("AlertConfigCard", () => {
  it("shows content only when enabled if toggle is visible", () => {
    const onToggle = jest.fn();

    renderWithProviders(
      <AlertConfigCard title="Alertas críticas" enabled={false} onToggle={onToggle}>
        <div>Contenido</div>
      </AlertConfigCard>,
    );

    expect(screen.queryByText("Contenido")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("switch"));
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it("always shows content when the toggle is hidden", () => {
    renderWithProviders(
      <AlertConfigCard
        title="Alertas críticas"
        enabled={false}
        onToggle={jest.fn()}
        showToggle={false}
      >
        <div>Contenido</div>
      </AlertConfigCard>,
    );

    expect(screen.getByText("Contenido")).toBeInTheDocument();
  });
});
