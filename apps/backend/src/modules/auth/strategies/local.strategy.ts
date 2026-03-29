import { Injectable, UnauthorizedException, Logger } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-local";
import { AuthService } from "../services/auth.service";
import { UserResponseDto } from "../dto/auth-response.dto";

/**
 * Strategy for authenticating users with email and password
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(LocalStrategy.name);

  constructor(private authService: AuthService) {
    super({
      usernameField: "email",
      passwordField: "password",
    });
  }

  /**
   * Validates user credentials
   */
  async validate(email: string, password: string): Promise<UserResponseDto> {
    try {
      const user = await this.authService.validateLocalUser(email, password);
      return user;
    } catch (error) {
      this.logger.warn("Local authentication failed", {
        email,
        reason: error instanceof UnauthorizedException ? "unauthorized" : "unexpected",
      });
      throw error;
    }
  }
}
