import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../../prisma/prisma.service";
import { TokenService } from "./token.service";
import { EmailService } from "./email.service";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
import { RegisterDto } from "../dto/register.dto";
import { AuthResponseDto, UserResponseDto } from "../dto/auth-response.dto";

/**
 * Service handling authentication logic
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Registers a new user with email and password
   */
  async register(registerDto: RegisterDto): Promise<{ message: string }> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException("Email already registered");
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const verificationToken = this.tokenService.generateVerificationToken();
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.prisma.user.create({
      data: {
        email: registerDto.email,
        password: hashedPassword,
        name: registerDto.name,
        verificationToken,
        verificationTokenExpiry,
      },
    });

    await this.emailService.sendVerificationEmail(registerDto.email, verificationToken);

    return {
      message: "Registration successful. Please check your email to verify your account.",
    };
  }

  /**
   * Validates user credentials for local strategy
   */
  async validateLocalUser(email: string, password: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException(
        "Email not verified. Please verify your email before logging in.",
      );
    }

    return this.mapUserToDto(user);
  }

  /**
   * Generates access and refresh tokens for authenticated user
   */
  async login(user: UserResponseDto): Promise<AuthResponseDto> {
    const accessToken = this.tokenService.generateAccessToken(user.id, user.email);
    const refreshToken = await this.tokenService.generateRefreshToken(user.id);

    await this.tokenService.cleanupExpiredTokens(user.id);

    return {
      accessToken,
      refreshToken,
      user,
    };
  }

  /**
   * Verifies user email with token
   */
  async verifyEmail(token: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { verificationToken: token },
    });

    if (!user) {
      throw new BadRequestException("Invalid or expired verification token");
    }

    if (user.verificationTokenExpiry && user.verificationTokenExpiry < new Date()) {
      throw new BadRequestException("Verification token has expired");
    }

    if (user.emailVerified) {
      throw new BadRequestException("Email already verified");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null,
      },
    });

    return { message: "Email verified successfully. You can now log in." };
  }

  /**
   * Resends verification email
   */
  async resendVerificationEmail(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (user.emailVerified) {
      throw new BadRequestException("Email already verified");
    }

    const verificationToken = this.tokenService.generateVerificationToken();
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken,
        verificationTokenExpiry,
      },
    });

    await this.emailService.sendVerificationEmail(email, verificationToken);

    return { message: "Verification email sent. Please check your inbox." };
  }

  /**
   * Refreshes access token using refresh token
   */
  async refreshTokens(refreshToken: string): Promise<Omit<AuthResponseDto, "user">> {
    let payload: { sub: string; type: string };
    const secret = this.configService.get<string>("JWT_REFRESH_SECRET");
    if (!secret) {
      throw new Error("JWT_REFRESH_SECRET is not configured");
    }

    try {
      payload = jwt.verify(refreshToken, secret) as { sub: string; type: string };
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }

    if (payload.type !== "refresh") {
      throw new UnauthorizedException("Invalid token type");
    }

    const isValid = await this.tokenService.validateRefreshToken(refreshToken, payload.sub);
    if (!isValid) {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    const newAccessToken = this.tokenService.generateAccessToken(user.id, user.email);
    const newRefreshToken = await this.tokenService.generateRefreshToken(user.id);

    await this.tokenService.revokeRefreshToken(refreshToken, user.id);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Logs out user by revoking refresh token
   */
  async logout(refreshToken: string, userId: string): Promise<{ message: string }> {
    await this.tokenService.revokeRefreshToken(refreshToken, userId);
    return { message: "Logged out successfully" };
  }

  /**
   * Validates or creates user from Google OAuth profile
   */
  async validateGoogleUser(profile: {
    id: string;
    email: string;
    name?: string;
  }): Promise<UserResponseDto> {
    let account = await this.prisma.account.findUnique({
      where: {
        provider_providerId: {
          provider: "google",
          providerId: profile.id,
        },
      },
      include: { user: true },
    });

    if (account) {
      return this.mapUserToDto(account.user);
    }

    let user = await this.prisma.user.findUnique({
      where: { email: profile.email },
    });

    if (user) {
      account = await this.prisma.account.create({
        data: {
          provider: "google",
          providerId: profile.id,
          userId: user.id,
        },
        include: { user: true },
      });

      if (!user.emailVerified) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { emailVerified: true },
        });
        user.emailVerified = true;
      }

      return this.mapUserToDto(user);
    }

    const newUser = await this.prisma.user.create({
      data: {
        email: profile.email,
        name: profile.name,
        emailVerified: true,
        accounts: {
          create: {
            provider: "google",
            providerId: profile.id,
          },
        },
      },
    });

    return this.mapUserToDto(newUser);
  }

  /**
   * Initiates password reset process
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    // Don't reveal if user exists for security
    if (!user) {
      return {
        message:
          "Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña.",
      };
    }

    // Don't allow password reset for OAuth-only accounts
    if (!user.password) {
      return {
        message:
          "Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña.",
      };
    }

    const resetPasswordToken = this.tokenService.generateVerificationToken();
    const resetPasswordExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken,
        resetPasswordExpiry,
      },
    });

    await this.emailService.sendPasswordResetEmail(email, resetPasswordToken);

    return {
      message:
        "Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña.",
    };
  }

  /**
   * Resets user password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { resetPasswordToken: token },
    });

    if (!user) {
      throw new BadRequestException("Token inválido o expirado");
    }

    if (user.resetPasswordExpiry && user.resetPasswordExpiry < new Date()) {
      throw new BadRequestException("El token ha expirado");
    }

    if (!user.password) {
      throw new BadRequestException(
        "Esta cuenta usa autenticación con Google. No se puede restablecer la contraseña.",
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpiry: null,
      },
    });

    // Invalidate all refresh tokens for security
    await this.prisma.refreshToken.deleteMany({
      where: { userId: user.id },
    });

    return { message: "Contraseña restablecida exitosamente. Ahora puedes iniciar sesión." };
  }

  /**
   * Gets user by ID
   */
  async getUserById(userId: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return this.mapUserToDto(user);
  }

  /**
   * Maps Prisma user to DTO
   */
  private mapUserToDto(user: {
    id: string;
    email: string;
    name: string | null;
    emailVerified: boolean;
    createdAt: Date;
  }): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name ?? undefined,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
