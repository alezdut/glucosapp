import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, Profile, VerifyCallback } from "passport-google-oauth20";
import { AuthService } from "../services/auth.service";

/**
 * Strategy for Google OAuth authentication
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const clientID = configService.get<string>("GOOGLE_CLIENT_ID", "");
    const clientSecret = configService.get<string>("GOOGLE_CLIENT_SECRET", "");
    const callbackURL = configService.get<string>(
      "GOOGLE_CALLBACK_URL",
      "http://localhost:3000/v1/auth/google/callback",
    );

    super({
      clientID,
      clientSecret,
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
    const { id, emails, displayName } = profile;

    if (!emails || emails.length === 0) {
      return done(new Error("No email provided by Google"), undefined);
    }

    const email = emails[0].value;

    try {
      const user = await this.authService.validateGoogleUser({
        id,
        email,
        name: displayName,
      });
      done(null, user);
    } catch (error) {
      done(error, undefined);
    }
  }
}
