import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { Alert } from "react-native";
import TreatmentParametersScreen from "../TreatmentParametersScreen";
import { renderMobile } from "../../../test/render-mobile";
import * as reactQuery from "@tanstack/react-query";
import { createApiClient } from "../../lib/api";

jest.mock("../../lib/api", () => ({
  createApiClient: jest.fn(),
}));

jest.mock("../../components/DateTimePicker", () => ({
  CustomDateTimePicker: ({
    value,
    onDateChange,
  }: {
    value?: Date | null;
    onDateChange: (date: Date) => void;
  }) => {
    const label = value
      ? `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`
      : "Seleccionar hora";

    return (
      <button type="button" onClick={() => onDateChange(new Date(2010, 0, 1, 8, 30, 0, 0))}>
        {label}
      </button>
    );
  },
}));

jest.mock("@tanstack/react-query", () => {
  const actual = jest.requireActual("@tanstack/react-query");

  return {
    ...actual,
    useQuery: jest.fn(),
    useMutation: jest.fn(),
    useQueryClient: jest.fn(),
  };
});

const mockUseQuery = reactQuery.useQuery as jest.MockedFunction<typeof reactQuery.useQuery>;
const mockUseMutation = reactQuery.useMutation as jest.MockedFunction<
  typeof reactQuery.useMutation
>;
const mockUseQueryClient = reactQuery.useQueryClient as jest.MockedFunction<
  typeof reactQuery.useQueryClient
>;

