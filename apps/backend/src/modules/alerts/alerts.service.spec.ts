import { Test, TestingModule } from "@nestjs/testing";
import { ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AlertsService } from "./alerts.service";
import { DoctorUtilsService } from "../../common/services/doctor-utils.service";
import { EncryptionService } from "../../common/services/encryption.service";
import { createMockPrismaService } from "../../common/test-helpers/prisma.mock";
import { createMockConfigService } from "../../common/test-helpers/config.mock";
import { AlertType, AlertSeverity } from "@prisma/client";

describe("AlertsService", () => {
  let service: AlertsService;
  let prismaService: PrismaService;
  let doctorUtilsService: DoctorUtilsService;
  let encryptionService: EncryptionService;

  const doctorId = "doctor-123";
  const patientId = "patient-123";

  beforeEach(async () => {
    const mockPrisma = createMockPrismaService();
    const mockConfig = createMockConfigService();
    const mockEncryptionService = {
      encryptGlucoseValue: jest.fn((value: number) => `encrypted-${value}`),
      decryptGlucoseValue: jest.fn((encrypted: string) => {
        const match = encrypted.match(/encrypted-(\d+)/);
        return match ? parseInt(match[1], 10) : 100;
      }),
    };
    const mockDoctorUtilsService = {
      verifyDoctor: jest.fn().mockResolvedValue(undefined),
      getDoctorPatientIds: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: DoctorUtilsService,
          useValue: mockDoctorUtilsService,
        },
        {
          provide: EncryptionService,
          useValue: mockEncryptionService,
        },
        {
          provide: "ConfigService",
          useValue: mockConfig,
        },
      ],
    }).compile();

    service = module.get<AlertsService>(AlertsService);
    prismaService = module.get<PrismaService>(PrismaService);
    doctorUtilsService = module.get<DoctorUtilsService>(DoctorUtilsService);
    encryptionService = module.get<EncryptionService>(EncryptionService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("detectAlert", () => {
    it("should create alert for severe hypoglycemia", async () => {
      const glucoseMgdl = 50;

      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.alert.create as jest.Mock).mockResolvedValue({
        id: "alert-123",
        userId: patientId,
        type: AlertType.SEVERE_HYPOGLYCEMIA,
        severity: AlertSeverity.CRITICAL,
      });

      await service.detectAlert(patientId, glucoseMgdl);

      expect(prismaService.alert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: AlertType.SEVERE_HYPOGLYCEMIA,
            severity: AlertSeverity.CRITICAL,
          }),
        }),
      );
    });

    it("should create alert for hypoglycemia", async () => {
      const glucoseMgdl = 65;

      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.alert.create as jest.Mock).mockResolvedValue({
        id: "alert-123",
        userId: patientId,
        type: AlertType.HYPOGLYCEMIA,
        severity: AlertSeverity.HIGH,
      });

      await service.detectAlert(patientId, glucoseMgdl);

      expect(prismaService.alert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: AlertType.HYPOGLYCEMIA,
            severity: AlertSeverity.HIGH,
          }),
        }),
      );
    });

    it("should create alert for hyperglycemia", async () => {
      const glucoseMgdl = 280;

      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.alert.create as jest.Mock).mockResolvedValue({
        id: "alert-123",
        userId: patientId,
        type: AlertType.HYPERGLYCEMIA,
        severity: AlertSeverity.MEDIUM,
      });

      await service.detectAlert(patientId, glucoseMgdl);

      expect(prismaService.alert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: AlertType.HYPERGLYCEMIA,
            severity: AlertSeverity.MEDIUM,
          }),
        }),
      );
    });

    it("should create alert for persistent hyperglycemia", async () => {
      const glucoseMgdl = 280;
      const recentEntries = [
        { mgdlEncrypted: "encrypted-260" },
        { mgdlEncrypted: "encrypted-270" },
      ];

      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue(recentEntries);
      (prismaService.alert.create as jest.Mock).mockResolvedValue({
        id: "alert-123",
        userId: patientId,
        type: AlertType.PERSISTENT_HYPERGLYCEMIA,
        severity: AlertSeverity.HIGH,
      });

      await service.detectAlert(patientId, glucoseMgdl);

      expect(prismaService.alert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: AlertType.PERSISTENT_HYPERGLYCEMIA,
            severity: AlertSeverity.HIGH,
          }),
        }),
      );
    });

    it("should not create alert for normal glucose", async () => {
      const glucoseMgdl = 120;

      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue([]);

      await service.detectAlert(patientId, glucoseMgdl);

      expect(prismaService.alert.create).not.toHaveBeenCalled();
    });
  });

  describe("findAll", () => {
    beforeEach(() => {
      (doctorUtilsService.verifyDoctor as jest.Mock).mockResolvedValue(undefined);
    });

    it("should return all alerts for doctor's patients", async () => {
      const patientIds = [patientId];
      const alerts = [
        {
          id: "alert-1",
          userId: patientId,
          type: AlertType.HYPOGLYCEMIA,
          severity: AlertSeverity.HIGH,
          message: "Test alert",
          acknowledged: false,
          createdAt: new Date(),
          user: {
            id: patientId,
            email: "patient@example.com",
            firstName: "Patient",
            lastName: "One",
          },
        },
      ];

      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue(patientIds);
      (prismaService.alert.findMany as jest.Mock).mockResolvedValue(alerts);

      const result = await service.findAll(doctorId, 50);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "alert-1",
        userId: patientId,
      });
    });

    it("should return empty array if no patients", async () => {
      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue([]);

      const result = await service.findAll(doctorId);

      expect(result).toEqual([]);
    });
  });

  describe("getCritical", () => {
    beforeEach(() => {
      (doctorUtilsService.verifyDoctor as jest.Mock).mockResolvedValue(undefined);
    });

    it("should return only critical and high severity alerts", async () => {
      const patientIds = [patientId];
      const alerts = [
        {
          id: "alert-1",
          userId: patientId,
          type: AlertType.SEVERE_HYPOGLYCEMIA,
          severity: AlertSeverity.CRITICAL,
          message: "Critical alert",
          acknowledged: false,
          createdAt: new Date(),
          user: {
            id: patientId,
            email: "patient@example.com",
            firstName: "Patient",
            lastName: "One",
          },
        },
      ];

      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue(patientIds);
      (prismaService.alert.findMany as jest.Mock).mockResolvedValue(alerts);

      const result = await service.getCritical(doctorId);

      expect(result).toHaveLength(1);
      expect(prismaService.alert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            severity: { in: [AlertSeverity.CRITICAL, AlertSeverity.HIGH] },
            acknowledged: false,
          }),
        }),
      );
    });
  });

  describe("getRecent", () => {
    beforeEach(() => {
      (doctorUtilsService.verifyDoctor as jest.Mock).mockResolvedValue(undefined);
    });

    it("should return recent alerts within 24 hours", async () => {
      const patientIds = [patientId];
      const alerts = [
        {
          id: "alert-1",
          userId: patientId,
          type: AlertType.HYPOGLYCEMIA,
          severity: AlertSeverity.HIGH,
          message: "Recent alert",
          acknowledged: false,
          createdAt: new Date(),
          user: {
            id: patientId,
            email: "patient@example.com",
            firstName: "Patient",
            lastName: "One",
          },
        },
      ];

      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue(patientIds);
      (prismaService.alert.findMany as jest.Mock).mockResolvedValue(alerts);

      const result = await service.getRecent(doctorId, 10);

      expect(result).toHaveLength(1);
      expect(prismaService.alert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
            }),
          }),
        }),
      );
    });
  });

  describe("acknowledge", () => {
    beforeEach(() => {
      (doctorUtilsService.verifyDoctor as jest.Mock).mockResolvedValue(undefined);
    });

    it("should acknowledge alert successfully", async () => {
      const alertId = "alert-123";
      const patientIds = [patientId];
      const alert = {
        id: alertId,
        userId: patientId,
        type: AlertType.HYPOGLYCEMIA,
        severity: AlertSeverity.HIGH,
        message: "Test alert",
        acknowledged: false,
        createdAt: new Date(),
        user: {
          id: patientId,
          email: "patient@example.com",
          firstName: "Patient",
          lastName: "One",
        },
      };
      const updatedAlert = {
        ...alert,
        acknowledged: true,
        acknowledgedAt: new Date(),
      };

      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue(patientIds);
      (prismaService.alert.findUnique as jest.Mock).mockResolvedValue(alert);
      (prismaService.alert.update as jest.Mock).mockResolvedValue(updatedAlert);

      const result = await service.acknowledge(doctorId, alertId);

      expect(result.acknowledged).toBe(true);
      expect(result.acknowledgedAt).toBeDefined();
    });

    it("should throw ForbiddenException if alert not found", async () => {
      const alertId = "alert-123";
      const patientIds = [patientId];

      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue(patientIds);
      (prismaService.alert.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.acknowledge(doctorId, alertId)).rejects.toThrow(ForbiddenException);
    });

    it("should throw ForbiddenException if alert not for doctor's patient", async () => {
      const alertId = "alert-123";
      const patientIds = ["other-patient"];
      const alert = {
        id: alertId,
        userId: patientId,
        type: AlertType.HYPOGLYCEMIA,
        severity: AlertSeverity.HIGH,
        message: "Test alert",
        acknowledged: false,
        createdAt: new Date(),
        user: {
          id: patientId,
          email: "patient@example.com",
          firstName: "Patient",
          lastName: "One",
        },
      };

      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue(patientIds);
      (prismaService.alert.findUnique as jest.Mock).mockResolvedValue(alert);

      await expect(service.acknowledge(doctorId, alertId)).rejects.toThrow(ForbiddenException);
    });
  });
});
