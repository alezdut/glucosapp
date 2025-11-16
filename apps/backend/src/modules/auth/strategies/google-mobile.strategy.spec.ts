import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { GoogleMobileStrategy } from "./google-mobile.strategy";
import { AuthService } from "../services/auth.service";
import { createMockConfigService } from "../../../common/test-helpers/config.mock";
import { createMockUserResponse } from "../../../common/test-helpers/fixtures";
import { Profile, VerifyCallback } from "passport-google-oauth20";

describe("GoogleMobileStrategy", () => {
  let strategy: GoogleMobileStrategy;
  let authService: AuthService;
  let configService: ConfigService;

  beforeEach(async () => {
    const mockConfig = createMockConfigService({
      GOOGLE_CLIENT_ID: "test-client-id",
      GOOGLE_CLIENT_SECRET: "test-client-secret",
      GOOGLE_MOBILE_CALLBACK_URL: "http://localhost:3000/v1/auth/google/mobile/callback",
    });
    const mockAuthService = {
      validateGoogleUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleMobileStrategy,
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

    strategy = module.get<GoogleMobileStrategy>(GoogleMobileStrategy);
    authService = module.get<AuthService>(AuthService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it("should be defined", () => {
    expect(strategy).toBeDefined();
  });

  describe("validate", () => {
    it("should validate Google profile and return user", async () => {
      const profile: Profile = {
        id: "google-123",
        emails: [{ value: "google@example.com", verified: true }],
        displayName: "Google User",
        photos: [{ value: "https://example.com/avatar.jpg" }],
      } as Profile;
      const user = createMockUserResponse({
        email: "google@example.com",
        firstName: "Google",
        lastName: "User",
      });
      const done: VerifyCallback = jest.fn();

      (authService.validateGoogleUser as jest.Mock).mockResolvedValue(user);

      await strategy.validate("access-token", "refresh-token", profile, done);

      expect(authService.validateGoogleUser).toHaveBeenCalledWith({
        id: "google-123",
        email: "google@example.com",
        name: "Google User",
        avatarUrl: "https://example.com/avatar.jpg",
      });
      expect(done).toHaveBeenCalledWith(null, user);
    });

    it("should call done with error if no email provided", async () => {
      const profile: Profile = {
        id: "google-123",
        emails: undefined,
        displayName: "Google User",
      } as Profile;
      const done: VerifyCallback = jest.fn();

      await strategy.validate("access-token", "refresh-token", profile, done);

      expect(done).toHaveBeenCalledWith(expect.any(Error), undefined);
    });
  });
});
