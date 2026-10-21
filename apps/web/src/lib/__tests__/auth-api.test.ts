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
  resendVerification,
  resetPassword,
  verifyEmail,
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

  it("verifies email addresses and resends verification emails", async () => {
    mockPost
      .mockResolvedValueOnce({ data: { message: "Email verificado" } })
      .mockResolvedValueOnce({ data: { message: "Verificación reenviada" } });

    await expect(verifyEmail("verify-token")).resolves.toEqual({ message: "Email verificado" });
    await expect(resendVerification("doctor@example.com")).resolves.toEqual({
      message: "Verificación reenviada",
    });

    expect(mockPost).toHaveBeenNthCalledWith(1, "/auth/verify-email", { token: "verify-token" });
    expect(mockPost).toHaveBeenNthCalledWith(2, "/auth/resend-verification", {
      email: "doctor@example.com",
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

  it("throws normalized errors for current user, refresh and recovery endpoints", async () => {
    mockGet.mockResolvedValueOnce({
      error: { status: 401, message: "Token expirado", code: "TOKEN_EXPIRED" },
    });
    mockPost
      .mockResolvedValueOnce({
        error: { status: 401, message: "Refresh inválido", code: "INVALID_REFRESH" },
      })
      .mockResolvedValueOnce({
        error: { status: 400, message: "Verificación inválida", code: "INVALID_TOKEN" },
      })
      .mockResolvedValueOnce({
        error: { status: 404, message: "Usuario no encontrado", code: "USER_NOT_FOUND" },
      })
      .mockResolvedValueOnce({
        error: { status: 400, message: "No se pudo enviar reset", code: "RESET_FAILED" },
      })
      .mockResolvedValueOnce({
        error: { status: 400, message: "Contraseña inválida", code: "INVALID_PASSWORD" },
      });

    await expect(getCurrentUser("expired-token")).rejects.toMatchObject({
      message: "Token expirado",
      status: 401,
      code: "TOKEN_EXPIRED",
    });
    await expect(refreshAccessToken("bad-refresh")).rejects.toMatchObject({
      message: "Refresh inválido",
      status: 401,
      code: "INVALID_REFRESH",
    });
    await expect(verifyEmail("bad-token")).rejects.toMatchObject({
      message: "Verificación inválida",
      status: 400,
      code: "INVALID_TOKEN",
    });
    await expect(resendVerification("missing@example.com")).rejects.toMatchObject({
      message: "Usuario no encontrado",
      status: 404,
      code: "USER_NOT_FOUND",
    });
    await expect(forgotPassword("doctor@example.com")).rejects.toMatchObject({
      message: "No se pudo enviar reset",
      status: 400,
      code: "RESET_FAILED",
    });
    await expect(resetPassword("bad-token", "short")).rejects.toMatchObject({
      message: "Contraseña inválida",
      status: 400,
      code: "INVALID_PASSWORD",
    });
  });
});
