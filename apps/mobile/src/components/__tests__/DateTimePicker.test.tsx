import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { Platform } from "react-native";
import { CustomDateTimePicker } from "../DateTimePicker";

const mockPickerDate = new Date(2026, 3, 9, 14, 25, 0, 0);

jest.mock("@react-native-community/datetimepicker", () => ({
  __esModule: true,
  default: ({ onChange }: { onChange: (event: unknown, selectedDate?: Date) => void }) => (
    <button type="button" onClick={() => onChange({}, mockPickerDate)}>
      trigger-native-picker
    </button>
  ),
}));

describe("CustomDateTimePicker", () => {
  const originalPlatform = Platform.OS;

  afterEach(() => {
    Platform.OS = originalPlatform;
  });

  it("opens Android picker and confirms selected date immediately", () => {
    Platform.OS = "android";
    const onDateChange = jest.fn();

    render(
      <CustomDateTimePicker
        value={null}
        label="Fecha"
        placeholder="Seleccionar fecha"
        onDateChange={onDateChange}
      />,
    );

    expect(screen.getByText("Fecha")).toBeTruthy();
    expect(screen.getByText("Seleccionar fecha")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /seleccionar fecha/i }));
    fireEvent.click(screen.getByRole("button", { name: /trigger-native-picker/i }));

    expect(onDateChange).toHaveBeenCalledWith(mockPickerDate);
  });

  it("respects disabled state and renders formatted value", () => {
    Platform.OS = "android";
    const onDateChange = jest.fn();

    const value = new Date(2026, 3, 9, 10, 30, 0, 0);

    render(
      <CustomDateTimePicker
        value={value}
        onDateChange={onDateChange}
        mode="time"
        showIcon={false}
        disabled
      />,
    );

    expect(screen.getByText("10:30")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /10:30/i }));
    expect(onDateChange).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /trigger-native-picker/i })).toBeNull();
  });
});
