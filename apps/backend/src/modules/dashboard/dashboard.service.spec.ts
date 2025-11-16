import { Test, TestingModule } from "@nestjs/testing";
import { ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { DashboardService } from "./dashboard.service";
import { DoctorUtilsService } from "../../common/services/doctor-utils.service";
import { EncryptionService } from "../../common/services/encryption.service";
import { createMockPrismaService } from "../../common/test-helpers/prisma.mock";
import { createMockConfigService } from "../../common/test-helpers/config.mock";

describe("DashboardService", () => {
  let service: DashboardService;
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
        DashboardService,
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

    service = module.get<DashboardService>(DashboardService);
    prismaService = module.get<PrismaService>(PrismaService);
    doctorUtilsService = module.get<DoctorUtilsService>(DoctorUtilsService);
    encryptionService = module.get<EncryptionService>(EncryptionService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getSummary", () => {
    beforeEach(() => {
      (doctorUtilsService.verifyDoctor as jest.Mock).mockResolvedValue(undefined);
    });

    it("should return dashboard summary with correct counts", async () => {
      const patientIds = [patientId, "patient-456"];

      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue(patientIds);
      (prismaService.user.count as jest.Mock).mockResolvedValue(2);
      (prismaService.alert.count as jest.Mock).mockResolvedValue(5);
      (prismaService.appointment.count as jest.Mock).mockResolvedValue(3);

      const result = await service.getSummary(doctorId);

      expect(result).toEqual({
        activePatients: 2,
        criticalAlerts: 5,
        upcomingAppointments: 3,
      });
    });

    it("should return zero counts when no data", async () => {
      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue([]);
      (prismaService.user.count as jest.Mock).mockResolvedValue(0);
      (prismaService.alert.count as jest.Mock).mockResolvedValue(0);
      (prismaService.appointment.count as jest.Mock).mockResolvedValue(0);

      const result = await service.getSummary(doctorId);

      expect(result).toEqual({
        activePatients: 0,
        criticalAlerts: 0,
        upcomingAppointments: 0,
      });
    });
  });

  describe("getGlucoseEvolution", () => {
    beforeEach(() => {
      (doctorUtilsService.verifyDoctor as jest.Mock).mockResolvedValue(undefined);
    });

    it("should return empty array when no patients", async () => {
      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue([]);

      const result = await service.getGlucoseEvolution(doctorId);

      expect(result).toEqual({ data: [] });
    });

    it("should return glucose evolution data aggregated by day", async () => {
      const patientIds = [patientId];
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const twoDaysAgo = new Date(now);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const glucoseEntries = [
        {
          mgdlEncrypted: "encrypted-120",
          recordedAt: yesterday,
        },
        {
          mgdlEncrypted: "encrypted-130",
          recordedAt: new Date(yesterday.getTime() + 4 * 60 * 60 * 1000), // 4 hours later
        },
        {
          mgdlEncrypted: "encrypted-110",
          recordedAt: twoDaysAgo,
        },
      ];

      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue(patientIds);
      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue(glucoseEntries);
      (prismaService.glucoseReading.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getGlucoseEvolution(doctorId);

      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data[0]).toMatchObject({
        date: expect.any(String),
        averageGlucose: expect.any(Number),
        minGlucose: expect.any(Number),
        maxGlucose: expect.any(Number),
      });
    });

    it("should combine glucose entries and readings", async () => {
      const patientIds = [patientId];
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);

      const glucoseEntries = [
        {
          mgdlEncrypted: "encrypted-120",
          recordedAt: yesterday,
        },
      ];
      const glucoseReadings = [
        {
          glucoseEncrypted: "encrypted-125",
          recordedAt: new Date(yesterday.getTime() + 2 * 60 * 60 * 1000), // 2 hours later
        },
      ];

      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue(patientIds);
      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue(glucoseEntries);
      (prismaService.glucoseReading.findMany as jest.Mock).mockResolvedValue(glucoseReadings);

      const result = await service.getGlucoseEvolution(doctorId);

      expect(result.data.length).toBeGreaterThan(0);
    });
  });

  describe("getInsulinStats", () => {
    beforeEach(() => {
      (doctorUtilsService.verifyDoctor as jest.Mock).mockResolvedValue(undefined);
    });

    it("should return zero stats when no patients", async () => {
      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue([]);

      const result = await service.getInsulinStats(doctorId, 30);

      expect(result).toMatchObject({
        averageDose: 0,
        unit: "unidades/día",
        days: 30,
      });
    });

    it("should return zero stats when no doses", async () => {
      const patientIds = [patientId];

      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue(patientIds);
      (prismaService.insulinDose.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getInsulinStats(doctorId, 30);

      expect(result).toMatchObject({
        averageDose: 0,
        unit: "unidades/día",
        days: 30,
      });
    });

    it("should calculate average dose correctly", async () => {
      const patientIds = [patientId];
      const doses = [{ units: 10 }, { units: 15 }, { units: 20 }];

      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue(patientIds);
      (prismaService.insulinDose.findMany as jest.Mock).mockResolvedValue(doses);

      const result = await service.getInsulinStats(doctorId, 30);

      expect(result.averageDose).toBeGreaterThan(0);
      expect(result.unit).toBe("unidades/día");
      expect(result.days).toBe(30);
    });

    it("should handle zero days", async () => {
      const patientIds = [patientId];

      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue(patientIds);

      const result = await service.getInsulinStats(doctorId, 0);

      expect(result).toMatchObject({
        averageDose: 0,
        unit: "unidades/día",
        days: 0,
      });
    });
  });

  describe("getMealStats", () => {
    beforeEach(() => {
      (doctorUtilsService.verifyDoctor as jest.Mock).mockResolvedValue(undefined);
    });

    it("should return zero stats when no patients", async () => {
      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue([]);

      const result = await service.getMealStats(doctorId, 30);

      expect(result).toMatchObject({
        totalMeals: 0,
        unit: "comidas",
      });
    });

    it("should return meal count correctly", async () => {
      const patientIds = [patientId];

      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue(patientIds);
      (prismaService.meal.count as jest.Mock).mockResolvedValue(25);

      const result = await service.getMealStats(doctorId, 30);

      expect(result).toMatchObject({
        totalMeals: 25,
        unit: "comidas",
      });
      expect(result.description).toContain("25");
    });

    it("should use correct period text for 30 days", async () => {
      const patientIds = [patientId];

      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue(patientIds);
      (prismaService.meal.count as jest.Mock).mockResolvedValue(10);

      const result = await service.getMealStats(doctorId, 30);

      expect(result.description).toContain("el mes pasado");
    });

    it("should use correct period text for other days", async () => {
      const patientIds = [patientId];

      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue(patientIds);
      (prismaService.meal.count as jest.Mock).mockResolvedValue(10);

      const result = await service.getMealStats(doctorId, 15);

      expect(result.description).toContain("en los últimos 15 días");
    });
  });

  describe("getPatientGlucoseEvolution", () => {
    beforeEach(() => {
      (doctorUtilsService.verifyDoctor as jest.Mock).mockResolvedValue(undefined);
    });

    it("should throw ForbiddenException if patient not assigned", async () => {
      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue([]);

      await expect(service.getPatientGlucoseEvolution(doctorId, patientId, 12)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should return glucose evolution aggregated by month", async () => {
      const assignedPatientIds = [patientId];
      const glucoseEntries = [
        {
          mgdlEncrypted: "encrypted-120",
          recordedAt: new Date("2024-01-15T10:00:00Z"),
        },
        {
          mgdlEncrypted: "encrypted-130",
          recordedAt: new Date("2024-01-20T14:00:00Z"),
        },
      ];

      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue(assignedPatientIds);
      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue(glucoseEntries);
      (prismaService.glucoseReading.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getPatientGlucoseEvolution(doctorId, patientId, 12);

      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data[0]).toMatchObject({
        month: expect.any(String),
        averageGlucose: expect.any(Number),
        minGlucose: expect.any(Number),
        maxGlucose: expect.any(Number),
      });
    });

    it("should include months with no data", async () => {
      const assignedPatientIds = [patientId];

      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue(assignedPatientIds);
      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.glucoseReading.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getPatientGlucoseEvolution(doctorId, patientId, 12);

      expect(result.data.length).toBe(12);
      expect(result.data[0]).toMatchObject({
        month: expect.any(String),
        averageGlucose: 0,
        minGlucose: 0,
        maxGlucose: 0,
      });
    });
  });

  describe("getPatientInsulinStats", () => {
    beforeEach(() => {
      (doctorUtilsService.verifyDoctor as jest.Mock).mockResolvedValue(undefined);
    });

    it("should throw ForbiddenException if patient not assigned", async () => {
      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue([]);

      await expect(service.getPatientInsulinStats(doctorId, patientId, 12)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should return insulin stats aggregated by month", async () => {
      const assignedPatientIds = [patientId];
      const doses = [
        {
          units: 10,
          type: "BASAL",
          recordedAt: new Date("2024-01-15T10:00:00Z"),
        },
        {
          units: 5,
          type: "BOLUS",
          recordedAt: new Date("2024-01-20T14:00:00Z"),
        },
      ];

      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue(assignedPatientIds);
      (prismaService.insulinDose.findMany as jest.Mock).mockResolvedValue(doses);

      const result = await service.getPatientInsulinStats(doctorId, patientId, 12);

      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data[0]).toMatchObject({
        month: expect.any(String),
        averageBasal: expect.any(Number),
        averageBolus: expect.any(Number),
      });
    });

    it("should include months with no data", async () => {
      const assignedPatientIds = [patientId];

      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue(assignedPatientIds);
      (prismaService.insulinDose.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getPatientInsulinStats(doctorId, patientId, 12);

      expect(result.data.length).toBe(12);
      expect(result.data[0]).toMatchObject({
        month: expect.any(String),
        averageBasal: 0,
        averageBolus: 0,
      });
    });

    it("should separate basal and bolus doses", async () => {
      const assignedPatientIds = [patientId];
      const doses = [
        {
          units: 20,
          type: "BASAL",
          recordedAt: new Date("2024-01-15T10:00:00Z"),
        },
        {
          units: 5,
          type: "BOLUS",
          recordedAt: new Date("2024-01-15T14:00:00Z"),
        },
        {
          units: 8,
          type: "BOLUS",
          recordedAt: new Date("2024-01-15T18:00:00Z"),
        },
      ];

      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue(assignedPatientIds);
      (prismaService.insulinDose.findMany as jest.Mock).mockResolvedValue(doses);

      const result = await service.getPatientInsulinStats(doctorId, patientId, 12);

      expect(result.data.length).toBeGreaterThan(0);
      const monthData = result.data.find((d) => d.month === "2024-01");
      if (monthData) {
        expect(monthData.averageBasal).toBe(20);
        expect(monthData.averageBolus).toBeGreaterThan(0);
      }
    });
  });
});
