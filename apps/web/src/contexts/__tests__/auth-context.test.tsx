import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { createUser } from "@/test/factories";

const mockGetCurrentUser = jest.fn();
const mockLogin = jest.fn();
const mockLogout = jest.fn();
const mockRefreshAccessToken = jest.fn();
const mockRegister = jest.fn();
const mockIsTokenExpiringSoon = jest.fn();

jest.mock("@/lib/auth-api", () => ({
  getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
  login: (...args: unknown[]) => mockLogin(...args),
  logout: (...args: unknown[]) => mockLogout(...args),
  refreshAccessToken: (...args: unknown[]) => mockRefreshAccessToken(...args),
  register: (...args: unknown[]) => mockRegister(...args),
}));

jest.mock("@glucosapp/auth-utils", () => ({
  isTokenExpiringSoon: (...args: unknown[]) => mockIsTokenExpiringSoon(...args),
}));

const AuthConsumer = () => {
  const { user, isLoading, isAuthenticated, login, logout, refreshUser } = useAuth();

  return (
    <div>
      <div data-testid="loading">{String(isLoading)}</div>
      <div data-testid="authenticated">{String(isAuthenticated)}</div>
      <div data-testid="user-email">{user?.email ?? "none"}</div>
      <button onClick={() => login("doctor@example.com", "Password1!")}>login</button>
      <button onClick={() => logout()}>logout</button>
      <button onClick={() => refreshUser()}>refresh</button>
    </div>
  );
};

describe("AuthProvider", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    jest.useRealTimers();
    mockIsTokenExpiringSoon.mockReturnValue(false);
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  const renderProvider = () =>
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

  it("finishes loading without calling the API when there are no tokens", async () => {
    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    expect(mockGetCurrentUser).not.toHaveBeenCalled();
    expect(screen.getByTestId("authenticated")).toHaveTextContent("false");
  });

  it("loads the current user with the stored access token", async () => {
    localStorage.setItem("accessToken", "stored-access");
    localStorage.setItem("refreshToken", "stored-refresh");
    mockGetCurrentUser.mockResolvedValue(createUser());

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("user-email")).toHaveTextContent("doctor@example.com");
    });

    expect(mockGetCurrentUser).toHaveBeenCalledWith("stored-access");
    expect(screen.getByTestId("authenticated")).toHaveTextContent("true");
  });

  it("refreshes the access token before loading the current user when the token is expiring", async () => {
    localStorage.setItem("accessToken", "stale-access");
    localStorage.setItem("refreshToken", "stored-refresh");
    mockIsTokenExpiringSoon.mockReturnValue(true);
    mockRefreshAccessToken.mockResolvedValue({
      accessToken: "fresh-access",
      refreshToken: "fresh-refresh",
    });
    mockGetCurrentUser.mockResolvedValue(createUser({ email: "fresh@example.com" }));

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("user-email")).toHaveTextContent("fresh@example.com");
    });

    expect(mockRefreshAccessToken).toHaveBeenCalledWith("stored-refresh");
    expect(mockGetCurrentUser).toHaveBeenCalledWith("fresh-access");
    expect(localStorage.getItem("accessToken")).toBe("fresh-access");
    expect(localStorage.getItem("refreshToken")).toBe("fresh-refresh");
  });

  it("clears auth state when token refresh fails", async () => {
    localStorage.setItem("accessToken", "stale-access");
    localStorage.setItem("refreshToken", "stored-refresh");
    mockIsTokenExpiringSoon.mockReturnValue(true);
    mockRefreshAccessToken.mockRejectedValue(new Error("expired"));

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    expect(mockGetCurrentUser).not.toHaveBeenCalled();
    expect(screen.getByTestId("authenticated")).toHaveTextContent("false");
    expect(localStorage.getItem("accessToken")).toBeNull();
    expect(localStorage.getItem("refreshToken")).toBeNull();
  });

  it("stores tokens on login and clears them on logout", async () => {
    mockLogin.mockResolvedValue({
      accessToken: "new-access",
      refreshToken: "new-refresh",
      user: createUser({ email: "logged@example.com" }),
    });
    mockLogout.mockResolvedValue(undefined);

    renderProvider();

    fireEvent.click(screen.getByText("login"));

    await waitFor(() => {
      expect(screen.getByTestId("user-email")).toHaveTextContent("logged@example.com");
    });

    expect(localStorage.getItem("accessToken")).toBe("new-access");
    expect(localStorage.getItem("refreshToken")).toBe("new-refresh");

    fireEvent.click(screen.getByText("logout"));

    await waitFor(() => {
      expect(screen.getByTestId("user-email")).toHaveTextContent("none");
    });

    expect(mockLogout).toHaveBeenCalledWith("new-access", "new-refresh");
    expect(localStorage.getItem("accessToken")).toBeNull();
    expect(localStorage.getItem("refreshToken")).toBeNull();
  });

  it("refreshes the user on demand and periodically checks for expiring tokens", async () => {
    jest.useFakeTimers();
    localStorage.setItem("accessToken", "stored-access");
    localStorage.setItem("refreshToken", "stored-refresh");
    mockGetCurrentUser.mockResolvedValue(createUser({ email: "doctor@example.com" }));

    renderProvider();

    await waitFor(() => {
      expect(mockGetCurrentUser).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByText("refresh"));

    await waitFor(() => {
      expect(mockGetCurrentUser).toHaveBeenCalledTimes(2);
    });

    mockIsTokenExpiringSoon.mockReturnValue(true);
    mockRefreshAccessToken.mockResolvedValue({
      accessToken: "timer-access",
      refreshToken: "timer-refresh",
    });

    await act(async () => {
      jest.advanceTimersByTime(30000);
    });

    await waitFor(() => {
      expect(mockRefreshAccessToken).toHaveBeenCalledWith("stored-refresh");
    });
  });
});
