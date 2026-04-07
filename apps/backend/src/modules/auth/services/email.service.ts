import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import * as fs from "fs";
import * as path from "path";

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
};

interface EmailProvider {
  readonly name: "smtp" | "resend";
  isConfigured(): boolean;
  send(payload: EmailPayload): Promise<void>;
}

class EmailDeliveryError extends Error {
  constructor(
    message: string,
    readonly provider: EmailProvider["name"],
    readonly fallbackAllowed: boolean,
  ) {
    super(message);
  }
}

class SmtpEmailProvider implements EmailProvider {
  readonly name = "smtp" as const;
  private readonly transporter: Transporter | null;
  private readonly port?: number;
  private readonly fromEmail?: string;

  constructor(
    private readonly logger: Logger,
    smtpHost?: string,
    smtpPort?: string,
    smtpUser?: string,
    smtpPass?: string,
  ) {
    this.port = smtpPort ? parseInt(smtpPort, 10) : undefined;
    this.fromEmail = smtpUser;

    if (!smtpHost || !this.port || !smtpUser || !smtpPass) {
      this.transporter = null;
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: this.port,
      secure: this.port === 465,
      requireTLS: this.port === 587,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
    });
  }

  isConfigured(): boolean {
    return this.transporter !== null;
  }

  async send(payload: EmailPayload): Promise<void> {
    if (!this.transporter) {
      throw new EmailDeliveryError("SMTP is not configured", this.name, true);
    }

    try {
      await this.transporter.sendMail({
        from: this.fromEmail,
        ...payload,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // If nodemailer rejected the send operation, we treat it as not delivered
      // and allow a single fallback attempt via Resend.
      throw new EmailDeliveryError(errorMessage, this.name, true);
    }
  }
}

class ResendEmailProvider implements EmailProvider {
  readonly name = "resend" as const;

  constructor(
    private readonly apiKey?: string,
    private readonly fromEmail?: string,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.fromEmail);
  }

  async send(payload: EmailPayload): Promise<void> {
    if (!this.apiKey || !this.fromEmail) {
      throw new EmailDeliveryError("Resend is not configured", this.name, false);
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.fromEmail,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        ...(payload.replyTo ? { reply_to: payload.replyTo } : {}),
      }),
    }).catch((error) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new EmailDeliveryError(errorMessage, this.name, false);
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new EmailDeliveryError(
        `Resend API error (${response.status}): ${errorBody || response.statusText}`,
        this.name,
        false,
      );
    }
  }
}

