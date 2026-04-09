"use client";

import { render, screen, waitFor } from "@testing-library/react";
import Home from "../page";
import { useAuth } from "@/contexts/auth-context";
import { createMockRouter } from "@/test/navigation";
import { useRouter } from "next/navigation";

jest.mock("@/contexts/auth-context", () => ({
  useAuth: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

describe("Home", () => {
  let router = createMockRouter();

  beforeEach(() => {
    jest.clearAllMocks();
    router = createMockRouter();
    mockUseRouter.mockReturnValue(router);
  });

  it("redirects authenticated users to the dashboard", async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: true,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      refreshUser: jest.fn(),
    });

    render(<Home />);

    expect(screen.getByText("Glucosapp")).toBeInTheDocument();
    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("redirects anonymous users to login", async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      refreshUser: jest.fn(),
    });

    render(<Home />);

    expect(screen.getByText("Cargando...")).toBeInTheDocument();
    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith("/login");
    });
  });
});
