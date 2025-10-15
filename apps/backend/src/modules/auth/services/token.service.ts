import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../../prisma/prisma.service";
import * as crypto from "crypto";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";

/**
 * Service for managing JWT and verification tokens
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Generates JWT access token (short-lived)
   */
  generateAccessToken(userId: string, email: string): string {
    const payload = { sub: userId, email };
    const secret = this.configService.get<string>("JWT_ACCESS_SECRET");
    if (!secret) {
      throw new Error("JWT_ACCESS_SECRET is not configured");
    }
    const expiresIn = this.configService.get<string>("JWT_ACCESS_EXPIRATION", "15m");

    return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
  }

  /**
   * Generates and stores refresh token (long-lived)
   */
  async generateRefreshToken(userId: string): Promise<string> {
    const payload = { sub: userId, type: "refresh" };
    const secret = this.configService.get<string>("JWT_REFRESH_SECRET");
    if (!secret) {
      throw new Error("JWT_REFRESH_SECRET is not configured");
    }
    const expiresIn = this.configService.get<string>("JWT_REFRESH_EXPIRATION", "7d");

    const token = jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
    const hashedToken = await bcrypt.hash(token, 10);

    // Calculate expiration date
    const expirationMs = this.parseExpiration(expiresIn);
    const expiresAt = new Date(Date.now() + expirationMs);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token: hashedToken,
        expiresAt,
      },
    });

    return token;
  }

  /**
   * Validates refresh token against database
   */
  async validateRefreshToken(token: string, userId: string): Promise<boolean> {
    const storedTokens = await this.prisma.refreshToken.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
    });

    for (const storedToken of storedTokens) {
      const isValid = await bcrypt.compare(token, storedToken.token);
      if (isValid) {
        return true;
      }
    }

    return false;
  }

  /**
   * Revokes a refresh token
   */
  async revokeRefreshToken(token: string, userId: string): Promise<void> {
    const storedTokens = await this.prisma.refreshToken.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
    });

    for (const storedToken of storedTokens) {
      const isMatch = await bcrypt.compare(token, storedToken.token);
      if (isMatch) {
        await this.prisma.refreshToken.delete({
          where: { id: storedToken.id },
        });
        return;
      }
    }
  }

  /**
   * Generates random verification token for email verification
   */
  generateVerificationToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * Cleans up expired refresh tokens for a user
   */
  async cleanupExpiredTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: {
        userId,
        expiresAt: { lt: new Date() },
      },
    });
  }

  /**
   * Parses expiration string (e.g., "7d", "15m") to milliseconds
   */
  private parseExpiration(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 7 * 24 * 60 * 60 * 1000; // Default 7 days
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case "s":
        return value * 1000;
      case "m":
        return value * 60 * 1000;
      case "h":
        return value * 60 * 60 * 1000;
      case "d":
        return value * 24 * 60 * 60 * 1000;
      default:
        return 7 * 24 * 60 * 60 * 1000;
    }
  }
}
