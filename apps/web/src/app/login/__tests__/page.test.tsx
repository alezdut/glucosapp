"use client";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import LoginPage from "../page";
import { useAuth } from "@/contexts/auth-context";
import { createMockRouter } from "@/test/navigation";
import { useRouter } from "next/navigation";
import { resendVerification } from "@/lib/auth-api";

jest.mock("@/contexts/auth-context", () => ({
  useAuth: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@/lib/auth-api", () => ({
  resendVerification: jest.fn(),
}));

jest.mock("next/link", () => {
  return function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  };
});

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockResendVerification = resendVerification as jest.MockedFunction<typeof resendVerification>;
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

  it("toggles password visibility", () => {
    render(<LoginPage />);

    const passwordInput = screen.getByPlaceholderText("••••••••") as HTMLInputElement;
    expect(passwordInput.type).toBe("password");

    fireEvent.click(screen.getByLabelText("Mostrar contraseña"));
    expect((screen.getByPlaceholderText("••••••••") as HTMLInputElement).type).toBe("text");

    fireEvent.click(screen.getByLabelText("Ocultar contraseña"));
    expect((screen.getByPlaceholderText("••••••••") as HTMLInputElement).type).toBe("password");
  });

  it("allows resending verification email after EMAIL_NOT_VERIFIED error", async () => {
    login.mockRejectedValue({
      message: "Debes verificar tu correo",
      code: "EMAIL_NOT_VERIFIED",
    });
    mockResendVerification.mockResolvedValue({
      message: "Email de verificación reenviado",
    } as Awaited<ReturnType<typeof resendVerification>>);

    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText("tu@email.com"), {
      target: { value: "doctor@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "12345678" },
    });
    submitForm();

    const resendButton = await screen.findByRole("button", {
      name: "Reenviar email de confirmación",
    });

    fireEvent.click(resendButton);

    await waitFor(() => {
      expect(mockResendVerification).toHaveBeenCalledWith("doctor@example.com");
    });
    expect(await screen.findByText("Email de verificación reenviado")).toBeInTheDocument();
  });

  it("does not resend verification when email is empty", async () => {
    login.mockRejectedValue({
      message: "Debes verificar tu correo",
      code: "EMAIL_NOT_VERIFIED",
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText("tu@email.com"), {
      target: { value: "doctor@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "12345678" },
    });
    submitForm();

    await screen.findByRole("button", {
      name: "Reenviar email de confirmación",
    });

    fireEvent.change(screen.getByPlaceholderText("tu@email.com"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Reenviar email de confirmación" }));

    expect(mockResendVerification).not.toHaveBeenCalled();
  });

  it("shows resend verification error message when resend fails", async () => {
    login.mockRejectedValue({
      message: "Debes verificar tu correo",
      code: "EMAIL_NOT_VERIFIED",
    });
    mockResendVerification.mockRejectedValue({
      message: "Intenta nuevamente más tarde",
      code: "GENERIC_ERROR",
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText("tu@email.com"), {
      target: { value: "doctor@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "12345678" },
    });
    submitForm();

    fireEvent.click(await screen.findByRole("button", { name: "Reenviar email de confirmación" }));

    expect(await screen.findByText("Intenta nuevamente más tarde")).toBeInTheDocument();
  });
});
