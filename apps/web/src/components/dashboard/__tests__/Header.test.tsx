"use client";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useAuth } from "@/contexts/auth-context";
import { usePathname, useRouter } from "next/navigation";
import { Header } from "../Header";

const mockPush = jest.fn();

jest.mock("@/contexts/auth-context", () => ({
  useAuth: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
  useRouter: jest.fn(),
}));

jest.mock("../NotificationDropdown", () => ({
  NotificationDropdown: () => <div>Notifications</div>,
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

describe("Header", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({ push: mockPush } as never);
    mockUsePathname.mockReturnValue("/dashboard");
    mockUseAuth.mockReturnValue({
      user: { firstName: "Ana", lastName: "Paz", email: "ana@example.com" },
      logout: jest.fn().mockResolvedValue(undefined),
      isLoading: false,
      isAuthenticated: true,
      login: jest.fn(),
      register: jest.fn(),
      refreshUser: jest.fn(),
    } as never);
  });

  it("renders the search input outside the patients page and toggles the menu", async () => {
    render(<Header />);

    expect(screen.getByPlaceholderText(/search patients/i)).toBeDisabled();
    expect(screen.getByText("Notifications")).toBeInTheDocument();
    expect(screen.getByText("AP")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /ana/i }));
    expect(screen.getByText(/cerrar sesión/i)).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    await waitFor(() => expect(screen.queryByText(/cerrar sesión/i)).not.toBeInTheDocument());
  });

  it("hides search on patients page and logs out", async () => {
    const logout = jest.fn().mockResolvedValue(undefined);
    mockUsePathname.mockReturnValue("/dashboard/patients");
    mockUseAuth.mockReturnValue({
      user: { firstName: "", lastName: "", email: "doctor@example.com" },
      logout,
      isLoading: false,
      isAuthenticated: true,
      login: jest.fn(),
      register: jest.fn(),
      refreshUser: jest.fn(),
    } as never);

    render(<Header />);

    expect(screen.queryByPlaceholderText(/search patients/i)).not.toBeInTheDocument();
    expect(screen.getByText("D")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /doctor@example.com/i }));
    fireEvent.click(screen.getByRole("button", { name: /cerrar sesión/i }));

    await waitFor(() => expect(logout).toHaveBeenCalled());
    expect(mockPush).toHaveBeenCalledWith("/login");
  });
});
