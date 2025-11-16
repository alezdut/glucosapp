import { Test, TestingModule } from "@nestjs/testing";
import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RefreshTokenStrategy, RefreshTokenPayload } from "./refresh-token.strategy";
import { createMockConfigService } from "../../../common/test-helpers/config.mock";
import { Request } from "express";

describe("RefreshTokenStrategy", () => {
  let strategy: RefreshTokenStrategy;
  let configService: ConfigService;

  beforeEach(async () => {
    const mockConfig = createMockConfigService({
      JWT_REFRESH_SECRET: "test-refresh-secret-at-least-32-characters-long",
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenStrategy,
        {
          provide: ConfigService,
          useValue: mockConfig,
        },
      ],
    }).compile();

    strategy = module.get<RefreshTokenStrategy>(RefreshTokenStrategy);
    configService = module.get<ConfigService>(ConfigService);
  });

  it("should be defined", () => {
    expect(strategy).toBeDefined();
  });

  describe("validate", () => {
    it("should return userId if token type is refresh", async () => {
      const payload: RefreshTokenPayload = {
        sub: "user-123",
        type: "refresh",
      };
      const req = {} as Request;

      const result = await strategy.validate(req, payload);

      expect(result).toEqual({ userId: "user-123" });
    });

    it("should throw UnauthorizedException if token type is not refresh", async () => {
      const payload: RefreshTokenPayload = {
        sub: "user-123",
        type: "access",
      };
      const req = {} as Request;

      await expect(strategy.validate(req, payload)).rejects.toThrow(UnauthorizedException);
    });
  });
});
