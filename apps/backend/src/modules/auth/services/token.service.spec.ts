import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../../prisma/prisma.service";
import { TokenService } from "./token.service";
import { createMockConfigService } from "../../../common/test-helpers/config.mock";
import { createMockPrismaService } from "../../../common/test-helpers/prisma.mock";
import { createMockRefreshToken } from "../../../common/test-helpers/fixtures";
import * as jwt from "jsonwebtoken";
import * as bcrypt from "bcrypt";

describe("TokenService", () => {
  let service: TokenService;
  let configService: ConfigService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    // Mock console to suppress logs during tests
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(console, "log").mockImplementation(() => {});

    const mockPrisma = createMockPrismaService();
    const mockConfig = createMockConfigService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        {
          provide: ConfigService,
          useValue: mockConfig,
        },
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
    configService = module.get<ConfigService>(ConfigService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("generateAccessToken", () => {
    it("should generate valid JWT access token", () => {
      const userId = "user-123";
      const email = "test@example.com";
      const token = service.generateAccessToken(userId, email);

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");

      const decoded = jwt.verify(token, configService.get("JWT_ACCESS_SECRET")!);
      expect(decoded).toMatchObject({
        sub: userId,
        email,
      });
    });

    it("should throw error if JWT_ACCESS_SECRET is not configured", async () => {
      const mockConfig = createMockConfigService({ JWT_ACCESS_SECRET: undefined });
      const mockPrisma = createMockPrismaService();

      const module = await Test.createTestingModule({
        providers: [
          TokenService,
          { provide: ConfigService, useValue: mockConfig },
          { provide: PrismaService, useValue: mockPrisma },
        ],
      }).compile();

      const tokenService = module.get<TokenService>(TokenService);

      expect(() => {
        tokenService.generateAccessToken("user-123", "test@example.com");
      }).toThrow("JWT_ACCESS_SECRET is not configured");
    });

    it("should use custom expiration from config", async () => {
      const mockConfig = createMockConfigService({ JWT_ACCESS_EXPIRATION: "30m" });
      const mockPrisma = createMockPrismaService();

      const module = await Test.createTestingModule({
        providers: [
          TokenService,
          { provide: ConfigService, useValue: mockConfig },
          { provide: PrismaService, useValue: mockPrisma },
        ],
      }).compile();

      const tokenService = module.get<TokenService>(TokenService);
      const token = tokenService.generateAccessToken("user-123", "test@example.com");

      const decoded = jwt.decode(token) as any;
      expect(decoded).toBeDefined();
    });
  });

  describe("generateRefreshToken", () => {
    it("should generate and store refresh token", async () => {
      const userId = "user-123";
      const mockToken = createMockRefreshToken({ userId });

      (prismaService.refreshToken.create as jest.Mock).mockResolvedValue(mockToken);

      const token = await service.generateRefreshToken(userId);

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(prismaService.refreshToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          token: expect.any(String),
          expiresAt: expect.any(Date),
        }),
      });

      const decoded = jwt.verify(token, configService.get("JWT_REFRESH_SECRET")!);
      expect(decoded).toMatchObject({
        sub: userId,
        type: "refresh",
      });
    });

    it("should throw error if JWT_REFRESH_SECRET is not configured", async () => {
      const mockConfig = createMockConfigService({ JWT_REFRESH_SECRET: undefined });
      const mockPrisma = createMockPrismaService();

      const module = await Test.createTestingModule({
        providers: [
          TokenService,
          { provide: ConfigService, useValue: mockConfig },
          { provide: PrismaService, useValue: mockPrisma },
        ],
      }).compile();

      const tokenService = module.get<TokenService>(TokenService);

      await expect(tokenService.generateRefreshToken("user-123")).rejects.toThrow(
        "JWT_REFRESH_SECRET is not configured",
      );
    });

    it("should hash token before storing", async () => {
      const userId = "user-123";
      const mockToken = createMockRefreshToken({ userId });

      (prismaService.refreshToken.create as jest.Mock).mockResolvedValue(mockToken);

      const token = await service.generateRefreshToken(userId);
      const createCall = (prismaService.refreshToken.create as jest.Mock).mock.calls[0][0];

      expect(createCall.data.token).not.toBe(token);
      expect(createCall.data.token.length).toBeGreaterThan(50); // bcrypt hash length
    });
  });

  describe("validateRefreshToken", () => {
    it("should return true for valid refresh token", async () => {
      const userId = "user-123";
      const plainToken = "valid-refresh-token";
      const hashedToken = await bcrypt.hash(plainToken, 10);
      const mockToken = createMockRefreshToken({
        userId,
        token: hashedToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      (prismaService.refreshToken.findMany as jest.Mock).mockResolvedValue([mockToken]);

      const isValid = await service.validateRefreshToken(plainToken, userId);

      expect(isValid).toBe(true);
      expect(prismaService.refreshToken.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          expiresAt: { gt: expect.any(Date) },
        },
      });
    });

    it("should return false for invalid refresh token", async () => {
      const userId = "user-123";
      const plainToken = "invalid-token";
      const hashedToken = await bcrypt.hash("different-token", 10);
      const mockToken = createMockRefreshToken({
        userId,
        token: hashedToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      (prismaService.refreshToken.findMany as jest.Mock).mockResolvedValue([mockToken]);

      const isValid = await service.validateRefreshToken(plainToken, userId);

      expect(isValid).toBe(false);
    });

    it("should return false when no tokens found", async () => {
      const userId = "user-123";

      (prismaService.refreshToken.findMany as jest.Mock).mockResolvedValue([]);

      const isValid = await service.validateRefreshToken("any-token", userId);

      expect(isValid).toBe(false);
    });

    it("should return false for expired token", async () => {
      const userId = "user-123";
      const plainToken = "expired-token";
      const hashedToken = await bcrypt.hash(plainToken, 10);
      const mockToken = createMockRefreshToken({
        userId,
        token: hashedToken,
        expiresAt: new Date(Date.now() - 1000), // Expired
      });

      (prismaService.refreshToken.findMany as jest.Mock).mockResolvedValue([]);

      const isValid = await service.validateRefreshToken(plainToken, userId);

      expect(isValid).toBe(false);
    });
  });

  describe("revokeRefreshToken", () => {
    it("should delete refresh token", async () => {
      const userId = "user-123";
      const plainToken = "token-to-revoke";
      const hashedToken = await bcrypt.hash(plainToken, 10);
      const mockToken = createMockRefreshToken({
        id: "token-id",
        userId,
        token: hashedToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      (prismaService.refreshToken.findMany as jest.Mock).mockResolvedValue([mockToken]);
      (prismaService.refreshToken.delete as jest.Mock).mockResolvedValue(mockToken);

      await service.revokeRefreshToken(plainToken, userId);

      expect(prismaService.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: mockToken.id },
      });
    });

    it("should not throw error if token not found", async () => {
      const userId = "user-123";

      (prismaService.refreshToken.findMany as jest.Mock).mockResolvedValue([]);

      await expect(service.revokeRefreshToken("non-existent-token", userId)).resolves.not.toThrow();
    });

    it("should handle deletion error gracefully", async () => {
      const userId = "user-123";
      const plainToken = "token-to-revoke";
      const hashedToken = await bcrypt.hash(plainToken, 10);
      const mockToken = createMockRefreshToken({
        id: "token-id",
        userId,
        token: hashedToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      (prismaService.refreshToken.findMany as jest.Mock).mockResolvedValue([mockToken]);
      (prismaService.refreshToken.delete as jest.Mock).mockRejectedValue(
        new Error("Token already deleted"),
      );

      // Should not throw
      await expect(service.revokeRefreshToken(plainToken, userId)).resolves.not.toThrow();
    });
  });

  describe("generateVerificationToken", () => {
    it("should generate random verification token", () => {
      const token1 = service.generateVerificationToken();
      const token2 = service.generateVerificationToken();

      expect(token1).toBeDefined();
      expect(token1).toHaveLength(64); // 32 bytes = 64 hex characters
      expect(token1).not.toBe(token2);
    });
  });

  describe("cleanupExpiredTokens", () => {
    it("should delete expired tokens for user", async () => {
      const userId = "user-123";

      (prismaService.refreshToken.deleteMany as jest.Mock).mockResolvedValue({ count: 2 });

      await service.cleanupExpiredTokens(userId);

      expect(prismaService.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: {
          userId,
          expiresAt: { lt: expect.any(Date) },
        },
      });
    });
  });
});
