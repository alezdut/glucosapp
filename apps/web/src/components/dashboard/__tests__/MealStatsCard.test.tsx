"use client";

import { render, screen } from "@testing-library/react";
import { MealStatsCard } from "../MealStatsCard";

describe("MealStatsCard", () => {
  it("renders the no-meals state", () => {
    render(
      <MealStatsCard
        stats={
          {
            totalMeals: 0,
            unit: "comidas",
            description: "",
          } as never
        }
      />,
    );

    expect(screen.getByRole("heading", { name: /comidas registradas/i })).toBeInTheDocument();
    expect(screen.getByText(/en los últimos 30 días/i)).toBeInTheDocument();
  });

  it("renders the populated meals state", () => {
    render(
      <MealStatsCard
        stats={
          {
            totalMeals: 12,
            unit: "comidas",
            description: "Sus pacientes registraron 12 comidas esta semana.",
          } as never
        }
      />,
    );

    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText(/sus pacientes registraron/i)).toBeInTheDocument();
    expect(screen.getByText(/12 comidas/i)).toBeInTheDocument();
  });
});
