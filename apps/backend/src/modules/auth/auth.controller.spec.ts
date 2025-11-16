import { Test, TestingModule } from "@nestjs/testing";
import {
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./services/auth.service";
import { createMockUserResponse } from "../../common/test-helpers/fixtures";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { VerifyEmailDto } from "./dto/verify-email.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { ResendVerificationDto } from "./dto/resend-verification.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";

describe("AuthController", () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockUser = createMockUserResponse();

  beforeEach(async () => {
    const mockAuthService = {
      register: jest.fn(),
      login: jest.fn(),
      verifyEmail: jest.fn(),
      resendVerificationEmail: jest.fn(),
      refreshTokens: jest.fn(),
      logout: jest.fn(),
      forgotPassword: jest.fn(),
      resetPassword: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("register", () => {
    it("should register new user successfully", async () => {
      const registerDto: RegisterDto = {
        email: "newuser@example.com",
        password: "SecurePass123!",
        firstName: "New",
        lastName: "User",
      };
      const expectedResponse = {
        message: "Registration successful. Please check your email to verify your account.",
      };

      (authService.register as jest.Mock).mockResolvedValue(expectedResponse);

      const result = await controller.register(registerDto);

      expect(result).toEqual(expectedResponse);
      expect(authService.register).toHaveBeenCalledWith(registerDto);
    });

    it("should throw ConflictException if email already exists", async () => {
      const registerDto: RegisterDto = {
        email: "existing@example.com",
        password: "SecurePass123!",
        firstName: "Existing",
        lastName: "User",
      };

      (authService.register as jest.Mock).mockRejectedValue(
        new ConflictException("Email already registered"),
      );

      await expect(controller.register(registerDto)).rejects.toThrow(ConflictException);
    });
  });

  describe("login", () => {
    it("should login successfully", async () => {
      const loginDto: LoginDto = {
        email: "test@example.com",
        password: "SecurePass123!",
      };
      const mockRequest = {
        user: mockUser,
      } as any;
      const expectedResponse = {
        accessToken: "access-token",
        refreshToken: "refresh-token",
        user: mockUser,
      };

      (authService.login as jest.Mock).mockResolvedValue(expectedResponse);

      const result = await controller.login(mockRequest);

      expect(result).toEqual(expectedResponse);
      expect(authService.login).toHaveBeenCalledWith(mockUser);
    });

    it("should throw UnauthorizedException for invalid credentials", async () => {
      const loginDto: LoginDto = {
        email: "test@example.com",
        password: "WrongPassword",
      };
      const mockRequest = {
        user: null,
      } as any;

      // LocalAuthGuard would throw before reaching controller
      // This test assumes guard passes but service throws
      (authService.login as jest.Mock).mockRejectedValue(
        new UnauthorizedException("Invalid credentials"),
      );

      await expect(controller.login(mockRequest)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("verifyEmail", () => {
    it("should verify email successfully", async () => {
      const verifyEmailDto: VerifyEmailDto = {
        token: "verification-token",
      };
      const expectedResponse = {
        message: "Email verified successfully. You can now log in.",
      };

      (authService.verifyEmail as jest.Mock).mockResolvedValue(expectedResponse);

      const result = await controller.verifyEmail(verifyEmailDto);

      expect(result).toEqual(expectedResponse);
      expect(authService.verifyEmail).toHaveBeenCalledWith(verifyEmailDto.token);
    });

    it("should throw BadRequestException for invalid token", async () => {
      const verifyEmailDto: VerifyEmailDto = {
        token: "invalid-token",
      };

      (authService.verifyEmail as jest.Mock).mockRejectedValue(
        new BadRequestException("Invalid or expired verification token"),
      );

      await expect(controller.verifyEmail(verifyEmailDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe("resendVerification", () => {
    it("should resend verification email successfully", async () => {
      const resendDto: ResendVerificationDto = {
        email: "test@example.com",
      };
      const expectedResponse = {
        message: "Verification email sent. Please check your inbox.",
      };

      (authService.resendVerificationEmail as jest.Mock).mockResolvedValue(expectedResponse);

      const result = await controller.resendVerification(resendDto);

      expect(result).toEqual(expectedResponse);
      expect(authService.resendVerificationEmail).toHaveBeenCalledWith(resendDto.email);
    });

    it("should throw NotFoundException if user not found", async () => {
      const resendDto: ResendVerificationDto = {
        email: "nonexistent@example.com",
      };

      (authService.resendVerificationEmail as jest.Mock).mockRejectedValue(
        new NotFoundException("User not found"),
      );

      await expect(controller.resendVerification(resendDto)).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException if email already verified", async () => {
      const resendDto: ResendVerificationDto = {
        email: "verified@example.com",
      };

      (authService.resendVerificationEmail as jest.Mock).mockRejectedValue(
        new BadRequestException("Email already verified"),
      );

      await expect(controller.resendVerification(resendDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe("refresh", () => {
    it("should refresh tokens successfully", async () => {
      const refreshTokenDto: RefreshTokenDto = {
        refreshToken: "valid-refresh-token",
      };
      const expectedResponse = {
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
      };

      (authService.refreshTokens as jest.Mock).mockResolvedValue(expectedResponse);

      const result = await controller.refresh(refreshTokenDto);

      expect(result).toEqual(expectedResponse);
      expect(authService.refreshTokens).toHaveBeenCalledWith(refreshTokenDto.refreshToken);
    });

    it("should throw UnauthorizedException for invalid token", async () => {
      const refreshTokenDto: RefreshTokenDto = {
        refreshToken: "invalid-token",
      };

      (authService.refreshTokens as jest.Mock).mockRejectedValue(
        new UnauthorizedException("Invalid refresh token"),
      );

      await expect(controller.refresh(refreshTokenDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("logout", () => {
    it("should logout successfully", async () => {
      const refreshTokenDto: RefreshTokenDto = {
        refreshToken: "refresh-token",
      };
      const mockRequest = {
        user: mockUser,
      } as any;
      const expectedResponse = {
        message: "Logged out successfully",
      };

      (authService.logout as jest.Mock).mockResolvedValue(expectedResponse);

      const result = await controller.logout(refreshTokenDto, mockRequest);

      expect(result).toEqual(expectedResponse);
      expect(authService.logout).toHaveBeenCalledWith(refreshTokenDto.refreshToken, mockUser.id);
    });
  });

  describe("getMe", () => {
    it("should return current user", () => {
      const mockRequest = {
        user: mockUser,
      } as any;

      const result = controller.getMe(mockRequest);

      expect(result).toEqual(mockUser);
    });
  });

  describe("forgotPassword", () => {
    it("should send password reset email", async () => {
      const forgotPasswordDto: ForgotPasswordDto = {
        email: "test@example.com",
      };
      const expectedResponse = {
        message:
          "Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña.",
      };

      (authService.forgotPassword as jest.Mock).mockResolvedValue(expectedResponse);

      const result = await controller.forgotPassword(forgotPasswordDto);

      expect(result).toEqual(expectedResponse);
      expect(authService.forgotPassword).toHaveBeenCalledWith(forgotPasswordDto.email);
    });
  });

  describe("resetPassword", () => {
    it("should reset password successfully", async () => {
      const resetPasswordDto: ResetPasswordDto = {
        token: "reset-token",
        newPassword: "NewSecurePass123!",
      };
      const expectedResponse = {
        message: "Contraseña restablecida exitosamente. Ahora puedes iniciar sesión.",
      };

      (authService.resetPassword as jest.Mock).mockResolvedValue(expectedResponse);

      const result = await controller.resetPassword(resetPasswordDto);

      expect(result).toEqual(expectedResponse);
      expect(authService.resetPassword).toHaveBeenCalledWith(
        resetPasswordDto.token,
        resetPasswordDto.newPassword,
      );
    });

    it("should throw BadRequestException for invalid token", async () => {
      const resetPasswordDto: ResetPasswordDto = {
        token: "invalid-token",
        newPassword: "NewSecurePass123!",
      };

      (authService.resetPassword as jest.Mock).mockRejectedValue(
        new BadRequestException("Token inválido o expirado"),
      );

      await expect(controller.resetPassword(resetPasswordDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe("googleAuthCallback", () => {
    it("should handle Google OAuth callback and set cookies", async () => {
      const mockRequest = {
        user: mockUser,
      } as any;
      const mockResponse = {
        cookie: jest.fn(),
        redirect: jest.fn(),
      } as any;
      const authResponse = {
        accessToken: "access-token",
        refreshToken: "refresh-token",
        user: mockUser,
      };

      (authService.login as jest.Mock).mockResolvedValue(authResponse);
      process.env.FRONTEND_URL = "http://localhost:3001";
      process.env.NODE_ENV = "development";

      await controller.googleAuthCallback(mockRequest, mockResponse);

      expect(authService.login).toHaveBeenCalledWith(mockUser);
      expect(mockResponse.cookie).toHaveBeenCalledTimes(2);
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        "accessToken",
        authResponse.accessToken,
        expect.any(Object),
      );
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        "refreshToken",
        authResponse.refreshToken,
        expect.any(Object),
      );
      expect(mockResponse.redirect).toHaveBeenCalledWith("http://localhost:3001/auth/callback");
    });
  });

  describe("googleAuthMobileCallback", () => {
    it("should handle Google OAuth mobile callback and redirect with tokens", async () => {
      const mockRequest = {
        user: mockUser,
      } as any;
      const mockResponse = {
        redirect: jest.fn(),
      } as any;
      const authResponse = {
        accessToken: "access-token",
        refreshToken: "refresh-token",
        user: mockUser,
      };

      (authService.login as jest.Mock).mockResolvedValue(authResponse);

      await controller.googleAuthMobileCallback(mockRequest, mockResponse);

      expect(authService.login).toHaveBeenCalledWith(mockUser);
      expect(mockResponse.redirect).toHaveBeenCalled();
      const redirectUrl = (mockResponse.redirect as jest.Mock).mock.calls[0][0];
      expect(redirectUrl).toContain("glucosapp://auth/callback");
      expect(redirectUrl).toContain("accessToken");
      expect(redirectUrl).toContain("refreshToken");
    });
  });
});
