"use client";

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import RegisterPage from "../page";
import { useAuth } from "@/contexts/auth-context";
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

describe("RegisterPage", () => {
  const push = jest.fn();
  const register = jest.fn();

  const submit = () => {
    fireEvent.submit(screen.getByRole("button", { name: "Registrarse" }).closest("form")!);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      login: jest.fn(),
      register,
      logout: jest.fn(),
      refreshUser: jest.fn(),
    });
    mockUseRouter.mockReturnValue({ push } as ReturnType<typeof useRouter>);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("validates mismatched passwords before submitting", async () => {
    render(<RegisterPage />);

    fireEvent.change(screen.getByPlaceholderText("Juan"), { target: { value: "Ada" } });
    fireEvent.change(screen.getByPlaceholderText("Pérez"), { target: { value: "Lovelace" } });
    fireEvent.change(screen.getByPlaceholderText("tu@email.com"), {
      target: { value: "doctor@example.com" },
    });
    fireEvent.change(screen.getAllByPlaceholderText("••••••••")[0], {
      target: { value: "Password1!" },
    });
    fireEvent.change(screen.getAllByPlaceholderText("••••••••")[1], {
      target: { value: "Different1!" },
    });

    submit();

    expect(await screen.findByText("Las contraseñas no coinciden")).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });

  it("registers successfully and redirects to login", async () => {
    register.mockResolvedValue(undefined);

    render(<RegisterPage />);

    fireEvent.change(screen.getByPlaceholderText("Juan"), { target: { value: "Ada" } });
    fireEvent.change(screen.getByPlaceholderText("Pérez"), { target: { value: "Lovelace" } });
    fireEvent.change(screen.getByPlaceholderText("tu@email.com"), {
      target: { value: "doctor@example.com" },
    });
    fireEvent.change(screen.getAllByPlaceholderText("••••••••")[0], {
      target: { value: "Password1!" },
    });
    fireEvent.change(screen.getAllByPlaceholderText("••••••••")[1], {
      target: { value: "Password1!" },
    });

    submit();

    await waitFor(() => {
      expect(register).toHaveBeenCalledWith("doctor@example.com", "Password1!", "Ada", "Lovelace");
    });

    expect(await screen.findByText("¡Registro Exitoso!")).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

    expect(push).toHaveBeenCalledWith("/login");
  });
});
