"use client";

import { render, screen } from "@testing-library/react";
import { RecentAlerts } from "../RecentAlerts";

jest.mock("../AlertCard", () => ({
  AlertCard: ({ alert }: { alert: { id: string } }) => <div>{`Alert ${alert.id}`}</div>,
}));

describe("RecentAlerts", () => {
  it("renders empty state", () => {
    render(<RecentAlerts alerts={[]} />);

    expect(screen.getByRole("heading", { name: /alertas recientes/i })).toBeInTheDocument();
    expect(screen.getByText(/no hay alertas recientes/i)).toBeInTheDocument();
  });

  it("renders alert cards", () => {
    render(<RecentAlerts alerts={[{ id: "alert-1" }, { id: "alert-2" }] as never} />);

    expect(screen.getByText("Alert alert-1")).toBeInTheDocument();
    expect(screen.getByText("Alert alert-2")).toBeInTheDocument();
  });
});
