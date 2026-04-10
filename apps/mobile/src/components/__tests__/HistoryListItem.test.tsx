import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { InsulinType, MealCategory, type LogEntry } from "@glucosapp/types";
import { HistoryListItem } from "../HistoryListItem";

const baseEntry: LogEntry = {
  id: "log-1",
  userId: "user-1",
  recordedAt: "2026-04-09T12:00:00.000Z",
  mealType: MealCategory.BREAKFAST,
  carbohydrates: 45,
  glucoseEntry: {
    id: "g-1",
    userId: "user-1",
    mgdl: 185,
    recordedAt: "2026-04-09T12:00:00.000Z",
  },
  insulinDose: {
    id: "i-1",
    userId: "user-1",
    units: 5.5,
    recordedAt: "2026-04-09T12:00:00.000Z",
    type: InsulinType.BOLUS,
    wasManuallyEdited: true,
    calculatedUnits: 5.0,
    carbInsulin: 3.5,
    correctionInsulin: 2.0,
    iobSubtracted: 0.5,
  },
  mealTemplate: {
    id: "meal-1",
    userId: "user-1",
    name: "Desayuno clásico",
    carbohydrates: 45,
    foodItems: [
      {
        id: "f-1",
        mealId: "meal-1",
        name: "Pan",
        quantity: 40,
        carbs: 20,
      },
    ],
    createdAt: "2026-04-09T12:00:00.000Z",
    updatedAt: "2026-04-09T12:00:00.000Z",
  },
  recentExercise: true,
  alcohol: true,
  illness: true,
  stress: true,
  menstruation: true,
  highFatMeal: true,
};

describe("HistoryListItem", () => {
  it("renders collapsed summary and triggers onToggle", () => {
    const onToggle = jest.fn();

    render(<HistoryListItem entry={baseEntry} isExpanded={false} onToggle={onToggle} />);

    expect(screen.getByText("Desayuno")).toBeTruthy();
    expect(screen.getByText("Glucosa")).toBeTruthy();
    expect(screen.getByText("185 mg/dL")).toBeTruthy();
    expect(screen.getByText("Carbs")).toBeTruthy();
    expect(screen.getByText("45g")).toBeTruthy();
    expect(screen.getAllByText("Insulina")).toHaveLength(1);
    expect(screen.getByText("5.5 U")).toBeTruthy();

    expect(screen.queryByText("Contexto Adicional")).toBeNull();

    fireEvent.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("renders expanded detail sections, warning and context badges", () => {
    render(<HistoryListItem entry={baseEntry} isExpanded onToggle={jest.fn()} />);

    expect(screen.getByText("Comida")).toBeTruthy();
    expect(screen.getByText("Carbohidratos totales:")).toBeTruthy();
    expect(screen.getByText("Comida guardada:")).toBeTruthy();
    expect(screen.getByText("Desayuno clásico")).toBeTruthy();
    expect(screen.getByText("• Pan")).toBeTruthy();
    expect(screen.getByText("40g (20g carbs)")).toBeTruthy();

    expect(screen.getAllByText("Insulina").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Tipo:")).toBeTruthy();
    expect(screen.getByText("Rápida")).toBeTruthy();
    expect(screen.getByText("Dosis calculada:")).toBeTruthy();
    expect(screen.getByText("Editado manualmente")).toBeTruthy();
    expect(screen.getByText("Desglose del cálculo:")).toBeTruthy();
    expect(screen.getByText("• Dosis prandial: 3.5 U")).toBeTruthy();
    expect(screen.getByText("• Corrección: 2.0 U")).toBeTruthy();
    expect(screen.getByText("• IOB restado: -0.5 U")).toBeTruthy();

    expect(screen.getByText("Contexto Adicional")).toBeTruthy();
    expect(screen.getByText("Ejercicio Reciente")).toBeTruthy();
    expect(screen.getByText("Alcohol")).toBeTruthy();
    expect(screen.getByText("Enfermedad")).toBeTruthy();
    expect(screen.getByText("Estrés")).toBeTruthy();
    expect(screen.getByText("Periodo Menstrual")).toBeTruthy();
    expect(screen.getByText("Comida Alta en Grasa")).toBeTruthy();
  });
});
