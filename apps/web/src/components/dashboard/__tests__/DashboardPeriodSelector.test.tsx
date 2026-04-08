"use client";

import { fireEvent, render, screen } from "@testing-library/react";
import { DashboardPeriodSelector } from "../DashboardPeriodSelector";

describe("DashboardPeriodSelector", () => {
  it("renders all period options and calls onChange", () => {
    const onChange = jest.fn();
    render(<DashboardPeriodSelector selectedDays={30} onChange={onChange} />);

    expect(screen.getByText(/período:/i)).toBeInTheDocument();
    ["7 días", "15 días", "30 días", "90 días"].forEach((label) => {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "7 días" }));
    expect(onChange).toHaveBeenCalledWith(7);
  });
});
