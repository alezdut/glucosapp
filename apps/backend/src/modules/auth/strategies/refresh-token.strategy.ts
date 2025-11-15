import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { Request } from "express";

/**
 * Payload extracted from refresh token
 */
export interface RefreshTokenPayload {
  sub: string;
  type: string;
}

/**
 * Strategy for validating refresh tokens
 */
@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(Strategy, "jwt-refresh") {
  constructor(private readonly configService: ConfigService) {
    const secret = configService.get<string>("JWT_REFRESH_SECRET");
    if (!secret) {
      throw new Error("JWT_REFRESH_SECRET is not configured");
    }

    super({
      jwtFromRequest: ExtractJwt.fromBodyField("refreshToken"),
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: true,
    });
  }

  /**
   * Validates refresh token payload
   */
  async validate(req: Request, payload: RefreshTokenPayload): Promise<{ userId: string }> {
    if (payload.type !== "refresh") {
      throw new UnauthorizedException("Invalid token type");
    }

    return { userId: payload.sub };
  }
}
