import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  Logger,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UserRole } from "@prisma/client";
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
  private readonly logger = new Logger(AuthService.name);
  private readonly verificationEmailValidityMs = 24 * 60 * 60 * 1000;
  private readonly verificationResendCooldownMs = 60 * 1000;

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
    const verificationTokenExpiry = new Date(Date.now() + this.verificationEmailValidityMs);

    await this.prisma.user.create({
      data: {
        email: registerDto.email,
        password: hashedPassword,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        role: registerDto.role ?? UserRole.PATIENT, // Default to PATIENT if not specified (web sends DOCTOR)
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
    this.logger.log("🔍 [BACKEND] AuthService.validateLocalUser - START", {
      email,
      passwordLength: password.length,
      hasPassword: !!password,
    });

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    this.logger.log("🔍 [BACKEND] AuthService.validateLocalUser - User lookup", {
      email,
      userFound: !!user,
      hasPassword: !!user?.password,
      emailVerified: user?.emailVerified,
      userId: user?.id,
      storedPasswordHash: user?.password ? user.password.substring(0, 20) + "..." : null,
      storedPasswordLength: user?.password?.length,
    });

    if (!user || !user.password) {
      this.logger.warn(
        "🔍 [BACKEND] AuthService.validateLocalUser - User not found or no password",
        {
          email,
          userFound: !!user,
          hasPassword: !!user?.password,
        },
      );
      throw new UnauthorizedException("Invalid credentials");
    }

    this.logger.log("🔍 [BACKEND] AuthService.validateLocalUser - Comparing password", {
      email,
      inputPasswordLength: password.length,
      storedHashPrefix: user.password.substring(0, 20),
      storedHashLength: user.password.length,
      storedHashStartsWith: user.password.startsWith("$2"),
    });
    const isPasswordValid = await bcrypt.compare(password, user.password);
    this.logger.log("🔍 [BACKEND] AuthService.validateLocalUser - Password comparison result", {
      email,
      isPasswordValid,
      inputPasswordFirstChar: password.substring(0, 1),
      inputPasswordLastChar: password.substring(password.length - 1),
    });

    if (!isPasswordValid) {
      this.logger.warn("🔍 [BACKEND] AuthService.validateLocalUser - Invalid password", {
        email,
      });
      throw new UnauthorizedException("Invalid credentials");
    }

    if (!user.emailVerified) {
      this.logger.warn("🔍 [BACKEND] AuthService.validateLocalUser - Email not verified", {
        email,
        emailVerified: user.emailVerified,
      });
      throw new UnauthorizedException({
        message: "Email not verified. Please verify your email before logging in.",
        code: "EMAIL_NOT_VERIFIED",
        email,
        canResendVerification: true,
      });
    }

    this.logger.log("🔍 [BACKEND] AuthService.validateLocalUser - Validation successful", {
      email,
      userId: user.id,
      userRole: user.role,
    });

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

    const retryAfterSeconds = this.getVerificationResendRetryAfterSeconds(
      user.verificationTokenExpiry,
    );
    if (retryAfterSeconds > 0) {
      throw new HttpException(
        {
          message: `Please wait ${retryAfterSeconds} seconds before requesting another verification email.`,
          code: "VERIFICATION_EMAIL_RESEND_RATE_LIMIT",
          retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const verificationToken = this.tokenService.generateVerificationToken();
    const verificationTokenExpiry = new Date(Date.now() + this.verificationEmailValidityMs);

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

  private getVerificationResendRetryAfterSeconds(verificationTokenExpiry: Date | null): number {
    if (!verificationTokenExpiry) {
      return 0;
    }

    const lastVerificationEmailSentAt = new Date(
      verificationTokenExpiry.getTime() - this.verificationEmailValidityMs,
    );
    const elapsedMs = Date.now() - lastVerificationEmailSentAt.getTime();
    const remainingMs = this.verificationResendCooldownMs - elapsedMs;

    if (remainingMs <= 0) {
      return 0;
    }

    return Math.ceil(remainingMs / 1000);
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
    avatarUrl?: string;
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
      // Update avatarUrl if user doesn't have one but Google provides it
      let user = account.user;
      if (!user.avatarUrl && profile.avatarUrl) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { avatarUrl: profile.avatarUrl },
        });
      }
      return this.mapUserToDto(user);
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

      // Update user if email not verified or avatarUrl not set
      const updateData: { emailVerified?: boolean; avatarUrl?: string } = {};
      if (!user.emailVerified) {
        updateData.emailVerified = true;
      }
      if (!user.avatarUrl && profile.avatarUrl) {
        updateData.avatarUrl = profile.avatarUrl;
      }

      if (Object.keys(updateData).length > 0) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: updateData,
        });
      }

      return this.mapUserToDto(user);
    }

    // Split Google profile name into firstName and lastName
    let firstName: string | undefined;
    let lastName: string | undefined;
    if (profile.name) {
      const nameParts = profile.name.trim().split(/\s+/);
      firstName = nameParts[0];
      lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined;
    }

    const newUser = await this.prisma.user.create({
      data: {
        email: profile.email,
        firstName,
        lastName,
        avatarUrl: profile.avatarUrl,
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
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
    emailVerified: boolean;
    role: string;
    createdAt: Date;
  }): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName ?? undefined,
      lastName: user.lastName ?? undefined,
      avatarUrl: user.avatarUrl ?? undefined,
      emailVerified: user.emailVerified,
      role: user.role as UserRole,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
