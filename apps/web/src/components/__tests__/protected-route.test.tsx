"use client";

import { render, screen, waitFor } from "@testing-library/react";
import { ProtectedRoute } from "../protected-route";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";

jest.mock("@/contexts/auth-context", () => ({
  useAuth: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

describe("ProtectedRoute", () => {
  const push = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({
      push,
    } as ReturnType<typeof useRouter>);
  });

  it("shows a loading indicator while auth state is resolving", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: true,
      isAuthenticated: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      refreshUser: jest.fn(),
    });

    render(
      <ProtectedRoute>
        <div>dashboard</div>
      </ProtectedRoute>,
    );

    expect(screen.queryByText("dashboard")).not.toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated users to login", async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      refreshUser: jest.fn(),
    });

    render(
      <ProtectedRoute>
        <div>dashboard</div>
      </ProtectedRoute>,
    );

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/login");
    });
    expect(screen.queryByText("dashboard")).not.toBeInTheDocument();
  });

  it("renders protected content for authenticated users", () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: "doctor-1",
        email: "doctor@example.com",
        firstName: "Ada",
        lastName: "Lovelace",
        role: "DOCTOR",
        createdAt: new Date().toISOString(),
        emailVerified: true,
      },
      isLoading: false,
      isAuthenticated: true,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      refreshUser: jest.fn(),
    });

    render(
      <ProtectedRoute>
        <div>dashboard</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText("dashboard")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
