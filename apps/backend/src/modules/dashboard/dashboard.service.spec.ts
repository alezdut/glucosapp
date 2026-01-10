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

    describe("interpolation logic", () => {
      const patientIds = [patientId];

      // Helper function to create a date N days ago
      const daysAgo = (n: number): Date => {
        const date = new Date();
        date.setDate(date.getDate() - n);
        date.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
        return date;
      };

      // Helper function to get date key (YYYY-MM-DD)
      const getDateKey = (date: Date): string => {
        return date.toISOString().split("T")[0];
      };

      beforeEach(() => {
        (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue(patientIds);
        (prismaService.glucoseReading.findMany as jest.Mock).mockResolvedValue([]);
      });

      it("should return empty array when no data (so frontend can show informative message)", async () => {
        (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue([]);

        const result = await service.getGlucoseEvolution(doctorId);

        expect(result.data).toHaveLength(0);
        expect(result.data).toEqual([]);
      });

      it("should set all 15 days to the same value when only 1 day has data", async () => {
        const targetDay = daysAgo(7); // Day 7 (middle of the 15-day range)
        const glucoseValue = 120;

        const glucoseEntries = [
          {
            mgdlEncrypted: `encrypted-${glucoseValue}`,
            recordedAt: targetDay,
          },
        ];

        (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue(glucoseEntries);

        const result = await service.getGlucoseEvolution(doctorId);

        expect(result.data).toHaveLength(15);
        result.data.forEach((point) => {
          expect(point.averageGlucose).toBe(glucoseValue);
          expect(point.minGlucose).toBe(glucoseValue);
          expect(point.maxGlucose).toBe(glucoseValue);
        });
      });

      it("should set all 15 days to the same value when only 1 day has data (first day)", async () => {
        const targetDay = daysAgo(14); // First day
        const glucoseValue = 130;

        const glucoseEntries = [
          {
            mgdlEncrypted: `encrypted-${glucoseValue}`,
            recordedAt: targetDay,
          },
        ];

        (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue(glucoseEntries);

        const result = await service.getGlucoseEvolution(doctorId);

        expect(result.data).toHaveLength(15);
        result.data.forEach((point) => {
          expect(point.averageGlucose).toBe(glucoseValue);
        });
      });

      it("should set all 15 days to the same value when only 1 day has data (last day)", async () => {
        const targetDay = daysAgo(0); // Today (last day)
        const glucoseValue = 140;

        const glucoseEntries = [
          {
            mgdlEncrypted: `encrypted-${glucoseValue}`,
            recordedAt: targetDay,
          },
        ];

        (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue(glucoseEntries);

        const result = await service.getGlucoseEvolution(doctorId);

        expect(result.data).toHaveLength(15);
        result.data.forEach((point) => {
          expect(point.averageGlucose).toBe(glucoseValue);
        });
      });

      it("should interpolate linearly between 2 days with data", async () => {
        const firstDay = daysAgo(10); // Day 4 (index 4)
        const lastDay = daysAgo(5); // Day 9 (index 9)
        const firstValue = 100;
        const lastValue = 150;

        const glucoseEntries = [
          {
            mgdlEncrypted: `encrypted-${firstValue}`,
            recordedAt: firstDay,
          },
          {
            mgdlEncrypted: `encrypted-${lastValue}`,
            recordedAt: lastDay,
          },
        ];

        (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue(glucoseEntries);

        const result = await service.getGlucoseEvolution(doctorId);

        expect(result.data).toHaveLength(15);

        // Find indices of data points
        const firstDataIndex = result.data.findIndex((p) => getDateKey(firstDay) === p.date);
        const lastDataIndex = result.data.findIndex((p) => getDateKey(lastDay) === p.date);

        expect(firstDataIndex).toBeGreaterThanOrEqual(0);
        expect(lastDataIndex).toBeGreaterThanOrEqual(0);
        expect(firstDataIndex).toBeLessThan(lastDataIndex);

        // Days before first data point should equal first value
        for (let i = 0; i < firstDataIndex; i++) {
          expect(result.data[i].averageGlucose).toBe(firstValue);
        }

        // First data point should have the correct value
        expect(result.data[firstDataIndex].averageGlucose).toBe(firstValue);

        // Days between should be linearly interpolated
        const distance = lastDataIndex - firstDataIndex;
        for (let i = firstDataIndex + 1; i < lastDataIndex; i++) {
          const position = i - firstDataIndex;
          const expectedValue = Math.round(
            firstValue + ((lastValue - firstValue) * position) / distance,
          );
          expect(result.data[i].averageGlucose).toBe(expectedValue);
        }

        // Last data point should have the correct value
        expect(result.data[lastDataIndex].averageGlucose).toBe(lastValue);

        // Days after last data point should equal last value
        for (let i = lastDataIndex + 1; i < result.data.length; i++) {
          expect(result.data[i].averageGlucose).toBe(lastValue);
        }
      });

      it("should interpolate linearly between 2 days with data (first and last day)", async () => {
        const firstDay = daysAgo(14); // First day (index 0)
        const lastDay = daysAgo(0); // Last day (index 14)
        const firstValue = 90;
        const lastValue = 110;

        const glucoseEntries = [
          {
            mgdlEncrypted: `encrypted-${firstValue}`,
            recordedAt: firstDay,
          },
          {
            mgdlEncrypted: `encrypted-${lastValue}`,
            recordedAt: lastDay,
          },
        ];

        (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue(glucoseEntries);

        const result = await service.getGlucoseEvolution(doctorId);

        expect(result.data).toHaveLength(15);

        // First day should have first value
        expect(result.data[0].averageGlucose).toBe(firstValue);

        // Days between should be linearly interpolated
        const distance = 14;
        for (let i = 1; i < 14; i++) {
          const expectedValue = Math.round(firstValue + ((lastValue - firstValue) * i) / distance);
          expect(result.data[i].averageGlucose).toBe(expectedValue);
        }

        // Last day should have last value
        expect(result.data[14].averageGlucose).toBe(lastValue);
      });

      it("should interpolate linearly between 2 days with data (decreasing trend)", async () => {
        const firstDay = daysAgo(10);
        const lastDay = daysAgo(5);
        const firstValue = 150;
        const lastValue = 100;

        const glucoseEntries = [
          {
            mgdlEncrypted: `encrypted-${firstValue}`,
            recordedAt: firstDay,
          },
          {
            mgdlEncrypted: `encrypted-${lastValue}`,
            recordedAt: lastDay,
          },
        ];

        (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue(glucoseEntries);

        const result = await service.getGlucoseEvolution(doctorId);

        expect(result.data).toHaveLength(15);

        const firstDataIndex = result.data.findIndex((p) => getDateKey(firstDay) === p.date);
        const lastDataIndex = result.data.findIndex((p) => getDateKey(lastDay) === p.date);

        // Days between should be linearly interpolated (decreasing)
        const distance = lastDataIndex - firstDataIndex;
        for (let i = firstDataIndex + 1; i < lastDataIndex; i++) {
          const position = i - firstDataIndex;
          const expectedValue = Math.round(
            firstValue + ((lastValue - firstValue) * position) / distance,
          );
          expect(result.data[i].averageGlucose).toBe(expectedValue);
          // Should be decreasing
          expect(result.data[i].averageGlucose).toBeLessThanOrEqual(
            result.data[i - 1].averageGlucose,
          );
        }
      });

      it("should handle 3 days with data correctly", async () => {
        const day1 = daysAgo(12);
        const day2 = daysAgo(6);
        const day3 = daysAgo(2);
        const value1 = 100;
        const value2 = 150;
        const value3 = 120;

        const glucoseEntries = [
          {
            mgdlEncrypted: `encrypted-${value1}`,
            recordedAt: day1,
          },
          {
            mgdlEncrypted: `encrypted-${value2}`,
            recordedAt: day2,
          },
          {
            mgdlEncrypted: `encrypted-${value3}`,
            recordedAt: day3,
          },
        ];

        (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue(glucoseEntries);

        const result = await service.getGlucoseEvolution(doctorId);

        expect(result.data).toHaveLength(15);

        const index1 = result.data.findIndex((p) => getDateKey(day1) === p.date);
        const index2 = result.data.findIndex((p) => getDateKey(day2) === p.date);
        const index3 = result.data.findIndex((p) => getDateKey(day3) === p.date);

        // Verify data points have correct values
        expect(result.data[index1].averageGlucose).toBe(value1);
        expect(result.data[index2].averageGlucose).toBe(value2);
        expect(result.data[index3].averageGlucose).toBe(value3);

        // Days before first should equal first value
        for (let i = 0; i < index1; i++) {
          expect(result.data[i].averageGlucose).toBe(value1);
        }

        // Days between day1 and day2 should be linearly interpolated
        const distance1 = index2 - index1;
        for (let i = index1 + 1; i < index2; i++) {
          const position = i - index1;
          const expectedValue = Math.round(value1 + ((value2 - value1) * position) / distance1);
          expect(result.data[i].averageGlucose).toBe(expectedValue);
        }

        // Days between day2 and day3 should be linearly interpolated
        const distance2 = index3 - index2;
        for (let i = index2 + 1; i < index3; i++) {
          const position = i - index2;
          const expectedValue = Math.round(value2 + ((value3 - value2) * position) / distance2);
          expect(result.data[i].averageGlucose).toBe(expectedValue);
        }

        // Days after last should equal last value
        for (let i = index3 + 1; i < result.data.length; i++) {
          expect(result.data[i].averageGlucose).toBe(value3);
        }
      });

      it("should handle consecutive days with data", async () => {
        const day1 = daysAgo(5);
        const day2 = daysAgo(4);
        const value1 = 120;
        const value2 = 130;

        const glucoseEntries = [
          {
            mgdlEncrypted: `encrypted-${value1}`,
            recordedAt: day1,
          },
          {
            mgdlEncrypted: `encrypted-${value2}`,
            recordedAt: day2,
          },
        ];

        (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue(glucoseEntries);

        const result = await service.getGlucoseEvolution(doctorId);

        expect(result.data).toHaveLength(15);

        const index1 = result.data.findIndex((p) => getDateKey(day1) === p.date);
        const index2 = result.data.findIndex((p) => getDateKey(day2) === p.date);

        expect(result.data[index1].averageGlucose).toBe(value1);
        expect(result.data[index2].averageGlucose).toBe(value2);

        // No days between consecutive days, so no interpolation needed
        expect(index2).toBe(index1 + 1);
      });

      it("should handle multiple readings on the same day", async () => {
        const targetDay = daysAgo(7);
        const readings = [100, 110, 120, 130];

        // Create entries all on the same calendar day (use same date, different times)
        const baseDate = new Date(targetDay);
        baseDate.setHours(0, 0, 0, 0);
        const glucoseEntries = readings.map((value, idx) => ({
          mgdlEncrypted: `encrypted-${value}`,
          recordedAt: new Date(baseDate.getTime() + idx * 6 * 60 * 60 * 1000), // 6 hours apart
        }));

        (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue(glucoseEntries);

        const result = await service.getGlucoseEvolution(doctorId);

        expect(result.data).toHaveLength(15);

        // Find the data point - it should be the one where minGlucose !== averageGlucose
        // (interpolated points have minGlucose === averageGlucose)
        const expectedAverage = Math.round(readings.reduce((a, b) => a + b, 0) / readings.length);
        const expectedMin = Math.min(...readings);
        const expectedMax = Math.max(...readings);

        const targetPoint = result.data.find(
          (p) => p.minGlucose !== p.averageGlucose || p.maxGlucose !== p.averageGlucose,
        );

        expect(targetPoint).toBeDefined();
        expect(targetPoint!.averageGlucose).toBe(expectedAverage);
        expect(targetPoint!.minGlucose).toBe(expectedMin);
        expect(targetPoint!.maxGlucose).toBe(expectedMax);

        // All other days (interpolated) should equal this average for all values
        result.data.forEach((point) => {
          if (point !== targetPoint) {
            expect(point.averageGlucose).toBe(expectedAverage);
            expect(point.minGlucose).toBe(expectedAverage);
            expect(point.maxGlucose).toBe(expectedAverage);
          }
        });
      });
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
