jest.mock("@glucosapp/api-client", () => ({
  __mockApiClient: {
    GET: jest.fn(),
    POST: jest.fn(),
  },
  makeApiClient: jest.fn(() => ({
    client: {
      GET: jest.requireMock("@glucosapp/api-client").__mockApiClient.GET,
      POST: jest.requireMock("@glucosapp/api-client").__mockApiClient.POST,
    },
  })),
}));

import {
  forgotPassword,
  getCurrentUser,
  login,
  logout,
  refreshAccessToken,
  register,
  resetPassword,
} from "@/lib/auth-api";
import { createUser } from "@/test/factories";

const { __mockApiClient } = jest.requireMock("@glucosapp/api-client") as {
  __mockApiClient: {
    GET: jest.Mock;
    POST: jest.Mock;
  };
};
const mockGet = __mockApiClient.GET;
const mockPost = __mockApiClient.POST;

describe("auth-api", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("sends the doctor role when registering", async () => {
    mockPost.mockResolvedValue({ data: { message: "ok" } });

    await expect(
      register({
        email: "doctor@example.com",
        password: "Password1!",
        firstName: "Ada",
        lastName: "Lovelace",
      }),
    ).resolves.toEqual({ message: "ok" });

    expect(mockPost).toHaveBeenCalledWith("/auth/register", {
      email: "doctor@example.com",
      password: "Password1!",
      firstName: "Ada",
      lastName: "Lovelace",
      role: "DOCTOR",
    });
  });

  it("returns the auth payload on login", async () => {
    const response = {
      accessToken: "access-token",
      refreshToken: "refresh-token",
      user: createUser(),
    };
    mockPost.mockResolvedValue({ data: response });

    await expect(login({ email: "doctor@example.com", password: "Password1!" })).resolves.toEqual(
      response,
    );
    expect(mockPost).toHaveBeenCalledWith("/auth/login", {
      email: "doctor@example.com",
      password: "Password1!",
    });
  });

  it("throws normalized errors when login fails", async () => {
    mockPost.mockResolvedValue({
      error: { status: 401, message: "Credenciales inválidas", code: "INVALID_CREDENTIALS" },
    });

    await expect(
      login({ email: "doctor@example.com", password: "bad-pass" }),
    ).rejects.toMatchObject({
      message: "Credenciales inválidas",
      status: 401,
      code: "INVALID_CREDENTIALS",
    });
  });

  it("fetches the current user with bearer auth", async () => {
    const user = createUser();
    mockGet.mockResolvedValue({ data: user });

    await expect(getCurrentUser("access-token")).resolves.toEqual(user);
    expect(mockGet).toHaveBeenCalledWith("/auth/me", {
      headers: { Authorization: "Bearer access-token" },
    });
  });

  it("refreshes the access token", async () => {
    mockPost.mockResolvedValue({
      data: { accessToken: "new-access", refreshToken: "new-refresh" },
    });

    await expect(refreshAccessToken("refresh-token")).resolves.toEqual({
      accessToken: "new-access",
      refreshToken: "new-refresh",
    });
    expect(mockPost).toHaveBeenCalledWith("/auth/refresh", { refreshToken: "refresh-token" });
  });

  it("requests password reset emails and resets the password", async () => {
    mockPost
      .mockResolvedValueOnce({ data: { message: "Email enviado" } })
      .mockResolvedValueOnce({ data: { message: "Contraseña actualizada" } });

    await expect(forgotPassword("doctor@example.com")).resolves.toEqual({
      message: "Email enviado",
    });
    await expect(resetPassword("reset-token", "NewPassword1!")).resolves.toEqual({
      message: "Contraseña actualizada",
    });

    expect(mockPost).toHaveBeenNthCalledWith(1, "/auth/forgot-password", {
      email: "doctor@example.com",
    });
    expect(mockPost).toHaveBeenNthCalledWith(2, "/auth/reset-password", {
      token: "reset-token",
      newPassword: "NewPassword1!",
    });
  });

  it("logs out with both tokens", async () => {
    mockPost.mockResolvedValue({ data: undefined });

    await expect(logout("access-token", "refresh-token")).resolves.toBeUndefined();
    expect(mockPost).toHaveBeenCalledWith(
      "/auth/logout",
      { refreshToken: "refresh-token" },
      { headers: { Authorization: "Bearer access-token" } },
    );
  });
});