describe("TreatmentParametersScreen", () => {
  const navigation = { goBack: jest.fn() };
  const mutate = jest.fn();
  const invalidateQueries = jest.fn();
  const alertSpy = jest.spyOn(Alert, "alert");
  let useMutationFactory:
    | ((options: any) => { mutate: (value: unknown) => void; isPending: boolean })
    | null = null;

  const profile = {
    icRatioBreakfast: 15,
    icRatioLunch: 12,
    icRatioDinner: 10,
    insulinSensitivityFactor: 50,
    diaHours: 4,
    targetGlucose: 100,
    minTargetGlucose: 80,
    maxTargetGlucose: 140,
    mealTimeBreakfastStart: 420,
    mealTimeBreakfastEnd: 540,
    mealTimeLunchStart: 720,
    mealTimeLunchEnd: 840,
    mealTimeDinnerStart: 1140,
    mealTimeDinnerEnd: 300,
  };
  let currentProfile = { ...profile };

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy.mockImplementation(jest.fn());
    currentProfile = { ...profile };
    useMutationFactory = null;

    mockUseQuery.mockReturnValue({
      data: currentProfile,
      isLoading: false,
    } as never);

    mockUseMutation.mockReturnValue({
      mutate,
      isPending: false,
    } as never);

    mockUseMutation.mockImplementation((options: any) => {
      if (useMutationFactory) {
        return useMutationFactory(options) as never;
      }

      return {
        mutate,
        isPending: false,
      } as never;
    });

    mockUseQueryClient.mockReturnValue({
      invalidateQueries,
    } as never);

    (createApiClient as jest.Mock).mockReturnValue({
      PATCH: jest.fn(),
      GET: jest.fn(),
    });
  });

  it("shows loading while profile data is resolving", () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as never);

    renderMobile(
      <TreatmentParametersScreen navigation={navigation as never} route={{} as never} />,
    );

    expect(screen.getByTestId("activity-indicator")).toBeTruthy();
  });

  it("shows validation error when breakfast IC ratio is out of range", async () => {
    renderMobile(
      <TreatmentParametersScreen navigation={navigation as never} route={{} as never} />,
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("15")).toBeTruthy();
    });

    fireEvent.change(screen.getByDisplayValue("15"), {
      target: { value: "0" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(alertSpy).toHaveBeenCalledWith("Error", "Ratio IC Desayuno debe estar entre 1 y 30");
    expect(mutate).not.toHaveBeenCalled();
  });

  it("submits normalized treatment parameters when data is valid", async () => {
    renderMobile(
      <TreatmentParametersScreen navigation={navigation as never} route={{} as never} />,
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("15")).toBeTruthy();
      expect(screen.getByDisplayValue("140")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(mutate).toHaveBeenCalledWith({
      icRatioBreakfast: 15,
      icRatioLunch: 12,
      icRatioDinner: 10,
      insulinSensitivityFactor: 50,
      diaHours: 4,
      targetGlucose: 100,
      minTargetGlucose: 80,
      maxTargetGlucose: 140,
      mealTimeBreakfastStart: 420,
      mealTimeBreakfastEnd: 540,
      mealTimeLunchStart: 720,
      mealTimeLunchEnd: 840,
      mealTimeDinnerStart: 1140,
      mealTimeDinnerEnd: 300,
    });
  });

  it("shows validation error when minimum target is greater than maximum", async () => {
    renderMobile(
      <TreatmentParametersScreen navigation={navigation as never} route={{} as never} />,
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("80")).toBeTruthy();
      expect(screen.getByDisplayValue("140")).toBeTruthy();
    });

    fireEvent.change(screen.getByDisplayValue("80"), {
      target: { value: "150" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(alertSpy).toHaveBeenCalledWith(
      "Error",
      "La glucosa objetivo mínima debe ser menor que la máxima",
    );
    expect(mutate).not.toHaveBeenCalled();
  });

  it("shows validation error when meal schedules are incomplete", async () => {
    currentProfile = {
      ...profile,
      mealTimeDinnerStart: undefined,
      mealTimeDinnerEnd: undefined,
    };

    mockUseQuery.mockReturnValue({
      data: currentProfile,
      isLoading: false,
    } as never);

    renderMobile(
      <TreatmentParametersScreen navigation={navigation as never} route={{} as never} />,
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("15")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(alertSpy).toHaveBeenCalledWith(
      "Error",
      "Por favor completa todos los horarios de comidas",
    );
    expect(mutate).not.toHaveBeenCalled();
  });

  it("shows validation error when lunch IC ratio is out of range", async () => {
    renderMobile(
      <TreatmentParametersScreen navigation={navigation as never} route={{} as never} />,
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("12")).toBeTruthy();
    });

    fireEvent.change(screen.getByDisplayValue("12"), {
      target: { value: "31" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(alertSpy).toHaveBeenCalledWith("Error", "Ratio IC Almuerzo debe estar entre 1 y 30");
    expect(mutate).not.toHaveBeenCalled();
  });

  it("shows validation error when dinner IC ratio is out of range", async () => {
    renderMobile(
      <TreatmentParametersScreen navigation={navigation as never} route={{} as never} />,
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("10")).toBeTruthy();
    });

    fireEvent.change(screen.getByDisplayValue("10"), {
      target: { value: "0" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(alertSpy).toHaveBeenCalledWith("Error", "Ratio IC Cena debe estar entre 1 y 30");
    expect(mutate).not.toHaveBeenCalled();
  });

  it("shows validation error when sensitivity factor is out of range", async () => {
    renderMobile(
      <TreatmentParametersScreen navigation={navigation as never} route={{} as never} />,
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("50")).toBeTruthy();
    });

    fireEvent.change(screen.getByDisplayValue("50"), {
      target: { value: "9" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(alertSpy).toHaveBeenCalledWith(
      "Error",
      "Factor de Sensibilidad debe estar entre 10 y 200",
    );
    expect(mutate).not.toHaveBeenCalled();
  });

  it("shows validation error when DIA hours are out of range", async () => {
    renderMobile(
      <TreatmentParametersScreen navigation={navigation as never} route={{} as never} />,
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("4")).toBeTruthy();
    });

    fireEvent.change(screen.getByDisplayValue("4"), {
      target: { value: "1" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(alertSpy).toHaveBeenCalledWith(
      "Error",
      "Duración de Acción de Insulina debe estar entre 2 y 8 horas",
    );
    expect(mutate).not.toHaveBeenCalled();
  });

  it("shows validation error when target glucose is out of range", async () => {
    renderMobile(
      <TreatmentParametersScreen navigation={navigation as never} route={{} as never} />,
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("100")).toBeTruthy();
    });

    fireEvent.change(screen.getByDisplayValue("100"), {
      target: { value: "181" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(alertSpy).toHaveBeenCalledWith(
      "Error",
      "Glucosa Objetivo debe estar entre 70 y 180 mg/dL",
    );
    expect(mutate).not.toHaveBeenCalled();
  });

  it("shows validation error when max target glucose is out of range", async () => {
    renderMobile(
      <TreatmentParametersScreen navigation={navigation as never} route={{} as never} />,
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("140")).toBeTruthy();
    });

    fireEvent.change(screen.getByDisplayValue("140"), {
      target: { value: "201" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(alertSpy).toHaveBeenCalledWith(
      "Error",
      "Glucosa Objetivo Máxima debe estar entre 80 y 200 mg/dL",
    );
    expect(mutate).not.toHaveBeenCalled();
  });

  it("auto-adjusts linked meal times when breakfast start and end change", async () => {
    renderMobile(
      <TreatmentParametersScreen navigation={navigation as never} route={{} as never} />,
    );

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: "08:00" }).length).toBe(1);
      expect(screen.getAllByRole("button", { name: "10:00" }).length).toBe(1);
      expect(screen.getAllByRole("button", { name: "13:00" }).length).toBe(1);
      expect(screen.getAllByRole("button", { name: "15:00" }).length).toBe(1);
      expect(screen.getAllByRole("button", { name: "20:00" }).length).toBe(1);
      expect(screen.getAllByRole("button", { name: "06:00" }).length).toBe(1);
    });

    fireEvent.click(screen.getAllByRole("button", { name: "08:00" })[0]);

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: "08:30" }).length).toBeGreaterThanOrEqual(2);
    });

    fireEvent.click(screen.getAllByRole("button", { name: "10:00" })[0]);

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: "08:30" }).length).toBeGreaterThanOrEqual(2);
    });
  });

  it("auto-adjusts linked meal times when lunch start and end change", async () => {
    renderMobile(
      <TreatmentParametersScreen navigation={navigation as never} route={{} as never} />,
    );

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: "13:00" }).length).toBe(1);
      expect(screen.getAllByRole("button", { name: "15:00" }).length).toBe(1);
    });

    fireEvent.click(screen.getAllByRole("button", { name: "13:00" })[0]);

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: "08:30" }).length).toBeGreaterThanOrEqual(2);
    });

    fireEvent.click(screen.getAllByRole("button", { name: "15:00" })[0]);

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: "08:30" }).length).toBeGreaterThanOrEqual(3);
    });
  });

  it("auto-adjusts linked meal times when dinner start and end change", async () => {
    renderMobile(
      <TreatmentParametersScreen navigation={navigation as never} route={{} as never} />,
    );

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: "20:00" }).length).toBe(1);
      expect(screen.getAllByRole("button", { name: "06:00" }).length).toBe(1);
    });

    fireEvent.click(screen.getAllByRole("button", { name: "20:00" })[0]);

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: "08:30" }).length).toBeGreaterThanOrEqual(2);
    });

    fireEvent.click(screen.getAllByRole("button", { name: "06:00" })[0]);

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: "08:30" }).length).toBeGreaterThanOrEqual(3);
    });
  });

  it("submits treatment parameters and runs the success callback", async () => {
    useMutationFactory = (options: any) => ({
      mutate: async (payload: unknown) => {
        await options.mutationFn(payload);
        options.onSuccess?.();
      },
      isPending: false,
    });

    const patch = jest.fn().mockResolvedValue({ data: { ok: true } });
    (createApiClient as jest.Mock).mockReturnValue({
      PATCH: patch,
      GET: jest.fn(),
    });

    renderMobile(
      <TreatmentParametersScreen navigation={navigation as never} route={{} as never} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => {
      expect(patch).toHaveBeenCalledWith("/profile", {
        icRatioBreakfast: 15,
        icRatioLunch: 12,
        icRatioDinner: 10,
        insulinSensitivityFactor: 50,
        diaHours: 4,
        targetGlucose: 100,
        minTargetGlucose: 80,
        maxTargetGlucose: 140,
        mealTimeBreakfastStart: 420,
        mealTimeBreakfastEnd: 540,
        mealTimeLunchStart: 720,
        mealTimeLunchEnd: 840,
        mealTimeDinnerStart: 1140,
        mealTimeDinnerEnd: 300,
      });
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["profile"] });
      expect(alertSpy).toHaveBeenCalledWith(
        "Éxito",
        "Parámetros de tratamiento actualizados correctamente",
      );
      expect(navigation.goBack).toHaveBeenCalled();
    });
  });

  it("shows the mutation error callback when the profile update fails", async () => {
    useMutationFactory = (options: any) => ({
      mutate: async (payload: unknown) => {
        try {
          await options.mutationFn(payload);
        } catch {
          options.onError?.();
        }
      },
      isPending: false,
    });

    const patch = jest.fn().mockResolvedValue({ error: { message: "boom" } });
    (createApiClient as jest.Mock).mockReturnValue({
      PATCH: patch,
      GET: jest.fn(),
    });

    renderMobile(
      <TreatmentParametersScreen navigation={navigation as never} route={{} as never} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "Error",
        "No se pudo actualizar los parámetros de tratamiento",
      );
    });
  });

  it("shows validation error when breakfast start time is after breakfast end", async () => {
    currentProfile = {
      ...profile,
      mealTimeBreakfastStart: 600,
      mealTimeBreakfastEnd: 540,
    };

    mockUseQuery.mockReturnValue({
      data: currentProfile,
      isLoading: false,
    } as never);

    renderMobile(
      <TreatmentParametersScreen navigation={navigation as never} route={{} as never} />,
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("15")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(alertSpy).toHaveBeenCalledWith(
      "Error",
      "La hora de inicio de desayuno debe ser anterior a la hora de fin",
    );
    expect(mutate).not.toHaveBeenCalled();
  });

  it("shows validation error when lunch start time is after lunch end", async () => {
    currentProfile = {
      ...profile,
      mealTimeLunchStart: 900,
      mealTimeLunchEnd: 840,
    };

    mockUseQuery.mockReturnValue({
      data: currentProfile,
      isLoading: false,
    } as never);

    renderMobile(
      <TreatmentParametersScreen navigation={navigation as never} route={{} as never} />,
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("15")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(alertSpy).toHaveBeenCalledWith(
      "Error",
      "La hora de inicio de almuerzo debe ser anterior a la hora de fin",
    );
    expect(mutate).not.toHaveBeenCalled();
  });

  it("shows validation error for malformed dinner schedule edge case", async () => {
    currentProfile = {
      ...profile,
      mealTimeDinnerStart: 1439,
      mealTimeDinnerEnd: 60,
    };

    mockUseQuery.mockReturnValue({
      data: currentProfile,
      isLoading: false,
    } as never);

    renderMobile(
      <TreatmentParametersScreen navigation={navigation as never} route={{} as never} />,
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("15")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(alertSpy).toHaveBeenCalledWith("Error", "Por favor verifica los horarios de cena");
    expect(mutate).not.toHaveBeenCalled();
  });
});
