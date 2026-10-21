"use client";

import { render, screen } from "@testing-library/react";
import AppointmentsPage from "../page";

jest.mock("@/components/protected-route", () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/components/dashboard/Sidebar", () => ({
  Sidebar: () => <div>Sidebar</div>,
}));

jest.mock("@/components/dashboard/Header", () => ({
  Header: () => <div>Header</div>,
}));

jest.mock("@/components/dashboard/AppointmentsManager", () => ({
  AppointmentsManager: () => <div>Appointments Manager</div>,
}));

describe("AppointmentsPage", () => {
  it("renders the appointments dashboard shell", () => {
    render(<AppointmentsPage />);

    expect(screen.getByText("Citas")).toBeInTheDocument();
    expect(screen.getByText(/programa, actualiza y cierra las citas/i)).toBeInTheDocument();
    expect(screen.getByText("Sidebar")).toBeInTheDocument();
    expect(screen.getByText("Header")).toBeInTheDocument();
    expect(screen.getByText("Appointments Manager")).toBeInTheDocument();
  });
});
