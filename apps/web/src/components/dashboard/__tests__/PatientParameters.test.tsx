"use client";

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { updatePatientProfile } from "@/lib/dashboard-api";
import { PatientParameters } from "../PatientParameters";

jest.mock("@/lib/dashboard-api", () => ({
  updatePatientProfile: jest.fn(),
}));

const mockUpdatePatientProfile = updatePatientProfile as jest.MockedFunction<
  typeof updatePatientProfile
>;

const baseProfile = {
  id: "profile-1",
  email: "patient@example.com",
  icRatioBreakfast: 10,
  icRatioLunch: 12,
  icRatioDinner: 14,
  insulinSensitivityFactor: 55,
  diaHours: 4,
  targetGlucose: 100,
  minTargetGlucose: 80,
  maxTargetGlucose: 140,
  mealTimeBreakfastStart: 480,
  mealTimeBreakfastEnd: 600,
  mealTimeLunchStart: 600,
  mealTimeLunchEnd: 900,
  mealTimeDinnerStart: 900,
  mealTimeDinnerEnd: 480,
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const invalidateQueries = jest.spyOn(queryClient, "invalidateQueries");

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = "PatientParametersTestWrapper";

  return { queryClient, invalidateQueries, Wrapper };
};

const renderComponent = (profile = baseProfile, patientId = "patient-1") => {
  const { invalidateQueries, Wrapper } = createWrapper();
  const view = render(<PatientParameters profile={profile} patientId={patientId} />, {
    wrapper: Wrapper,
  });

  return {
    ...view,
    invalidateQueries,
  };
};

const getNumberInputs = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('input[type="number"]')) as HTMLInputElement[];

const getTimeInputs = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('input[type="time"]')) as HTMLInputElement[];

