"use client";

import { render, screen } from "@testing-library/react";
import { InsulinStatsCard } from "../InsulinStatsCard";

describe("InsulinStatsCard", () => {
  it("renders insulin average and description", () => {
    render(
      <InsulinStatsCard
        stats={
          {
            averageDose: 18.4,
            unit: "U",
            description: "Promedio basado en los últimos 30 días.",
          } as never
        }
      />,
    );

    expect(screen.getByText(/dosis promedio de insulina/i)).toBeInTheDocument();
    expect(screen.getByText("18.4")).toBeInTheDocument();
    expect(screen.getByText("U")).toBeInTheDocument();
    expect(screen.getByText(/promedio basado en los últimos 30 días/i)).toBeInTheDocument();
  });
});
