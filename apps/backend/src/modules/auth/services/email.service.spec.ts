import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { Logger } from "@nestjs/common";
import { EmailService } from "./email.service";
import { createMockConfigService } from "../../../common/test-helpers/config.mock";
import * as nodemailer from "nodemailer";
import * as fs from "fs";

jest.mock("nodemailer");
jest.mock("fs");

describe("EmailService", () => {
  let service: EmailService;
  let configService: ConfigService;
  let mockTransporter: any;

  beforeEach(() => {
    // Mock Logger to suppress logs during tests
    jest.spyOn(Logger.prototype, "log").mockImplementation(() => {});
    jest.spyOn(Logger.prototype, "error").mockImplementation(() => {});
    jest.spyOn(Logger.prototype, "warn").mockImplementation(() => {});

    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: "test-id" }),
    };

    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);
    // Mock fs.readFileSync to return template with placeholders that will be replaced by the service
    (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath.includes("verification-email")) {
        return "<html>{{verificationUrl}}</html>";
      }
      if (filePath.includes("reset-password")) {
        return "<html>{{resetUrl}}</html>";
      }
      return "<html></html>";
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe("initialization", () => {
    it("should initialize transporter with SMTP config", async () => {
      const mockConfig = createMockConfigService();
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

      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: configService.get("SMTP_HOST"),
        port: parseInt(configService.get("SMTP_PORT")!, 10),
        secure: parseInt(configService.get("SMTP_PORT")!, 10) === 465,
        auth: {
          user: configService.get("SMTP_USER"),
          pass: configService.get("SMTP_PASS"),
        },
      });
    });

    it("should not initialize transporter if SMTP config incomplete", async () => {
      const mockConfig = createMockConfigService({
        SMTP_HOST: undefined,
        SMTP_PORT: undefined,
        SMTP_USER: undefined,
        SMTP_PASS: undefined,
      });

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

      expect(nodemailer.createTransport).not.toHaveBeenCalled();
    });
  });

  describe("sendVerificationEmail", () => {
    beforeEach(async () => {
      const mockConfig = createMockConfigService();
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
    });

    it("should send verification email", async () => {
      const email = "test@example.com";
      const token = "verification-token";
      const frontendUrl = configService.get("FRONTEND_URL");
      const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;

      await service.sendVerificationEmail(email, token);

      expect(fs.readFileSync).toHaveBeenCalled();
      const sendMailCall = (mockTransporter.sendMail as jest.Mock).mock.calls[0][0];
      expect(sendMailCall).toMatchObject({
        from: configService.get("SMTP_USER"),
        to: email,
        subject: "Verifica tu correo electrónico - Glucosapp",
      });
      expect(sendMailCall.html).toContain(verificationUrl);
    });

    it("should skip sending if transporter not initialized", async () => {
      const mockConfig = createMockConfigService({
        SMTP_HOST: undefined,
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: ConfigService,
            useValue: mockConfig,
          },
        ],
      }).compile();

      const emailService = module.get<EmailService>(EmailService);

      await emailService.sendVerificationEmail("test@example.com", "token");

      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
    });

    it("should throw error if sending fails", async () => {
      const email = "test@example.com";
      const token = "verification-token";
      const error = new Error("SMTP error");

      mockTransporter.sendMail.mockRejectedValue(error);

      await expect(service.sendVerificationEmail(email, token)).rejects.toThrow(error);
    });
  });

  describe("sendPasswordResetEmail", () => {
    beforeEach(async () => {
      const mockConfig = createMockConfigService();
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
    });

    it("should send password reset email", async () => {
      const email = "test@example.com";
      const token = "reset-token";
      const frontendUrl = configService.get("FRONTEND_URL");
      const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

      await service.sendPasswordResetEmail(email, token);

      expect(fs.readFileSync).toHaveBeenCalled();
      const sendMailCall = (mockTransporter.sendMail as jest.Mock).mock.calls[0][0];
      expect(sendMailCall).toMatchObject({
        from: configService.get("SMTP_USER"),
        to: email,
        subject: "Restablece tu contraseña - Glucosapp",
      });
      expect(sendMailCall.html).toContain(resetUrl);
    });

    it("should skip sending if transporter not initialized", async () => {
      const mockConfig = createMockConfigService({
        SMTP_HOST: undefined,
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: ConfigService,
            useValue: mockConfig,
          },
        ],
      }).compile();

      const emailService = module.get<EmailService>(EmailService);

      await emailService.sendPasswordResetEmail("test@example.com", "token");

      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
    });

    it("should throw error if sending fails", async () => {
      const email = "test@example.com";
      const token = "reset-token";
      const error = new Error("SMTP error");

      mockTransporter.sendMail.mockRejectedValue(error);

      await expect(service.sendPasswordResetEmail(email, token)).rejects.toThrow(error);
    });
  });
});
