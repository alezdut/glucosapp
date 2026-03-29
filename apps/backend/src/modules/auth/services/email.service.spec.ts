import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { Logger, ServiceUnavailableException } from "@nestjs/common";
import { EmailService } from "./email.service";
import { createMockConfigService } from "../../../common/test-helpers/config.mock";
import * as nodemailer from "nodemailer";
import * as fs from "fs";

jest.mock("nodemailer");
jest.mock("fs");

describe("EmailService", () => {
  let service: EmailService;
  let configService: ConfigService;
  let mockTransporter: { sendMail: jest.Mock };
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, "log").mockImplementation(() => {});
    jest.spyOn(Logger.prototype, "error").mockImplementation(() => {});
    jest.spyOn(Logger.prototype, "warn").mockImplementation(() => {});

    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: "smtp-message-id" }),
    };

    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath.includes("verification-email")) return "<html>{{verificationUrl}}</html>";
      if (filePath.includes("reset-password")) return "<html>{{resetUrl}}</html>";
      if (filePath.includes("alert-notification")) return "<html>{{message}}</html>";
      return "<html></html>";
    });

    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue(""),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  const createService = async (configOverrides: Record<string, string | undefined> = {}) => {
    const mockConfig = createMockConfigService(configOverrides);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: mockConfig,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    configService = module.get<ConfigService>(ConfigService);
  };

  describe("initialization", () => {
    it("should initialize SMTP transporter with expected config", async () => {
      await createService();

      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: configService.get("SMTP_HOST"),
        port: parseInt(configService.get("SMTP_PORT")!, 10),
        secure: false,
        requireTLS: true,
        auth: {
          user: configService.get("SMTP_USER"),
          pass: configService.get("SMTP_PASS"),
        },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 20000,
      });
    });

    it("should not initialize SMTP transporter if SMTP config is incomplete", async () => {
      await createService({
        SMTP_HOST: undefined,
        SMTP_PORT: undefined,
        SMTP_USER: undefined,
        SMTP_PASS: undefined,
      });

      expect(nodemailer.createTransport).not.toHaveBeenCalled();
    });
  });

  describe("delivery behavior", () => {
    it("should send verification email via SMTP when SMTP succeeds", async () => {
      await createService();

      await service.sendVerificationEmail("test@example.com", "verification-token");

      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
      expect(fetchMock).not.toHaveBeenCalled();
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: configService.get("SMTP_USER"),
          to: "test@example.com",
          subject: "Verifica tu correo electronico - Glucosapp",
        }),
      );
    });

    it("should fallback to Resend when SMTP times out", async () => {
      await createService();
      const smtpError = Object.assign(new Error("Connection timeout"), {
        code: "ETIMEDOUT",
      });
      mockTransporter.sendMail.mockRejectedValueOnce(smtpError);

      await service.sendVerificationEmail("test@example.com", "verification-token");

      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.resend.com/emails",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: `Bearer ${configService.get("RESEND_API_KEY")}`,
          }),
        }),
      );
    });

    it("should send via Resend when SMTP is not configured", async () => {
      await createService({
        SMTP_HOST: undefined,
        SMTP_PORT: undefined,
        SMTP_USER: undefined,
        SMTP_PASS: undefined,
      });

      await service.sendVerificationEmail("test@example.com", "verification-token");

      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("should throw ServiceUnavailableException when SMTP and Resend both fail", async () => {
      await createService();
      const smtpError = Object.assign(new Error("Connection timeout"), {
        code: "ETIMEDOUT",
      });
      mockTransporter.sendMail.mockRejectedValueOnce(smtpError);
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: jest.fn().mockResolvedValue("provider down"),
      });

      await expect(
        service.sendVerificationEmail("test@example.com", "verification-token"),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it("should not fallback when template rendering fails", async () => {
      await createService();
      (fs.readFileSync as jest.Mock).mockImplementationOnce(() => {
        throw new Error("template missing");
      });

      await expect(
        service.sendVerificationEmail("test@example.com", "verification-token"),
      ).rejects.toThrow("Template verification-email not found");
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("should send password reset email via Resend fallback when SMTP fails", async () => {
      await createService();
      const smtpError = Object.assign(new Error("socket timeout"), {
        code: "ESOCKET",
      });
      mockTransporter.sendMail.mockRejectedValueOnce(smtpError);

      await service.sendPasswordResetEmail("test@example.com", "reset-token");

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});
