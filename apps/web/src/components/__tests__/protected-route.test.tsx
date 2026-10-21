"use client";

import { render, screen, waitFor } from "@testing-library/react";
import { ProtectedRoute } from "../protected-route";
import { useAuth } from "@/contexts/auth-context";
import { createMockRouter } from "@/test/navigation";
import { UserRole } from "@glucosapp/types";
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
  let router = createMockRouter();

  beforeEach(() => {
    jest.clearAllMocks();
    router = createMockRouter();
    mockUseRouter.mockReturnValue(router);
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
    expect(router.push).not.toHaveBeenCalled();
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
      expect(router.push).toHaveBeenCalledWith("/login");
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
        role: UserRole.DOCTOR,
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
    expect(router.push).not.toHaveBeenCalled();
  });
});