/**
 * Service for sending emails
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly templatesPath = this.resolveTemplatesPath();
  private readonly smtpProvider: SmtpEmailProvider;
  private readonly resendProvider: ResendEmailProvider;
  private readonly smtpUser?: string;
  private readonly resendReplyTo?: string;

  constructor(private readonly configService: ConfigService) {
    const smtpHost = this.configService.get<string>("SMTP_HOST");
    const smtpPort = this.configService.get<string>("SMTP_PORT");
    const smtpUser = this.configService.get<string>("SMTP_USER");
    const smtpPass = this.configService.get<string>("SMTP_PASS");
    this.smtpUser = smtpUser;
    this.resendReplyTo = this.configService.get<string>("RESEND_REPLY_TO");

    this.smtpProvider = new SmtpEmailProvider(this.logger, smtpHost, smtpPort, smtpUser, smtpPass);
    this.resendProvider = new ResendEmailProvider(
      this.configService.get<string>("RESEND_API_KEY"),
      this.configService.get<string>("RESEND_FROM_EMAIL"),
    );

    if (this.smtpProvider.isConfigured()) {
      this.logger.log("SMTP email provider initialized");
    } else {
      this.logger.warn("SMTP email provider is not configured");
    }

    if (this.resendProvider.isConfigured()) {
      this.logger.log("Resend email provider initialized");
    } else {
      this.logger.warn("Resend email provider is not configured");
    }
  }

  private resolveTemplatesPath(): string {
    const distTemplatesPath = path.join(__dirname, "..", "templates");
    if (fs.existsSync(distTemplatesPath)) {
      return distTemplatesPath;
    }

    // Fallback for environments where static assets were not copied into dist.
    return path.join(process.cwd(), "apps/backend/src/modules/auth/templates");
  }

  /**
   * Escapes HTML special characters to prevent XSS attacks
   * Replaces &, <, >, ", ', / with their HTML entities
   */
  private escapeHtml(text: string | number): string {
    const str = String(text);
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;");
  }

  /**
   * Loads email template and replaces placeholders
   */
  private loadTemplate(templateName: string, variables: Record<string, string>): string {
    try {
      const templatePath = path.join(this.templatesPath, `${templateName}.html`);
      let template = fs.readFileSync(templatePath, "utf-8");

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
    const frontendUrl = this.configService.get<string>("FRONTEND_URL", "http://localhost:3001");
    const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;

    const html = this.loadTemplate("verification-email", {
      verificationUrl,
    });

    await this.deliverEmail("verification", {
      to: email,
      subject: "Verifica tu correo electronico - Glucosapp",
      html,
      replyTo: this.resendReplyTo,
    });
  }

  /**
   * Sends password reset link to user
   */
  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get<string>("FRONTEND_URL", "http://localhost:3001");
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    const html = this.loadTemplate("reset-password", {
      resetUrl,
    });

    await this.deliverEmail("password reset", {
      to: email,
      subject: "Restablece tu contrasena - Glucosapp",
      html,
      replyTo: this.resendReplyTo,
    });
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
    const frontendUrl = this.configService.get<string>("FRONTEND_URL", "http://localhost:3001");
    const alertDashboardUrl = dashboardUrl || `${frontendUrl}/dashboard`;

    const alertTypeNames: Record<string, string> = {
      SEVERE_HYPOGLYCEMIA: "Hipoglucemia Severa",
      HYPOGLYCEMIA: "Hipoglucemia",
      HYPERGLYCEMIA: "Hiperglucemia",
      PERSISTENT_HYPERGLYCEMIA: "Hiperglucemia Persistente",
      OTHER: "Alerta de Glucosa",
    };

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
        title: "Alerta Critica",
        headerColor: "linear-gradient(135deg, #dc3545 0%, #c82333 100%)",
        bgColor: "#f8d7da",
        borderColor: "#dc3545",
        textColor: "#721c24",
        icon: "CRITICAL",
      },
      HIGH: {
        title: "Alerta Importante",
        headerColor: "linear-gradient(135deg, #fd7e14 0%, #e55a00 100%)",
        bgColor: "#fff3cd",
        borderColor: "#ffc107",
        textColor: "#856404",
        icon: "HIGH",
      },
      MEDIUM: {
        title: "Alerta",
        headerColor: "linear-gradient(135deg, #17a2b8 0%, #138496 100%)",
        bgColor: "#d1ecf1",
        borderColor: "#17a2b8",
        textColor: "#0c5460",
        icon: "MEDIUM",
      },
      LOW: {
        title: "Notificacion",
        headerColor: "linear-gradient(135deg, #6c757d 0%, #5a6268 100%)",
        bgColor: "#e2e3e5",
        borderColor: "#6c757d",
        textColor: "#383d41",
        icon: "LOW",
      },
    };

    const config = severityConfig[severity] || severityConfig.MEDIUM;
    const alertTypeName = alertTypeNames[alertType] || alertTypeNames.OTHER;
    const greeting = firstName ? `Hola ${this.escapeHtml(firstName)},` : "Hola,";

    const criticalAlertNotice =
      severity === "CRITICAL"
        ? `<div style="margin: 30px 0; padding: 20px; background-color: #f8d7da; border-left: 4px solid #dc3545; border-radius: 4px;">
            <p style="margin: 0; color: #721c24; font-size: 14px; font-weight: bold;">
              ALERTA CRITICA - Requiere atencion inmediata
            </p>
            <p style="margin: 10px 0 0; color: #721c24; font-size: 14px;">
              Esta es una alerta de maxima prioridad. Por favor, revisa el dashboard y contacta con el paciente o servicios de emergencia si es necesario.
            </p>
          </div>`
        : "";

    const patientInfoSection = patientInfo
      ? `<div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 6px; border: 1px solid #dee2e6;">
          <p style="margin: 0 0 15px; color: #333333; font-size: 16px; font-weight: bold;">
            Informacion del Paciente
          </p>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 160px; vertical-align: top;"><strong>Nombre del Paciente:</strong></td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: 600;">${this.escapeHtml(patientInfo.patientName)}</td>
            </tr>
            ${
              patientInfo.patientEmail
                ? `<tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px; vertical-align: top;"><strong>Email del Paciente:</strong></td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${this.escapeHtml(patientInfo.patientEmail)}</td>
            </tr>`
                : ""
            }
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px; vertical-align: top;"><strong>Valor de Glucosa:</strong></td>
              <td style="padding: 8px 0; color: #333333; font-size: 16px; font-weight: bold;">${this.escapeHtml(patientInfo.glucoseValue)} mg/dL</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px; vertical-align: top;"><strong>Hora de la Alerta:</strong></td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${this.escapeHtml(patientInfo.alertTime)}<br><span style="color: #999999; font-size: 12px;">Zona horaria: ${this.escapeHtml(patientInfo.alertTimezone)}</span></td>
            </tr>
          </table>
        </div>`
      : "";

    const html = this.loadTemplate("alert-notification", {
      alertTitle: config.title,
      alertTypeName: this.escapeHtml(alertTypeName),
      greeting,
      message: this.escapeHtml(message),
      alertIcon: config.icon,
      alertBackgroundColor: config.bgColor,
      alertBorderColor: config.borderColor,
      alertTextColor: config.textColor,
      headerColor: config.headerColor,
      dashboardUrl: alertDashboardUrl,
      criticalAlertNotice,
      patientInfoSection,
    });

    await this.deliverEmail("alert", {
      to: email,
      subject: `${config.icon} ${alertTypeName} - Glucosapp`,
      html,
      replyTo: this.resendReplyTo,
    });
  }

  private async deliverEmail(type: string, payload: EmailPayload): Promise<void> {
    if (this.smtpProvider.isConfigured()) {
      try {
        await this.smtpProvider.send({
          ...payload,
          replyTo: payload.replyTo,
        });
        this.logger.log(`Email sent via smtp`, { type, to: payload.to });
        return;
      } catch (error) {
        if (!(error instanceof EmailDeliveryError)) {
          throw error;
        }

        if (error.fallbackAllowed && this.resendProvider.isConfigured()) {
          this.logger.warn("SMTP delivery failed, trying Resend fallback", {
            type,
            to: payload.to,
            primaryProvider: "smtp",
            fallbackProvider: "resend",
            reason: error.message,
          });
          return this.sendViaResend(type, payload);
        }

        this.handleFinalDeliveryFailure(type, payload.to, error);
      }
    }

    if (this.resendProvider.isConfigured()) {
      return this.sendViaResend(type, payload);
    }

    this.logger.error("No email provider is configured", { type, to: payload.to });
    throw new ServiceUnavailableException(
      "Email delivery is currently unavailable. Please try again later.",
    );
  }

  private async sendViaResend(type: string, payload: EmailPayload): Promise<void> {
    try {
      await this.resendProvider.send(payload);
      this.logger.log(`Email sent via resend`, { type, to: payload.to });
    } catch (error) {
      this.handleFinalDeliveryFailure(type, payload.to, error);
    }
  }

  private handleFinalDeliveryFailure(type: string, recipientEmail: string, error: unknown): never {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const provider = error instanceof EmailDeliveryError ? error.provider : "unknown";

    this.logger.error("Email delivery failed", {
      type,
      to: recipientEmail,
      provider,
      error: errorMessage,
    });

    throw new ServiceUnavailableException(
      "Email delivery is currently unavailable. Please try again later.",
    );
  }
}
