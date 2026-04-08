"use client";

import { render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { Sidebar } from "../Sidebar";

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    className,
    children,
  }: {
    href: string;
    className?: string;
    children: React.ReactNode;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;

describe("Sidebar", () => {
  it("renders all navigation items and highlights the active one", () => {
    mockUsePathname.mockReturnValue("/dashboard/patients");

    render(<Sidebar />);

    expect(screen.getByLabelText("GlucosApp")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /inicio/i })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: /pacientes/i })).toHaveAttribute(
      "href",
      "/dashboard/patients",
    );
    expect(screen.getByRole("link", { name: /citas/i })).toHaveAttribute(
      "href",
      "/dashboard/appointments",
    );
    expect(screen.getByRole("link", { name: /comunicacion/i })).toHaveAttribute(
      "href",
      "/dashboard/communication",
    );
    expect(screen.getByRole("link", { name: /ajustes & reportes/i })).toHaveAttribute(
      "href",
      "/dashboard/settings",
    );

    expect(screen.getByRole("link", { name: /pacientes/i }).className).toContain("bg-gray-100");
  });
});