describe("PatientParameters", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    localStorage.setItem("accessToken", "stored-access");
    jest.spyOn(window, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders profile values and resets the form when the profile changes", () => {
    const { container, rerender } = renderComponent();
    const numberInputs = getNumberInputs(container);
    const timeInputs = getTimeInputs(container);

    expect(screen.getByText(/parámetros de tratamiento/i)).toBeInTheDocument();
    expect(numberInputs[0]).toHaveValue(55);
    expect(numberInputs[1]).toHaveValue(4);
    expect(numberInputs[2]).toHaveValue(100);
    expect(numberInputs[5]).toHaveValue(10);
    expect(numberInputs[7]).toHaveValue(14);
    expect(timeInputs.map((input) => input.value)).toEqual([
      "08:00",
      "10:00",
      "10:00",
      "15:00",
      "15:00",
      "08:00",
    ]);
    expect(screen.queryByRole("button", { name: /guardar cambios/i })).not.toBeInTheDocument();

    const nextProfile = {
      ...baseProfile,
      insulinSensitivityFactor: 60,
      diaHours: 5,
      targetGlucose: 110,
      mealTimeBreakfastStart: 420,
      mealTimeBreakfastEnd: 540,
      mealTimeLunchStart: 540,
      mealTimeLunchEnd: 840,
      mealTimeDinnerStart: 840,
      mealTimeDinnerEnd: 420,
    };
    rerender(<PatientParameters profile={nextProfile} patientId="patient-2" />);

    expect(numberInputs[0]).toHaveValue(60);
    expect(numberInputs[1]).toHaveValue(5);
    expect(numberInputs[2]).toHaveValue(110);
    expect(timeInputs.map((input) => input.value)).toEqual([
      "07:00",
      "09:00",
      "09:00",
      "14:00",
      "14:00",
      "07:00",
    ]);
    expect(screen.queryByRole("button", { name: /guardar cambios/i })).not.toBeInTheDocument();
  });

  it("auto-adjusts adjacent meal times when one slot changes", async () => {
    const { container } = renderComponent();
    const timeInputs = getTimeInputs(container);

    fireEvent.change(timeInputs[1], { target: { value: "10:30" } });

    await waitFor(() => expect(timeInputs[2]).toHaveValue("10:30"));
    expect(screen.getByRole("button", { name: /guardar cambios/i })).toBeInTheDocument();

    fireEvent.change(timeInputs[5], { target: { value: "07:30" } });

    await waitFor(() => expect(timeInputs[0]).toHaveValue("07:30"));
  });

  it("validates numeric and meal-time constraints before saving", () => {
    const { container } = renderComponent();
    const numberInputs = getNumberInputs(container);
    const timeInputs = getTimeInputs(container);

    fireEvent.change(numberInputs[5], { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: /guardar cambios/i }));
    expect(window.alert).toHaveBeenLastCalledWith("Ratio IC Desayuno debe estar entre 1 y 30");
    expect(mockUpdatePatientProfile).not.toHaveBeenCalled();

    fireEvent.change(numberInputs[5], { target: { value: "10" } });
    fireEvent.change(numberInputs[3], { target: { value: "150" } });
    fireEvent.change(numberInputs[4], { target: { value: "140" } });
    fireEvent.click(screen.getByRole("button", { name: /guardar cambios/i }));
    expect(window.alert).toHaveBeenLastCalledWith(
      "La glucosa objetivo mínima debe ser menor que la máxima",
    );

    fireEvent.change(numberInputs[3], { target: { value: "80" } });
    fireEvent.change(numberInputs[4], { target: { value: "140" } });
    fireEvent.change(timeInputs[0], { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /guardar cambios/i }));
    expect(window.alert).toHaveBeenLastCalledWith(
      "Por favor completa todos los horarios de comidas",
    );
  });

  it("saves valid parameters, allows dinner to cross midnight and invalidates the patient cache", async () => {
    mockUpdatePatientProfile.mockResolvedValue(baseProfile as never);
    const { container, invalidateQueries } = renderComponent();
    const numberInputs = getNumberInputs(container);
    const timeInputs = getTimeInputs(container);

    fireEvent.change(numberInputs[0], { target: { value: "60" } });
    fireEvent.change(numberInputs[1], { target: { value: "5" } });
    fireEvent.change(numberInputs[2], { target: { value: "105" } });
    fireEvent.change(numberInputs[3], { target: { value: "85" } });
    fireEvent.change(numberInputs[4], { target: { value: "145" } });
    fireEvent.change(numberInputs[5], { target: { value: "9" } });
    fireEvent.change(numberInputs[6], { target: { value: "11" } });
    fireEvent.change(numberInputs[7], { target: { value: "13" } });
    fireEvent.change(timeInputs[4], { target: { value: "23:00" } });
    fireEvent.change(timeInputs[5], { target: { value: "06:00" } });

    fireEvent.click(screen.getByRole("button", { name: /guardar cambios/i }));

    await waitFor(() => expect(mockUpdatePatientProfile).toHaveBeenCalledTimes(1));
    expect(mockUpdatePatientProfile).toHaveBeenCalledWith("stored-access", "patient-1", {
      icRatioBreakfast: 9,
      icRatioLunch: 11,
      icRatioDinner: 13,
      insulinSensitivityFactor: 60,
      diaHours: 5,
      targetGlucose: 105,
      minTargetGlucose: 85,
      maxTargetGlucose: 145,
      mealTimeBreakfastStart: 360,
      mealTimeBreakfastEnd: 600,
      mealTimeLunchStart: 600,
      mealTimeLunchEnd: 1380,
      mealTimeDinnerStart: 1380,
      mealTimeDinnerEnd: 360,
    });
    await waitFor(() =>
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["patientProfile", "patient-1"] }),
    );
    expect(window.alert).toHaveBeenLastCalledWith(
      "Parámetros de tratamiento actualizados correctamente",
    );
  });

  it("shows an error alert when the update request fails", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    mockUpdatePatientProfile.mockRejectedValue(new Error("request failed"));
    const { container } = renderComponent();
    const numberInputs = getNumberInputs(container);

    fireEvent.change(numberInputs[0], { target: { value: "61" } });
    fireEvent.click(screen.getByRole("button", { name: /guardar cambios/i }));

    await waitFor(() =>
      expect(window.alert).toHaveBeenLastCalledWith(
        "No se pudo actualizar los parámetros de tratamiento",
      ),
    );
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
