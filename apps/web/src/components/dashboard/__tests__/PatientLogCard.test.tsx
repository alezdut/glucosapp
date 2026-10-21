"use client";

import { fireEvent, render, screen } from "@testing-library/react";
import { PatientLogCard } from "../PatientLogCard";

describe("PatientLogCard", () => {
  it("renders summary data and expands full details", () => {
    render(
      <PatientLogCard
        entry={
          {
            recordedAt: "2026-04-08T14:30:00.000Z",
            mealType: "BREAKFAST",
            glucoseEntry: { mgdl: 190 },
            carbohydrates: 45,
            recentExercise: true,
            alcohol: true,
            illness: true,
            stress: true,
            menstruation: true,
            highFatMeal: true,
            mealTemplate: {
              name: "Desayuno habitual",
              foodItems: [{ id: "fi-1", name: "Tostadas", quantity: 60, carbs: 30 }],
            },
            insulinDose: {
              units: 5.5,
              type: "BOLUS",
              calculatedUnits: 6.1,
              carbInsulin: 4.2,
              correctionInsulin: 1.2,
              iobSubtracted: 0.6,
              wasManuallyEdited: true,
            },
          } as never
        }
      />,
    );

    expect(screen.getByText(/desayuno/i)).toBeInTheDocument();
    expect(screen.getByText(/190 mg\/dL/i)).toBeInTheDocument();
    expect(screen.getByText("45g")).toBeInTheDocument();
    expect(screen.getByText("5.5 U")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /ver detalles del registro/i }));
    expect(screen.getByText(/comida guardada/i)).toBeInTheDocument();
    expect(screen.getByText("Desayuno habitual")).toBeInTheDocument();
    expect(screen.getByText(/dosis calculada/i)).toBeInTheDocument();
    expect(screen.getByText(/rápida/i)).toBeInTheDocument();
    expect(screen.getByText(/editado manualmente/i)).toBeInTheDocument();
    expect(screen.getByText(/ejercicio/i)).toBeInTheDocument();
    expect(screen.getByText(/alta en grasa/i)).toBeInTheDocument();
  });

  it("handles missing values and keyboard toggle", () => {
    render(
      <PatientLogCard
        entry={
          {
            recordedAt: "2026-04-08T14:30:00.000Z",
            mealType: undefined,
            carbohydrates: 0,
            insulinDose: { units: 0 },
          } as never
        }
      />,
    );

    expect(screen.getByText(/registro/i)).toBeInTheDocument();
    expect(screen.getAllByText("—")).toHaveLength(3);

    const card = screen.getByRole("button", { name: /ver detalles del registro/i });
    fireEvent.keyDown(card, { key: "Enter" });
    expect(screen.getByText(/registro/i)).toBeInTheDocument();
  });
});
