import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../../prisma/prisma.service";
import { StatisticsService } from "./statistics.service";
import { EncryptionService } from "../../common/services/encryption.service";
import { createMockPrismaService } from "../../common/test-helpers/prisma.mock";
import { createMockConfigService } from "../../common/test-helpers/config.mock";

describe("StatisticsService", () => {
  let service: StatisticsService;
  let prismaService: PrismaService;
  let encryptionService: EncryptionService;

  const userId = "user-123";

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatisticsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
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

    service = module.get<StatisticsService>(StatisticsService);
    prismaService = module.get<PrismaService>(PrismaService);
    encryptionService = module.get<EncryptionService>(EncryptionService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getSummary", () => {
    it("should return summary statistics", async () => {
      const glucoseEntries = [
        { mgdlEncrypted: "encrypted-120" },
        { mgdlEncrypted: "encrypted-130" },
        { mgdlEncrypted: "encrypted-110" },
      ];
      const sensorReadings = [{ glucoseEncrypted: "encrypted-125" }];
      const insulinDoses = [{ units: 10 }, { units: 5 }];

      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue(glucoseEntries);
      (prismaService.glucoseReading.findMany as jest.Mock).mockResolvedValue(sensorReadings);
      (prismaService.insulinDose.findMany as jest.Mock).mockResolvedValue(insulinDoses);
      (prismaService.logEntry.count as jest.Mock).mockResolvedValue(3);

      const result = await service.getSummary(userId);

      expect(result).toMatchObject({
        averageGlucose: expect.any(Number),
        dailyInsulinDose: expect.any(Number),
        mealsRegistered: expect.any(Number),
      });
      expect(result.averageGlucose).toBeGreaterThan(0);
      expect(result.dailyInsulinDose).toBe(15);
      expect(result.mealsRegistered).toBe(3);
    });

    it("should return zero when no data", async () => {
      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.glucoseReading.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.insulinDose.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.logEntry.count as jest.Mock).mockResolvedValue(0);

      const result = await service.getSummary(userId);

      expect(result).toEqual({
        averageGlucose: 0,
        dailyInsulinDose: 0,
        mealsRegistered: 0,
      });
    });

    it("should combine glucose entries and sensor readings", async () => {
      const glucoseEntries = [
        { mgdlEncrypted: "encrypted-120" },
        { mgdlEncrypted: "encrypted-130" },
      ];
      const sensorReadings = [
        { glucoseEncrypted: "encrypted-125" },
        { glucoseEncrypted: "encrypted-135" },
      ];

      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue(glucoseEntries);
      (prismaService.glucoseReading.findMany as jest.Mock).mockResolvedValue(sensorReadings);
      (prismaService.insulinDose.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.logEntry.count as jest.Mock).mockResolvedValue(0);

      const result = await service.getSummary(userId);

      expect(result.averageGlucose).toBeGreaterThan(0);
    });
  });

  describe("getWeeklyGlucoseAverage", () => {
    it("should return weekly average glucose", async () => {
      const glucoseEntries = [
        { mgdlEncrypted: "encrypted-120" },
        { mgdlEncrypted: "encrypted-130" },
        { mgdlEncrypted: "encrypted-110" },
      ];
      const sensorReadings = [{ glucoseEncrypted: "encrypted-125" }];

      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue(glucoseEntries);
      (prismaService.glucoseReading.findMany as jest.Mock).mockResolvedValue(sensorReadings);

      const result = await service.getWeeklyGlucoseAverage(userId);

      expect(result).toMatchObject({
        averageGlucose: expect.any(Number),
      });
      expect(result.averageGlucose).toBeGreaterThan(0);
    });

    it("should return zero when no data", async () => {
      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.glucoseReading.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getWeeklyGlucoseAverage(userId);

      expect(result).toEqual({
        averageGlucose: 0,
      });
    });

    it("should combine entries and readings", async () => {
      const glucoseEntries = [{ mgdlEncrypted: "encrypted-120" }];
      const sensorReadings = [
        { glucoseEncrypted: "encrypted-130" },
        { glucoseEncrypted: "encrypted-140" },
      ];

      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue(glucoseEntries);
      (prismaService.glucoseReading.findMany as jest.Mock).mockResolvedValue(sensorReadings);

      const result = await service.getWeeklyGlucoseAverage(userId);

      expect(result.averageGlucose).toBeGreaterThan(0);
    });
  });

  describe("getDailyInsulinAverage", () => {
    it("should return daily insulin average", async () => {
      const insulinDoses = [{ units: 10 }, { units: 15 }, { units: 20 }, { units: 5 }];

      (prismaService.insulinDose.findMany as jest.Mock).mockResolvedValue(insulinDoses);

      const result = await service.getDailyInsulinAverage(userId);

      expect(result).toMatchObject({
        averageDose: expect.any(Number),
      });
      expect(result.averageDose).toBeGreaterThan(0);
    });

    it("should return zero when no doses", async () => {
      (prismaService.insulinDose.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getDailyInsulinAverage(userId);

      expect(result).toEqual({
        averageDose: 0,
      });
    });

    it("should calculate average over 7 days", async () => {
      const insulinDoses = [{ units: 10 }, { units: 20 }, { units: 30 }];

      (prismaService.insulinDose.findMany as jest.Mock).mockResolvedValue(insulinDoses);

      const result = await service.getDailyInsulinAverage(userId);

      expect(result.averageDose).toBeGreaterThan(0);
      expect(result.averageDose).toBeLessThanOrEqual(60 / 7 + 0.1); // Allow small rounding difference
    });
  });

  describe("getGlucoseTrend", () => {
    it("should return glucose trend for last 7 days", async () => {
      const glucoseEntries = [
        {
          mgdlEncrypted: "encrypted-120",
          recordedAt: new Date("2024-01-01T10:00:00Z"),
        },
        {
          mgdlEncrypted: "encrypted-130",
          recordedAt: new Date("2024-01-01T14:00:00Z"),
        },
        {
          mgdlEncrypted: "encrypted-110",
          recordedAt: new Date("2024-01-02T10:00:00Z"),
        },
      ];
      const sensorReadings = [
        {
          glucoseEncrypted: "encrypted-125",
          recordedAt: new Date("2024-01-03T10:00:00Z"),
        },
      ];

      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue(glucoseEntries);
      (prismaService.glucoseReading.findMany as jest.Mock).mockResolvedValue(sensorReadings);

      const result = await service.getGlucoseTrend(userId);

      expect(result).toMatchObject({
        data: expect.any(Array),
      });
      expect(result.data.length).toBe(7);
      expect(result.data[0]).toMatchObject({
        date: expect.any(String),
        averageGlucose: expect.any(Number),
      });
    });

    it("should return trend with interpolated values for missing days", async () => {
      const glucoseEntries = [
        {
          mgdlEncrypted: "encrypted-120",
          recordedAt: new Date(),
        },
      ];
      const sensorReadings: any[] = [];

      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue(glucoseEntries);
      (prismaService.glucoseReading.findMany as jest.Mock).mockResolvedValue(sensorReadings);

      const result = await service.getGlucoseTrend(userId);

      expect(result.data.length).toBe(7);
      result.data.forEach((day) => {
        expect(day).toMatchObject({
          date: expect.any(String),
          averageGlucose: expect.any(Number),
        });
      });
    });

    it("should combine entries and readings", async () => {
      const glucoseEntries = [
        {
          mgdlEncrypted: "encrypted-120",
          recordedAt: new Date(),
        },
      ];
      const sensorReadings = [
        {
          glucoseEncrypted: "encrypted-130",
          recordedAt: new Date(),
        },
      ];

      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue(glucoseEntries);
      (prismaService.glucoseReading.findMany as jest.Mock).mockResolvedValue(sensorReadings);

      const result = await service.getGlucoseTrend(userId);

      expect(result.data.length).toBe(7);
    });

    it("should return zero for days with no data and no adjacent data", async () => {
      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.glucoseReading.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getGlucoseTrend(userId);

      expect(result.data.length).toBe(7);
      result.data.forEach((day) => {
        expect(day.averageGlucose).toBe(0);
      });
    });
  });
});
