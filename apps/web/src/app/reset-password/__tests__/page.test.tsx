"use client";

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ResetPasswordPage from "../page";
import { resetPassword } from "@/lib/auth-api";
import { useRouter, useSearchParams } from "next/navigation";
import { createMockRouter, setMockSearchParams } from "@/test/navigation";

jest.mock("@/lib/auth-api", () => ({
  resetPassword: jest.fn(),
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

const mockResetPassword = resetPassword as jest.MockedFunction<typeof resetPassword>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseSearchParams = useSearchParams as jest.MockedFunction<typeof useSearchParams>;

describe("ResetPasswordPage", () => {
  let router = createMockRouter();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    router = createMockRouter();
    mockUseRouter.mockReturnValue(router);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("shows an error state when the token is missing", async () => {
    setMockSearchParams(mockUseSearchParams, {});

    render(<ResetPasswordPage />);

    expect(
      await screen.findByText("Token de restablecimiento no proporcionado"),
    ).toBeInTheDocument();
  });

  it("validates password confirmation before submitting", async () => {
    setMockSearchParams(mockUseSearchParams, { token: "reset-token" });

    render(<ResetPasswordPage />);

    fireEvent.change(screen.getAllByPlaceholderText("••••••••")[0], {
      target: { value: "Password1!" },
    });
    fireEvent.change(screen.getAllByPlaceholderText("••••••••")[1], {
      target: { value: "Different1!" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "Restablecer Contraseña" }).closest("form")!,
    );

    expect(await screen.findByText("Las contraseñas no coinciden")).toBeInTheDocument();
    expect(mockResetPassword).not.toHaveBeenCalled();
  });

  it("resets the password and redirects to login", async () => {
    setMockSearchParams(mockUseSearchParams, { token: "reset-token" });
    mockResetPassword.mockResolvedValue({ message: "Contraseña restablecida" });

    render(<ResetPasswordPage />);

    fireEvent.change(screen.getAllByPlaceholderText("••••••••")[0], {
      target: { value: "Password1!" },
    });
    fireEvent.change(screen.getAllByPlaceholderText("••••••••")[1], {
      target: { value: "Password1!" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "Restablecer Contraseña" }).closest("form")!,
    );

    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith("reset-token", "Password1!");
    });

    expect(await screen.findByText("¡Contraseña Restablecida!")).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

    expect(router.push).toHaveBeenCalledWith("/login");
  });
});
