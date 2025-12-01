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
    this.logger.log(`🔍 [BACKEND] LocalStrategy.validate - Validating credentials`, {
      email,
      passwordLength: password.length,
      hasPassword: !!password,
    });

    try {
      const user = await this.authService.validateLocalUser(email, password);
      this.logger.log(`🔍 [BACKEND] LocalStrategy.validate - Validation successful`, {
        email,
        userId: user.id,
        userRole: user.role,
      });
      return user;
    } catch (error) {
      this.logger.error(`🔍 [BACKEND] LocalStrategy.validate - Validation failed`, {
        email,
        error:
          error instanceof Error
            ? {
                message: error.message,
                name: error.name,
              }
            : error,
      });
      throw error;
    }
  }
}
