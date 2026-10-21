import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { AuthService } from "../../auth/services/auth.service";
import { JwtPayload } from "../../auth/strategies/jwt.strategy";

/**
 * Guard for WebSocket connections using JWT authentication
 * Extracts token from query string during handshake
 */
@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient();
    const handshake = client.handshake;

    // Extract token from query string
    const token = handshake.query?.token as string | undefined;

    if (!token) {
      throw new UnauthorizedException("Token not provided");
    }

    try {
      const secret = this.configService.get<string>("JWT_ACCESS_SECRET");
      if (!secret) {
        throw new Error("JWT_ACCESS_SECRET is not configured");
      }

      // Verify and decode JWT
      const payload = this.jwtService.verify<JwtPayload>(token, { secret });

      // Get user from database
      const user = await this.authService.getUserById(payload.sub);
      if (!user) {
        throw new UnauthorizedException("User not found");
      }

      // Attach user to socket data for use in gateway
      client.data.user = user;
      client.data.userId = user.id;

      return true;
    } catch (error) {
      throw new UnauthorizedException("Invalid token");
    }
  }
}
