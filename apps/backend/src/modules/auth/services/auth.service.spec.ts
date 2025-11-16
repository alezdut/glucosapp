import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import {
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { AuthService } from "./auth.service";
import { TokenService } from "./token.service";
import { EmailService } from "./email.service";
import { createMockConfigService } from "../../../common/test-helpers/config.mock";
import { createMockPrismaService } from "../../../common/test-helpers/prisma.mock";
import {
  createMockUser,
  createMockUserResponse,
  createMockAccount,
  createMockRefreshToken,
} from "../../../common/test-helpers/fixtures";
import { UserRole } from "@prisma/client";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";

jest.mock("jsonwebtoken");

describe("AuthService", () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let tokenService: TokenService;
  let emailService: EmailService;
  let configService: ConfigService;

  beforeEach(async () => {
    const mockPrisma = createMockPrismaService();
    const mockConfig = createMockConfigService();
    const mockTokenService = {
      generateAccessToken: jest.fn(),
      generateRefreshToken: jest.fn(),
      generateVerificationToken: jest.fn(),
      validateRefreshToken: jest.fn(),
      revokeRefreshToken: jest.fn(),
      cleanupExpiredTokens: jest.fn(),
    };
    const mockEmailService = {
      sendVerificationEmail: jest.fn(),
      sendPasswordResetEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: TokenService,
          useValue: mockTokenService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: ConfigService,
          useValue: mockConfig,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    tokenService = module.get<TokenService>(TokenService);
    emailService = module.get<EmailService>(EmailService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("register", () => {
    const registerDto = {
      email: "newuser@example.com",
      password: "SecurePass123!",
      firstName: "New",
      lastName: "User",
      role: UserRole.PATIENT,
    };

    it("should register new user successfully", async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.user.create as jest.Mock).mockResolvedValue(createMockUser());
      (tokenService.generateVerificationToken as jest.Mock).mockReturnValue("verification-token");
      (emailService.sendVerificationEmail as jest.Mock).mockResolvedValue(undefined);

      const result = await service.register(registerDto);

      expect(result).toEqual({
        message: "Registration successful. Please check your email to verify your account.",
      });
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
      expect(prismaService.user.create).toHaveBeenCalled();
      expect(tokenService.generateVerificationToken).toHaveBeenCalled();
      expect(emailService.sendVerificationEmail).toHaveBeenCalled();
    });

    it("should throw ConflictException if email already exists", async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(createMockUser());

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      expect(prismaService.user.create).not.toHaveBeenCalled();
    });

    it("should hash password before storing", async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.user.create as jest.Mock).mockResolvedValue(createMockUser());
      (tokenService.generateVerificationToken as jest.Mock).mockReturnValue("verification-token");
      (emailService.sendVerificationEmail as jest.Mock).mockResolvedValue(undefined);

      await service.register(registerDto);

      const createCall = (prismaService.user.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.password).not.toBe(registerDto.password);
      expect(createCall.data.password.length).toBeGreaterThan(50); // bcrypt hash
    });

    it("should set default role to PATIENT if not provided", async () => {
      const dtoWithoutRole = { ...registerDto };
      delete (dtoWithoutRole as any).role;

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.user.create as jest.Mock).mockResolvedValue(createMockUser());
      (tokenService.generateVerificationToken as jest.Mock).mockReturnValue("verification-token");
      (emailService.sendVerificationEmail as jest.Mock).mockResolvedValue(undefined);

      await service.register(dtoWithoutRole);

      const createCall = (prismaService.user.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.role).toBe(UserRole.PATIENT);
    });
  });

  describe("validateLocalUser", () => {
    const email = "test@example.com";
    const password = "SecurePass123!";

    it("should validate user credentials successfully", async () => {
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = createMockUser({
        email,
        password: hashedPassword,
        emailVerified: true,
      });

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(user);

      const result = await service.validateLocalUser(email, password);

      expect(result).toMatchObject({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      });
    });

    it("should throw UnauthorizedException if user not found", async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.validateLocalUser(email, password)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should throw UnauthorizedException if password is invalid", async () => {
      const user = createMockUser({
        email,
        password: await bcrypt.hash("wrong-password", 10),
        emailVerified: true,
      });

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(user);

      await expect(service.validateLocalUser(email, password)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should throw UnauthorizedException if email not verified", async () => {
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = createMockUser({
        email,
        password: hashedPassword,
        emailVerified: false,
      });

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(user);

      await expect(service.validateLocalUser(email, password)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should throw UnauthorizedException if user has no password (OAuth only)", async () => {
      const user = createMockUser({
        email,
        password: null,
        emailVerified: true,
      });

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(user);

      await expect(service.validateLocalUser(email, password)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe("login", () => {
    it("should generate access and refresh tokens", async () => {
      const user = createMockUserResponse();
      const accessToken = "access-token";
      const refreshToken = "refresh-token";

      (tokenService.generateAccessToken as jest.Mock).mockReturnValue(accessToken);
      (tokenService.generateRefreshToken as jest.Mock).mockResolvedValue(refreshToken);
      (tokenService.cleanupExpiredTokens as jest.Mock).mockResolvedValue(undefined);

      const result = await service.login(user);

      expect(result).toEqual({
        accessToken,
        refreshToken,
        user,
      });
      expect(tokenService.generateAccessToken).toHaveBeenCalledWith(user.id, user.email);
      expect(tokenService.generateRefreshToken).toHaveBeenCalledWith(user.id);
      expect(tokenService.cleanupExpiredTokens).toHaveBeenCalledWith(user.id);
    });
  });

  describe("verifyEmail", () => {
    const token = "verification-token";

    it("should verify email successfully", async () => {
      const user = createMockUser({
        emailVerified: false,
        verificationToken: token,
        verificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(user);
      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...user,
        emailVerified: true,
      });

      const result = await service.verifyEmail(token);

      expect(result).toEqual({
        message: "Email verified successfully. You can now log in.",
      });
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: user.id },
        data: {
          emailVerified: true,
          verificationToken: null,
          verificationTokenExpiry: null,
        },
      });
    });

    it("should throw BadRequestException if token is invalid", async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.verifyEmail(token)).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException if token is expired", async () => {
      const user = createMockUser({
        verificationToken: token,
        verificationTokenExpiry: new Date(Date.now() - 1000),
      });

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(user);

      await expect(service.verifyEmail(token)).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException if email already verified", async () => {
      const user = createMockUser({
        emailVerified: true,
        verificationToken: token,
        verificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(user);

      await expect(service.verifyEmail(token)).rejects.toThrow(BadRequestException);
    });
  });

  describe("resendVerificationEmail", () => {
    const email = "test@example.com";

    it("should resend verification email", async () => {
      const user = createMockUser({
        email,
        emailVerified: false,
      });

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(user);
      (prismaService.user.update as jest.Mock).mockResolvedValue(user);
      (tokenService.generateVerificationToken as jest.Mock).mockReturnValue("new-token");
      (emailService.sendVerificationEmail as jest.Mock).mockResolvedValue(undefined);

      const result = await service.resendVerificationEmail(email);

      expect(result).toEqual({
        message: "Verification email sent. Please check your inbox.",
      });
      expect(prismaService.user.update).toHaveBeenCalled();
      expect(emailService.sendVerificationEmail).toHaveBeenCalled();
    });

    it("should throw NotFoundException if user not found", async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.resendVerificationEmail(email)).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException if email already verified", async () => {
      const user = createMockUser({
        email,
        emailVerified: true,
      });

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(user);

      await expect(service.resendVerificationEmail(email)).rejects.toThrow(BadRequestException);
    });
  });

  describe("refreshTokens", () => {
    const refreshToken = "valid-refresh-token";
    const userId = "user-123";
    const user = createMockUser({ id: userId });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should refresh tokens successfully", async () => {
      const payload = { sub: userId, type: "refresh" };
      const newAccessToken = "new-access-token";
      const newRefreshToken = "new-refresh-token";

      (jwt.verify as jest.Mock).mockReturnValue(payload);
      (tokenService.validateRefreshToken as jest.Mock).mockResolvedValue(true);
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(user);
      (tokenService.generateAccessToken as jest.Mock).mockReturnValue(newAccessToken);
      (tokenService.generateRefreshToken as jest.Mock).mockResolvedValue(newRefreshToken);
      (tokenService.revokeRefreshToken as jest.Mock).mockResolvedValue(undefined);

      const result = await service.refreshTokens(refreshToken);

      expect(result).toEqual({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });
      expect(tokenService.revokeRefreshToken).toHaveBeenCalledWith(refreshToken, userId);
    });

    it("should throw UnauthorizedException if token is invalid", async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error("Invalid token");
      });

      await expect(service.refreshTokens(refreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it("should throw UnauthorizedException if token type is wrong", async () => {
      const payload = { sub: userId, type: "access" };
      (jwt.verify as jest.Mock).mockReturnValue(payload);

      await expect(service.refreshTokens(refreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it("should throw UnauthorizedException if refresh token is invalid", async () => {
      const payload = { sub: userId, type: "refresh" };
      (jwt.verify as jest.Mock).mockReturnValue(payload);
      (tokenService.validateRefreshToken as jest.Mock).mockResolvedValue(false);

      await expect(service.refreshTokens(refreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it("should throw UnauthorizedException if user not found", async () => {
      const payload = { sub: userId, type: "refresh" };
      (jwt.verify as jest.Mock).mockReturnValue(payload);
      (tokenService.validateRefreshToken as jest.Mock).mockResolvedValue(true);
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.refreshTokens(refreshToken)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("logout", () => {
    it("should revoke refresh token", async () => {
      const refreshToken = "refresh-token";
      const userId = "user-123";

      (tokenService.revokeRefreshToken as jest.Mock).mockResolvedValue(undefined);

      const result = await service.logout(refreshToken, userId);

      expect(result).toEqual({ message: "Logged out successfully" });
      expect(tokenService.revokeRefreshToken).toHaveBeenCalledWith(refreshToken, userId);
    });
  });

  describe("validateGoogleUser", () => {
    const googleProfile = {
      id: "google-123",
      email: "google@example.com",
      name: "Google User",
      avatarUrl: "https://example.com/avatar.jpg",
    };

    it("should return existing user if account exists", async () => {
      jest.resetAllMocks();

      const user = createMockUser({
        email: googleProfile.email,
        avatarUrl: "http://existing.com/avatar.jpg",
      });
      const account = {
        id: "account-123",
        provider: "google" as const,
        providerId: googleProfile.id,
        userId: user.id,
        createdAt: new Date("2024-01-01"),
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          avatarUrl: user.avatarUrl,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
        },
      };

      (prismaService.account.findUnique as jest.Mock).mockResolvedValue(account);

      const result = await service.validateGoogleUser(googleProfile);

      expect(result).toMatchObject({
        id: user.id,
        email: googleProfile.email,
      });
    });

    it("should link account to existing user by email", async () => {
      const user = createMockUser({ email: googleProfile.email });
      const newAccount = createMockAccount({ userId: user.id });

      (prismaService.account.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(user);
      (prismaService.account.create as jest.Mock).mockResolvedValue(newAccount);
      (prismaService.user.update as jest.Mock).mockResolvedValue(user);

      const result = await service.validateGoogleUser(googleProfile);

      expect(prismaService.account.create).toHaveBeenCalled();
      expect(result).toMatchObject({ email: googleProfile.email });
    });

    it("should create new user if not exists", async () => {
      const newUser = createMockUser({
        email: googleProfile.email,
        firstName: "Google",
        lastName: "User",
        emailVerified: true,
      });

      (prismaService.account.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.user.create as jest.Mock).mockResolvedValue(newUser);

      const result = await service.validateGoogleUser(googleProfile);

      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: googleProfile.email,
          firstName: "Google",
          lastName: "User",
          emailVerified: true,
          accounts: {
            create: {
              provider: "google",
              providerId: googleProfile.id,
            },
          },
        }),
      });
      expect(result).toMatchObject({ email: googleProfile.email });
    });
  });

  describe("forgotPassword", () => {
    const email = "test@example.com";

    it("should send password reset email if user exists", async () => {
      const user = createMockUser({ email, password: "hashed-password" });

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(user);
      (prismaService.user.update as jest.Mock).mockResolvedValue(user);
      (tokenService.generateVerificationToken as jest.Mock).mockReturnValue("reset-token");
      (emailService.sendPasswordResetEmail as jest.Mock).mockResolvedValue(undefined);

      const result = await service.forgotPassword(email);

      expect(result).toEqual({
        message:
          "Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña.",
      });
      expect(prismaService.user.update).toHaveBeenCalled();
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalled();
    });

    it("should return same message if user not found (security)", async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.forgotPassword(email);

      expect(result).toEqual({
        message:
          "Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña.",
      });
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it("should return same message if user has no password (OAuth only)", async () => {
      const user = createMockUser({ email, password: null });

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(user);

      const result = await service.forgotPassword(email);

      expect(result).toEqual({
        message:
          "Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña.",
      });
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe("resetPassword", () => {
    const token = "reset-token";
    const newPassword = "NewSecurePass123!";

    it("should reset password successfully", async () => {
      const user = createMockUser({
        resetPasswordToken: token,
        resetPasswordExpiry: new Date(Date.now() + 60 * 60 * 1000),
        password: "old-hashed-password",
      });

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(user);
      (prismaService.user.update as jest.Mock).mockResolvedValue(user);
      (prismaService.refreshToken.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });

      const result = await service.resetPassword(token, newPassword);

      expect(result).toEqual({
        message: "Contraseña restablecida exitosamente. Ahora puedes iniciar sesión.",
      });
      expect(prismaService.user.update).toHaveBeenCalled();
      expect(prismaService.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: user.id },
      });
    });

    it("should throw BadRequestException if token is invalid", async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.resetPassword(token, newPassword)).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException if token is expired", async () => {
      const user = createMockUser({
        resetPasswordToken: token,
        resetPasswordExpiry: new Date(Date.now() - 1000),
      });

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(user);

      await expect(service.resetPassword(token, newPassword)).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException if user has no password (OAuth only)", async () => {
      const user = createMockUser({
        resetPasswordToken: token,
        resetPasswordExpiry: new Date(Date.now() + 60 * 60 * 1000),
        password: null,
      });

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(user);

      await expect(service.resetPassword(token, newPassword)).rejects.toThrow(BadRequestException);
    });
  });

  describe("getUserById", () => {
    it("should return user by id", async () => {
      const user = createMockUser();
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(user);

      const result = await service.getUserById(user.id);

      expect(result).toMatchObject({
        id: user.id,
        email: user.email,
      });
    });

    it("should throw NotFoundException if user not found", async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getUserById("non-existent-id")).rejects.toThrow(NotFoundException);
    });
  });
});
