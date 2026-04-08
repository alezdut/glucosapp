"use client";

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useAuth } from "@/contexts/auth-context";
import { acknowledgeAlert } from "@/lib/dashboard-api";
import { useRouter } from "next/navigation";
import { AlertCard } from "../AlertCard";

const mockPush = jest.fn();

jest.mock("@/contexts/auth-context", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/lib/dashboard-api", () => ({
  acknowledgeAlert: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockAcknowledgeAlert = acknowledgeAlert as jest.MockedFunction<typeof acknowledgeAlert>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

describe("AlertCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    localStorage.clear();
    localStorage.setItem("accessToken", "stored-access");
    mockUseRouter.mockReturnValue({ push: mockPush } as never);
    mockUseAuth.mockReturnValue({
      user: { id: "doctor-1", email: "doctor@example.com" },
      isLoading: false,
      isAuthenticated: true,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      refreshUser: jest.fn(),
    } as never);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("renders alert details and navigates to the patient profile", () => {
    render(
      <AlertCard
        alert={
          {
            id: "alert-1",
            severity: "CRITICAL",
            type: "HYPOGLYCEMIA",
            message: "Glucosa muy baja",
            createdAt: "2026-04-08T10:00:00.000Z",
            acknowledged: false,
            userId: "patient-1",
            patient: {
              id: "patient-1",
              firstName: "Ana",
              lastName: "Paz",
              email: "ana@example.com",
            },
          } as never
        }
      />,
    );

    expect(screen.getByText(/ana paz:/i)).toBeInTheDocument();
    expect(screen.getByText(/glucosa muy baja/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /ver detalles/i }));
    expect(mockPush).toHaveBeenCalledWith("/dashboard/patients/patient-1");
  });

  it("acknowledges an alert and invokes the callback after the fade delay", async () => {
    const onAcknowledge = jest.fn();
    mockAcknowledgeAlert.mockResolvedValue({ success: true } as never);

    render(
      <AlertCard
        alert={
          {
            id: "alert-2",
            severity: "HIGH",
            type: "HYPERGLYCEMIA",
            message: "Glucosa alta",
            createdAt: "2026-04-08T10:00:00.000Z",
            acknowledged: false,
            patient: {
              id: "patient-2",
              firstName: "",
              lastName: "",
              email: "fallback@example.com",
            },
          } as never
        }
        onAcknowledge={onAcknowledge}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /descartar/i }));

    await waitFor(() =>
      expect(mockAcknowledgeAlert).toHaveBeenCalledWith("stored-access", "alert-2"),
    );
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /ver detalles/i })).not.toBeInTheDocument(),
    );

    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(onAcknowledge).toHaveBeenCalled();
  });

  it("does not acknowledge when already acknowledged and handles errors", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    mockAcknowledgeAlert.mockRejectedValue(new Error("boom"));

    const { rerender } = render(
      <AlertCard
        alert={
          {
            id: "alert-3",
            severity: "LOW",
            type: "INACTIVITY",
            message: "Sin actividad",
            createdAt: "2026-04-08T10:00:00.000Z",
            acknowledged: true,
          } as never
        }
      />,
    );

    expect(screen.queryByRole("button", { name: /descartar/i })).not.toBeInTheDocument();

    rerender(
      <AlertCard
        alert={
          {
            id: "alert-4",
            severity: "MEDIUM",
            type: "HYPERGLYCEMIA",
            message: "Subiendo",
            createdAt: "2026-04-08T10:00:00.000Z",
            acknowledged: false,
          } as never
        }
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /descartar/i }));
    await waitFor(() => expect(mockAcknowledgeAlert).toHaveBeenCalled());
    expect(consoleSpy).toHaveBeenCalledWith("Failed to acknowledge alert:", expect.any(Error));
    consoleSpy.mockRestore();
  });
});
