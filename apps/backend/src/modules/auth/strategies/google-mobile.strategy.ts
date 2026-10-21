import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, Profile, VerifyCallback } from "passport-google-oauth20";
import { AuthService } from "../services/auth.service";

/**
 * Strategy for Google OAuth authentication (Mobile)
 */
@Injectable()
export class GoogleMobileStrategy extends PassportStrategy(Strategy, "google-mobile") {
  private static readonly logger = new Logger(GoogleMobileStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const configuredClientID = configService.get<string>("GOOGLE_CLIENT_ID", "");
    const configuredClientSecret = configService.get<string>("GOOGLE_CLIENT_SECRET", "");
    const callbackURL = configService.get<string>(
      "GOOGLE_MOBILE_CALLBACK_URL",
      "http://localhost:3000/v1/auth/google/mobile/callback",
    );
    const oauthConfigured = Boolean(configuredClientID && configuredClientSecret);

    if (!oauthConfigured) {
      GoogleMobileStrategy.logger.warn(
        "Google mobile OAuth is disabled because GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is not configured.",
      );
    }

    super({
      clientID: configuredClientID || "disabled-google-oauth-client-id",
      clientSecret: configuredClientSecret || "disabled-google-oauth-client-secret",
      callbackURL,
      scope: ["email", "profile"],
    });
  }

  /**
   * Validates Google profile and returns user
   */
  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const { id, emails, displayName, photos } = profile;

    if (!emails || emails.length === 0) {
      return done(new Error("No email provided by Google"), undefined);
    }

    const email = emails[0].value;
    const avatarUrl = photos && photos.length > 0 ? photos[0].value : undefined;

    try {
      const user = await this.authService.validateGoogleUser({
        id,
        email,
        name: displayName,
        avatarUrl,
      });
      done(null, user);
    } catch (error) {
      done(error, undefined);
    }
  }
}
