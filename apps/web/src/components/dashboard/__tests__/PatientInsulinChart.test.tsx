"use client";

import { render, screen } from "@testing-library/react";
import { PatientInsulinChart } from "../PatientInsulinChart";

jest.mock("@mui/material", () => ({
  Tooltip: ({ title, children }: { title: React.ReactNode; children: React.ReactNode }) => (
    <div>
      <div>{title}</div>
      {children}
    </div>
  ),
}));

describe("PatientInsulinChart", () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
      configurable: true,
      value: 900,
    });
  });

  it("renders the empty state", () => {
    render(<PatientInsulinChart data={[]} />);

    expect(screen.getByText(/dosis de insulina/i)).toBeInTheDocument();
    expect(screen.getByText(/no hay datos disponibles/i)).toBeInTheDocument();
  });

  it("renders basal and bolus bars plus tooltip text", () => {
    const { container } = render(
      <PatientInsulinChart
        data={
          [
            { month: "2026-01", averageBasal: 10, averageBolus: 4 },
            { month: "2026-02", averageBasal: 0, averageBolus: 0 },
            { month: "2026-03", averageBasal: 12, averageBolus: 7 },
          ] as never
        }
      />,
    );

    expect(screen.getByText(/dosis promedio mensual/i)).toBeInTheDocument();
    expect(screen.getByText(/ene - basal: 10 U/i)).toBeInTheDocument();
    expect(screen.getByText(/ene - bolus: 4 U/i)).toBeInTheDocument();
    expect(screen.getByText(/feb - basal: sin datos/i)).toBeInTheDocument();
    expect(screen.getByText(/mar - bolus: 7 U/i)).toBeInTheDocument();

    const rects = Array.from(container.querySelectorAll("rect"));
    const barRects = rects.filter((rect) => rect.getAttribute("rx") === "2");
    expect(barRects.length).toBeGreaterThanOrEqual(6);
    expect(barRects[0]).toHaveAttribute("fill", "#86efac");
    expect(barRects[1]).toHaveAttribute("fill", "#3b82f6");
    expect(barRects[2]).toHaveAttribute("fill", "#e5e7eb");
    expect(barRects[3]).toHaveAttribute("fill", "#e5e7eb");
  });
});
