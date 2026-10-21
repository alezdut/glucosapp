import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { fireEvent, screen } from "@testing-library/react";
import { DateRangePicker } from "../DateRangePicker";
import { renderMobile } from "../../../test/render-mobile";

const mockCalendarProps: Array<{
  visible: boolean;
  onConfirm: (startDate: Date, endDate: Date) => void;
  onCancel: () => void;
}> = [];

jest.mock("../DateRangeCalendar", () => ({
  DateRangeCalendar: ({
    visible,
    onConfirm,
    onCancel,
  }: {
    visible: boolean;
    onConfirm: (startDate: Date, endDate: Date) => void;
    onCancel: () => void;
  }) => {
    mockCalendarProps.push({ visible, onConfirm, onCancel });
    if (!visible) return null;

    return (
      <div>
        <span>calendar-visible</span>
        <button
          type="button"
          onClick={() =>
            onConfirm(new Date(2026, 3, 1, 0, 0, 0, 0), new Date(2026, 3, 5, 0, 0, 0, 0))
          }
        >
          calendar-confirm
        </button>
        <button type="button" onClick={onCancel}>
          calendar-cancel
        </button>
      </div>
    );
  },
}));

describe("DateRangePicker", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCalendarProps.length = 0;
  });

  it("applies today, week and month presets", () => {
    const onDateRangeChange = jest.fn();

    renderMobile(
      <DateRangePicker
        startDate={new Date(2026, 3, 2, 0, 0, 0, 0)}
        endDate={new Date(2026, 3, 9, 23, 59, 59, 999)}
        onDateRangeChange={onDateRangeChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /hoy/i }));

    const [todayStart, todayEnd] = onDateRangeChange.mock.calls[0] as [Date, Date];

    expect(todayStart).toBeInstanceOf(Date);
    expect(todayEnd).toBeInstanceOf(Date);
    expect(todayStart.getHours()).toBe(0);
    expect(todayStart.getMinutes()).toBe(0);
    expect(todayStart.getSeconds()).toBe(0);
    expect(todayEnd.getHours()).toBe(23);
    expect(todayEnd.getMinutes()).toBe(59);
    expect(todayEnd.getSeconds()).toBe(59);
    expect(todayStart.getDate()).toBe(todayEnd.getDate());

    fireEvent.click(screen.getByRole("button", { name: /7 días/i }));

    const [weekStart, weekEnd] = onDateRangeChange.mock.calls[1] as [Date, Date];

    expect(weekStart.getHours()).toBe(0);
    expect(weekStart.getMinutes()).toBe(0);
    expect(weekStart.getSeconds()).toBe(0);
    expect(weekEnd.getHours()).toBe(23);
    expect(weekEnd.getMinutes()).toBe(59);
    expect(weekEnd.getSeconds()).toBe(59);
    expect(weekEnd.getTime() - weekStart.getTime()).toBe(
      7 * 24 * 60 * 60 * 1000 + 23 * 60 * 60 * 1000 + 59 * 60 * 1000 + 59 * 1000,
    );

    fireEvent.click(screen.getByRole("button", { name: /30 días/i }));

    const [monthStart, monthEnd] = onDateRangeChange.mock.calls[2] as [Date, Date];

    expect(monthStart.getHours()).toBe(0);
    expect(monthStart.getMinutes()).toBe(0);
    expect(monthStart.getSeconds()).toBe(0);
    expect(monthEnd.getHours()).toBe(23);
    expect(monthEnd.getMinutes()).toBe(59);
    expect(monthEnd.getSeconds()).toBe(59);
    expect(monthEnd.getTime() - monthStart.getTime()).toBe(
      30 * 24 * 60 * 60 * 1000 + 23 * 60 * 60 * 1000 + 59 * 60 * 1000 + 59 * 1000,
    );
  });

  it("opens calendar, confirms custom range and can cancel", () => {
    const onDateRangeChange = jest.fn();

    renderMobile(
      <DateRangePicker
        startDate={new Date(2026, 3, 2, 0, 0, 0, 0)}
        endDate={new Date(2026, 3, 9, 23, 59, 59, 999)}
        onDateRangeChange={onDateRangeChange}
      />,
    );

    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[4]);

    expect(screen.getByText("calendar-visible")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /calendar-confirm/i }));

    expect(onDateRangeChange).toHaveBeenCalledWith(
      new Date(2026, 3, 1, 0, 0, 0, 0),
      new Date(2026, 3, 5, 0, 0, 0, 0),
    );

    fireEvent.click(buttons[4]);
    fireEvent.click(screen.getByRole("button", { name: /calendar-cancel/i }));

    const latestProps = mockCalendarProps[mockCalendarProps.length - 1];
    expect(latestProps.visible).toBe(false);
  });
});
