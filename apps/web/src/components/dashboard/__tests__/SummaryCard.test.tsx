import { render, screen } from "@testing-library/react";
import { SummaryCard } from "../SummaryCard";

const TestIcon = ({ className }: { className?: string }) => (
  <svg data-testid="icon" className={className} />
);

describe("SummaryCard", () => {
  it("renders plain card content", () => {
    render(<SummaryCard title="Pacientes" value={12} description="Activos" icon={TestIcon} />);

    expect(screen.getByText("Pacientes")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Activos")).toBeInTheDocument();
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("wraps the card in a link when href is provided", () => {
    render(
      <SummaryCard
        title="Alertas"
        value={2}
        description="Críticas"
        icon={TestIcon}
        href="/dashboard/settings"
      />,
    );

    expect(screen.getByRole("link")).toHaveAttribute("href", "/dashboard/settings");
  });
});
