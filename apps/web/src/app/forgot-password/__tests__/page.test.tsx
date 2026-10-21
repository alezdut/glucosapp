"use client";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ForgotPasswordPage from "../page";
import { forgotPassword } from "@/lib/auth-api";

jest.mock("@/lib/auth-api", () => ({
  forgotPassword: jest.fn(),
}));

jest.mock("next/link", () => {
  return function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  };
});

const mockForgotPassword = forgotPassword as jest.MockedFunction<typeof forgotPassword>;

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows a success state after requesting a reset email", async () => {
    mockForgotPassword.mockResolvedValue({ message: "Email enviado" });

    render(<ForgotPasswordPage />);

    fireEvent.change(screen.getByPlaceholderText("tu@email.com"), {
      target: { value: "doctor@example.com" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Enviar Email" }).closest("form")!);

    await waitFor(() => {
      expect(mockForgotPassword).toHaveBeenCalledWith("doctor@example.com");
    });

    expect(await screen.findByText("Email Enviado")).toBeInTheDocument();
  });

  it("surfaces API errors", async () => {
    mockForgotPassword.mockRejectedValue(new Error("No se pudo enviar el email"));

    render(<ForgotPasswordPage />);

    fireEvent.change(screen.getByPlaceholderText("tu@email.com"), {
      target: { value: "doctor@example.com" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Enviar Email" }).closest("form")!);

    expect(await screen.findByText("No se pudo enviar el email")).toBeInTheDocument();
  });
});
