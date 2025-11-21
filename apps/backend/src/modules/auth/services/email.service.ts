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

  /**
   * Sends alert notification email to doctor
   */
  async sendAlertEmail(
    email: string,
    firstName: string | null | undefined,
    alertType: string,
    severity: string,
    message: string,
    dashboardUrl?: string,
    patientInfo?: {
      patientName: string;
      patientEmail: string;
      glucoseValue: number;
      alertTime: string;
      alertTimezone: string;
    },
  ): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(
        `Skipping alert email to ${email}. SMTP not configured. Alert type: ${alertType}`,
      );
      return;
    }

    const frontendUrl = this.configService.get<string>("FRONTEND_URL", "http://localhost:3001");
    const alertDashboardUrl = dashboardUrl || `${frontendUrl}/dashboard`;

    // Map alert types to Spanish names
    const alertTypeNames: Record<string, string> = {
      SEVERE_HYPOGLYCEMIA: "Hipoglucemia Severa",
      HYPOGLYCEMIA: "Hipoglucemia",
      HYPERGLYCEMIA: "Hiperglucemia",
      PERSISTENT_HYPERGLYCEMIA: "Hiperglucemia Persistente",
      OTHER: "Alerta de Glucosa",
    };

    // Map severity to colors and icons
    const severityConfig: Record<
      string,
      {
        title: string;
        headerColor: string;
        bgColor: string;
        borderColor: string;
        textColor: string;
        icon: string;
      }
    > = {
      CRITICAL: {
        title: "🚨 Alerta Crítica",
        headerColor: "linear-gradient(135deg, #dc3545 0%, #c82333 100%)",
        bgColor: "#f8d7da",
        borderColor: "#dc3545",
        textColor: "#721c24",
        icon: "🚨",
      },
      HIGH: {
        title: "⚠️ Alerta Importante",
        headerColor: "linear-gradient(135deg, #fd7e14 0%, #e55a00 100%)",
        bgColor: "#fff3cd",
        borderColor: "#ffc107",
        textColor: "#856404",
        icon: "⚠️",
      },
      MEDIUM: {
        title: "ℹ️ Alerta",
        headerColor: "linear-gradient(135deg, #17a2b8 0%, #138496 100%)",
        bgColor: "#d1ecf1",
        borderColor: "#17a2b8",
        textColor: "#0c5460",
        icon: "ℹ️",
      },
      LOW: {
        title: "📋 Notificación",
        headerColor: "linear-gradient(135deg, #6c757d 0%, #5a6268 100%)",
        bgColor: "#e2e3e5",
        borderColor: "#6c757d",
        textColor: "#383d41",
        icon: "📋",
      },
    };

    const config = severityConfig[severity] || severityConfig.MEDIUM;
    const alertTypeName = alertTypeNames[alertType] || alertTypeNames.OTHER;

    // Build greeting
    const greeting = firstName ? `Hola ${firstName},` : "Hola,";

    // Critical alert notice (only for CRITICAL severity)
    const criticalAlertNotice =
      severity === "CRITICAL"
        ? `<div style="margin: 30px 0; padding: 20px; background-color: #f8d7da; border-left: 4px solid #dc3545; border-radius: 4px;">
            <p style="margin: 0; color: #721c24; font-size: 14px; font-weight: bold;">
              🚨 ALERTA CRÍTICA - Requiere atención inmediata
            </p>
            <p style="margin: 10px 0 0; color: #721c24; font-size: 14px;">
              Esta es una alerta de máxima prioridad. Por favor, revisa el dashboard y contacta con el paciente o servicios de emergencia si es necesario.
            </p>
          </div>`
        : "";

    // Build patient information section
    const patientInfoSection = patientInfo
      ? `<div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 6px; border: 1px solid #dee2e6;">
          <p style="margin: 0 0 15px; color: #333333; font-size: 16px; font-weight: bold;">
            👤 Información del Paciente
          </p>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 160px; vertical-align: top;"><strong>Nombre del Paciente:</strong></td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: 600;">${patientInfo.patientName}</td>
            </tr>
            ${
              patientInfo.patientEmail
                ? `<tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px; vertical-align: top;"><strong>Email del Paciente:</strong></td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${patientInfo.patientEmail}</td>
            </tr>`
                : ""
            }
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px; vertical-align: top;"><strong>Valor de Glucosa:</strong></td>
              <td style="padding: 8px 0; color: #333333; font-size: 16px; font-weight: bold;">${patientInfo.glucoseValue} mg/dL</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px; vertical-align: top;"><strong>Hora de la Alerta:</strong></td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${patientInfo.alertTime}<br><span style="color: #999999; font-size: 12px;">Zona horaria: ${patientInfo.alertTimezone}</span></td>
            </tr>
          </table>
        </div>`
      : "";

    const html = this.loadTemplate("alert-notification", {
      alertTitle: config.title,
      alertTypeName,
      greeting,
      message,
      alertIcon: config.icon,
      alertBackgroundColor: config.bgColor,
      alertBorderColor: config.borderColor,
      alertTextColor: config.textColor,
      headerColor: config.headerColor,
      dashboardUrl: alertDashboardUrl,
      criticalAlertNotice,
      patientInfoSection,
    });

    const mailOptions = {
      from: this.configService.get<string>("SMTP_USER"),
      to: email,
      subject: `${config.icon} ${alertTypeName} - Glucosapp`,
      html,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Alert email sent to ${email} for ${alertType} (${severity})`);
    } catch (error) {
      this.logger.error(`Failed to send alert email to ${email}`, error);
      throw error;
    }
  }
}
