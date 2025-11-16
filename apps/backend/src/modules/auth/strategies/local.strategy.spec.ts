import { Test, TestingModule } from "@nestjs/testing";
import { UnauthorizedException } from "@nestjs/common";
import { LocalStrategy } from "./local.strategy";
import { AuthService } from "../services/auth.service";
import { createMockUserResponse } from "../../../common/test-helpers/fixtures";

describe("LocalStrategy", () => {
  let strategy: LocalStrategy;
  let authService: AuthService;

  beforeEach(async () => {
    const mockAuthService = {
      validateLocalUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStrategy,
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    strategy = module.get<LocalStrategy>(LocalStrategy);
    authService = module.get<AuthService>(AuthService);
  });

  it("should be defined", () => {
    expect(strategy).toBeDefined();
  });

  describe("validate", () => {
    it("should return user if credentials are valid", async () => {
      const email = "test@example.com";
      const password = "SecurePass123!";
      const user = createMockUserResponse({ email });

      (authService.validateLocalUser as jest.Mock).mockResolvedValue(user);

      const result = await strategy.validate(email, password);

      expect(authService.validateLocalUser).toHaveBeenCalledWith(email, password);
      expect(result).toEqual(user);
    });

    it("should throw UnauthorizedException if credentials are invalid", async () => {
      const email = "test@example.com";
      const password = "wrong-password";

      (authService.validateLocalUser as jest.Mock).mockRejectedValue(
        new UnauthorizedException("Invalid credentials"),
      );

      await expect(strategy.validate(email, password)).rejects.toThrow(UnauthorizedException);
    });
  });
});
