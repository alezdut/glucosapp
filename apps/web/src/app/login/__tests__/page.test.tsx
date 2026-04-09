"use client";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import LoginPage from "../page";
import { useAuth } from "@/contexts/auth-context";
import { createMockRouter } from "@/test/navigation";
import { useRouter } from "next/navigation";

jest.mock("@/contexts/auth-context", () => ({
  useAuth: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("next/link", () => {
  return function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  };
});

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
describe("LoginPage", () => {
  const login = jest.fn();
  let router = createMockRouter();

  const submitForm = () => {
    fireEvent.submit(screen.getByRole("button", { name: "Iniciar Sesión" }).closest("form")!);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    router = createMockRouter();
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      login,
      register: jest.fn(),
      logout: jest.fn(),
      refreshUser: jest.fn(),
    });
    mockUseRouter.mockReturnValue(router);
  });

  it("validates email before submitting", async () => {
    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText("tu@email.com"), {
      target: { value: "correo-invalido" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "12345678" },
    });
    submitForm();

    expect(await screen.findByText(/ingresa un email válido/i)).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it("logs in and redirects to dashboard", async () => {
    login.mockResolvedValue(undefined);

    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText("tu@email.com"), {
      target: { value: "doctor@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "12345678" },
    });
    submitForm();

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith("doctor@example.com", "12345678");
      expect(router.push).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("shows backend error messages when login fails", async () => {
    login.mockRejectedValue({
      message: "Debes verificar tu correo",
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText("tu@email.com"), {
      target: { value: "doctor@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "12345678" },
    });
    submitForm();

    expect(await screen.findByText("Debes verificar tu correo")).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });
});
