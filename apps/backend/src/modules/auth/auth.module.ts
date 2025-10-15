import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthController } from "./auth.controller";
import { AuthService } from "./services/auth.service";
import { TokenService } from "./services/token.service";
import { EmailService } from "./services/email.service";
import { LocalStrategy } from "./strategies/local.strategy";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { RefreshTokenStrategy } from "./strategies/refresh-token.strategy";
import { GoogleStrategy } from "./strategies/google.strategy";

/**
 * Module handling authentication
 */
@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.register({
      // Default JWT configuration, strategies will override with their own secrets
      signOptions: { expiresIn: "15m" },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    EmailService,
    PrismaService,
    LocalStrategy,
    JwtStrategy,
    RefreshTokenStrategy,
    GoogleStrategy,
  ],
  exports: [AuthService],
})
export class AuthModule {}
