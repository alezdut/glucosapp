import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { DateRangeCalendar } from "../DateRangeCalendar";

const calendarPropsHistory: any[] = [];

jest.mock("react-native-calendars", () => ({
  Calendar: (props: any) => {
    calendarPropsHistory.push(props);

    return (
      <div data-testid="calendar-mock">
        <button type="button" onClick={() => props.onDayPress({ dateString: "2026-04-10" })}>
          pick-10
        </button>
        <button type="button" onClick={() => props.onDayPress({ dateString: "2026-04-12" })}>
          pick-12
        </button>
      </div>
    );
  },
}));

describe("DateRangeCalendar", () => {
  beforeEach(() => {
    calendarPropsHistory.length = 0;
  });

  it("selects a start/end range and confirms with day boundaries", () => {
    const onConfirm = jest.fn();

    render(
      <DateRangeCalendar
        visible
        startDate={new Date(2026, 3, 1, 0, 0, 0, 0)}
        endDate={new Date(2026, 3, 2, 0, 0, 0, 0)}
        onConfirm={onConfirm}
        onCancel={jest.fn()}
        minDate={new Date(2026, 0, 1, 0, 0, 0, 0)}
        maxDate={new Date(2026, 11, 31, 0, 0, 0, 0)}
      />,
    );

    const firstCalendarProps = calendarPropsHistory[calendarPropsHistory.length - 1];
    expect(firstCalendarProps.minDate).toBe("2026-01-01");
    expect(firstCalendarProps.maxDate).toBe("2026-12-31");

    fireEvent.click(screen.getByRole("button", { name: "pick-10" }));
    fireEvent.click(screen.getByRole("button", { name: "pick-12" }));
    fireEvent.click(screen.getByRole("button", { name: /confirmar/i }));

    expect(onConfirm).toHaveBeenCalledWith(
      new Date(2026, 3, 10, 0, 0, 0, 0),
      new Date(2026, 3, 12, 23, 59, 59, 999),
    );

    const latestCalendarProps = calendarPropsHistory[calendarPropsHistory.length - 1];
    expect(latestCalendarProps.markingType).toBe("period");
    expect(latestCalendarProps.markedDates["2026-04-10"]).toBeTruthy();
    expect(latestCalendarProps.markedDates["2026-04-11"]).toBeTruthy();
    expect(latestCalendarProps.markedDates["2026-04-12"]).toBeTruthy();
  });

  it("resets state and calls onCancel", () => {
    const onCancel = jest.fn();

    render(
      <DateRangeCalendar
        visible
        startDate={new Date(2026, 3, 1, 0, 0, 0, 0)}
        endDate={new Date(2026, 3, 3, 0, 0, 0, 0)}
        onConfirm={jest.fn()}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "pick-12" }));
    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);

    const latestCalendarProps = calendarPropsHistory[calendarPropsHistory.length - 1];
    expect(latestCalendarProps.current).toBe("2026-04-01");
  });
});
