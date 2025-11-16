import { Test, TestingModule } from "@nestjs/testing";
import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtStrategy, JwtPayload } from "./jwt.strategy";
import { AuthService } from "../services/auth.service";
import { createMockConfigService } from "../../../common/test-helpers/config.mock";
import { createMockUserResponse } from "../../../common/test-helpers/fixtures";

describe("JwtStrategy", () => {
  let strategy: JwtStrategy;
  let authService: AuthService;
  let configService: ConfigService;

  beforeEach(async () => {
    const mockConfig = createMockConfigService();
    const mockAuthService = {
      getUserById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: mockConfig,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    authService = module.get<AuthService>(AuthService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it("should be defined", () => {
    expect(strategy).toBeDefined();
  });

  describe("validate", () => {
    it("should return user if payload is valid", async () => {
      const payload: JwtPayload = {
        sub: "user-123",
        email: "test@example.com",
      };
      const user = createMockUserResponse({ id: payload.sub, email: payload.email });

      (authService.getUserById as jest.Mock).mockResolvedValue(user);

      const result = await strategy.validate(payload);

      expect(authService.getUserById).toHaveBeenCalledWith(payload.sub);
      expect(result).toEqual(user);
    });

    it("should throw UnauthorizedException if user not found", async () => {
      const payload: JwtPayload = {
        sub: "non-existent-user",
        email: "test@example.com",
      };

      (authService.getUserById as jest.Mock).mockRejectedValue(
        new UnauthorizedException("User not found"),
      );

      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    });
  });
});
