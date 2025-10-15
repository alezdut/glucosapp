import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import * as fs from "fs";
import * as path from "path";

/**
 * Service for sending emails
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;
  private readonly templatesPath = path.join(__dirname, "..", "templates");

  constructor(private readonly configService: ConfigService) {
    this.initializeTransporter();
  }

  /**
   * Initializes email transporter if SMTP configuration is available
   */
  private initializeTransporter(): void {
    const smtpHost = this.configService.get<string>("SMTP_HOST");
    const smtpPort = this.configService.get<string>("SMTP_PORT");
    const smtpUser = this.configService.get<string>("SMTP_USER");
    const smtpPass = this.configService.get<string>("SMTP_PASS");

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      this.logger.warn(
        "SMTP configuration incomplete. Email sending will be disabled. Configure SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS.",
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort, 10),
      secure: parseInt(smtpPort, 10) === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    this.logger.log("Email transporter initialized successfully");
  }

  /**
   * Loads email template and replaces placeholders
   */
  private loadTemplate(templateName: string, variables: Record<string, string>): string {
    try {
      const templatePath = path.join(this.templatesPath, `${templateName}.html`);
      let template = fs.readFileSync(templatePath, "utf-8");

      // Replace all placeholders
      Object.entries(variables).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        template = template.replace(new RegExp(placeholder, "g"), value);
      });

      return template;
    } catch (error) {
      this.logger.error(`Failed to load template ${templateName}`, error);
      throw new Error(`Template ${templateName} not found`);
    }
  }

  /**
   * Sends email verification link to user
   */
  async sendVerificationEmail(email: string, token: string): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(
        `Skipping verification email to ${email}. SMTP not configured. Verification token: ${token}`,
      );
      return;
    }

    const frontendUrl = this.configService.get<string>("FRONTEND_URL", "http://localhost:3001");
    const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;

    const html = this.loadTemplate("verification-email", {
      verificationUrl,
    });

    const mailOptions = {
      from: this.configService.get<string>("SMTP_USER"),
      to: email,
      subject: "Verifica tu correo electrónico - Glucosapp",
      html,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Verification email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}`, error);
      throw error;
    }
  }

  /**
   * Sends password reset link to user
   */
  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(
        `Skipping password reset email to ${email}. SMTP not configured. Reset token: ${token}`,
      );
      return;
    }

    const frontendUrl = this.configService.get<string>("FRONTEND_URL", "http://localhost:3001");
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    const html = this.loadTemplate("reset-password", {
      resetUrl,
    });

    const mailOptions = {
      from: this.configService.get<string>("SMTP_USER"),
      to: email,
      subject: "Restablece tu contraseña - Glucosapp",
      html,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}`, error);
      throw error;
    }
  }
}
