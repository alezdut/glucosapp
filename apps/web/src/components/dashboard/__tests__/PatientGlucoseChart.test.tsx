"use client";

import { render, screen } from "@testing-library/react";
import { PatientGlucoseChart } from "../PatientGlucoseChart";

jest.mock("@mui/material", () => ({
  Tooltip: ({ title, children }: { title: React.ReactNode; children: React.ReactNode }) => (
    <div>
      <div>{title}</div>
      {children}
    </div>
  ),
}));

describe("PatientGlucoseChart", () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
      configurable: true,
      value: 900,
    });
  });

  it("renders the empty state", () => {
    render(<PatientGlucoseChart data={[]} />);

    expect(screen.getByText(/niveles de glucosa/i)).toBeInTheDocument();
    expect(screen.getByText(/no hay datos disponibles/i)).toBeInTheDocument();
  });

  it("renders bars, month labels and tooltip text", () => {
    const { container } = render(
      <PatientGlucoseChart
        data={
          [
            { month: "2026-01", averageGlucose: 110 },
            { month: "2026-02", averageGlucose: 0 },
            { month: "2026-03", averageGlucose: 145 },
          ] as never
        }
      />,
    );

    expect(screen.getByText(/promedio mensual \(últimos 12 meses\)/i)).toBeInTheDocument();
    expect(screen.getByText(/ene: 110 mg\/dL/i)).toBeInTheDocument();
    expect(screen.getByText(/feb: sin datos/i)).toBeInTheDocument();
    expect(screen.getByText(/mar: 145 mg\/dL/i)).toBeInTheDocument();

    const rects = Array.from(container.querySelectorAll("rect"));
    const barRects = rects.filter((rect) => rect.getAttribute("rx") === "2");
    expect(barRects).toHaveLength(3);
    expect(barRects[0]).toHaveAttribute("fill", "#3b82f6");
    expect(barRects[1]).toHaveAttribute("fill", "#e5e7eb");
  });
});
