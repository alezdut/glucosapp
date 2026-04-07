"use client";

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import VerifyEmailPage from "../page";
import { resendVerification, verifyEmail } from "@/lib/auth-api";
import { useRouter, useSearchParams } from "next/navigation";
import { createMockRouter, createMockSearchParams } from "@/test/navigation";

jest.mock("@/lib/auth-api", () => ({
  verifyEmail: jest.fn(),
  resendVerification: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

jest.mock("next/link", () => {
  return function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  };
});

const mockVerifyEmail = verifyEmail as jest.MockedFunction<typeof verifyEmail>;
const mockResendVerification = resendVerification as jest.MockedFunction<typeof resendVerification>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseSearchParams = useSearchParams as jest.MockedFunction<typeof useSearchParams>;

describe("VerifyEmailPage", () => {
  const router = createMockRouter();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseRouter.mockReturnValue(router as ReturnType<typeof useRouter>);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("shows an error and resend form when the token is missing", async () => {
    mockUseSearchParams.mockReturnValue(
      createMockSearchParams({}) as ReturnType<typeof useSearchParams>,
    );

    render(<VerifyEmailPage />);

    expect(await screen.findByText("Token de verificación no proporcionado")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reenviar Verificación" })).toBeInTheDocument();
  });

  it("verifies the email and redirects to login", async () => {
    mockUseSearchParams.mockReturnValue(
      createMockSearchParams({ token: "verify-token" }) as ReturnType<typeof useSearchParams>,
    );
    mockVerifyEmail.mockResolvedValue({ message: "Email verificado" });

    render(<VerifyEmailPage />);

    expect(await screen.findByText("Email verificado")).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

    expect(mockVerifyEmail).toHaveBeenCalledWith("verify-token");
    expect(router.push).toHaveBeenCalledWith("/login");
  });

  it("allows resending verification after a verification error", async () => {
    mockUseSearchParams.mockReturnValue(
      createMockSearchParams({ token: "verify-token" }) as ReturnType<typeof useSearchParams>,
    );
    mockVerifyEmail.mockRejectedValue(new Error("Token expirado"));
    mockResendVerification.mockResolvedValue({ message: "Email reenviado" });

    render(<VerifyEmailPage />);

    expect(await screen.findByText("Token expirado")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("tu@email.com"), {
      target: { value: "doctor@example.com" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "Reenviar Verificación" }).closest("form")!,
    );

    await waitFor(() => {
      expect(mockResendVerification).toHaveBeenCalledWith("doctor@example.com");
    });

    expect(await screen.findByText("Email reenviado")).toBeInTheDocument();
  });
});
