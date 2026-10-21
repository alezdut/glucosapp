"use client";

import { fireEvent, render, screen } from "@testing-library/react";
import { GlucoseChart } from "../GlucoseChart";

jest.mock("@mui/material", () => ({
  Tooltip: ({ title, children }: { title: React.ReactNode; children: React.ReactNode }) => (
    <div>
      <div>{title}</div>
      {children}
    </div>
  ),
}));

describe("GlucoseChart", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
      configurable: true,
      value: 900,
    });
  });

  it("renders the empty state", () => {
    render(<GlucoseChart data={[]} days={14} />);

    expect(
      screen.getByText(/evolución de nivel de glucosa - últimos 14 días/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/no hay datos disponibles/i)).toBeInTheDocument();
  });

  it("renders lines, labels, tooltips and hover interactions", () => {
    const { container } = render(
      <GlucoseChart
        data={
          [
            {
              date: "2026-04-01",
              averageGlucose: 65,
              minGlucose: 55,
              maxGlucose: 90,
            },
            {
              date: "2026-04-02",
              averageGlucose: 120,
              minGlucose: 90,
              maxGlucose: 145,
            },
            {
              date: "2026-04-03",
              averageGlucose: 195,
              minGlucose: 170,
              maxGlucose: 240,
            },
          ] as never
        }
      />,
    );

    expect(screen.getByText(/evolución de nivel de glucosa/i)).toBeInTheDocument();
    expect(screen.getByText("50")).toBeInTheDocument();
    expect(screen.getByText("220")).toBeInTheDocument();
    expect(screen.getByText("mg/dL")).toBeInTheDocument();
    expect(screen.getByText(/promedio: 65 mg\/dL/i)).toBeInTheDocument();
    expect(screen.getByText(/promedio: 120 mg\/dL/i)).toBeInTheDocument();
    expect(screen.getByText(/promedio: 195 mg\/dL/i)).toBeInTheDocument();

    const circles = container.querySelectorAll("circle");
    expect(circles).toHaveLength(3);
    expect(circles[0]).toHaveAttribute("fill", "#DC3545");
    expect(circles[1]).toHaveAttribute("fill", "#28A745");
    expect(circles[2]).toHaveAttribute("fill", "#FFC107");

    const hoverTargets = container.querySelectorAll("div[style*='translate(-50%, -50%)']");
    expect(hoverTargets).toHaveLength(3);
    fireEvent.mouseEnter(hoverTargets[0]);
    expect(circles[0]).toHaveAttribute("r", "6");
    fireEvent.mouseLeave(hoverTargets[0]);
    expect(circles[0]).toHaveAttribute("r", "4");
  });
});
