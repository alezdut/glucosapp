import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { SensorReadingsService } from "./sensor-readings.service";
import { EncryptionService } from "../../common/services/encryption.service";
import { AlertsService } from "../alerts/alerts.service";
import { createMockPrismaService } from "../../common/test-helpers/prisma.mock";
import { createMockConfigService } from "../../common/test-helpers/config.mock";
import { CreateSensorReadingDto, ReadingSource } from "./dto/create-sensor-reading.dto";
import { BatchCreateSensorReadingsDto } from "./dto/batch-create-sensor-readings.dto";
import { ExportReadingsQueryDto, ExportFormat } from "./dto/export-readings-query.dto";

describe("SensorReadingsService", () => {
  let service: SensorReadingsService;
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
    const mockAlertsService = {
      detectAlert: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SensorReadingsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: EncryptionService,
          useValue: mockEncryptionService,
        },
        {
          provide: AlertsService,
          useValue: mockAlertsService,
        },
        {
          provide: "ConfigService",
          useValue: mockConfig,
        },
      ],
    }).compile();

    service = module.get<SensorReadingsService>(SensorReadingsService);
    prismaService = module.get<PrismaService>(PrismaService);
    encryptionService = module.get<EncryptionService>(EncryptionService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createReading", () => {
    it("should create a sensor reading successfully", async () => {
      const data: CreateSensorReadingDto = {
        glucose: 120,
        recordedAt: new Date().toISOString(),
        source: ReadingSource.MANUAL,
      };
      const createdReading = {
        id: "reading-123",
        userId,
        glucoseEncrypted: "encrypted-120",
        recordedAt: new Date(data.recordedAt),
        source: ReadingSource.MANUAL,
        isHistorical: false,
        createdAt: new Date(),
      };

      (prismaService.glucoseReading.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.glucoseReading.create as jest.Mock).mockResolvedValue(createdReading);

      const result = await service.createReading(userId, data);

      expect(result).toMatchObject({
        id: "reading-123",
        userId,
      });
      expect(encryptionService.encryptGlucoseValue).toHaveBeenCalledWith(120);
      expect(prismaService.glucoseReading.create).toHaveBeenCalled();
    });

    it("should throw BadRequestException for invalid glucose value", async () => {
      const data: any = {
        glucose: null,
        recordedAt: new Date().toISOString(),
      };

      await expect(service.createReading(userId, data)).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException if recordedAt is in the future", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const data: CreateSensorReadingDto = {
        glucose: 120,
        recordedAt: futureDate.toISOString(),
      };

      await expect(service.createReading(userId, data)).rejects.toThrow(BadRequestException);
    });

    it("should return existing reading if duplicate", async () => {
      const data: CreateSensorReadingDto = {
        glucose: 120,
        recordedAt: new Date().toISOString(),
        source: ReadingSource.MANUAL,
      };
      const existingReading = {
        id: "existing-123",
        userId,
        glucoseEncrypted: "encrypted-120",
        recordedAt: new Date(data.recordedAt),
        source: ReadingSource.MANUAL,
        isHistorical: false,
        createdAt: new Date(),
      };

      (prismaService.glucoseReading.findFirst as jest.Mock).mockResolvedValue(existingReading);

      const result = await service.createReading(userId, data);

      expect(result).toEqual(existingReading);
      expect(prismaService.glucoseReading.create).not.toHaveBeenCalled();
    });
  });

  describe("batchCreateReadings", () => {
    it("should batch create readings successfully", async () => {
      const data: BatchCreateSensorReadingsDto = {
        readings: [
          {
            glucose: 120,
            recordedAt: new Date().toISOString(),
            source: ReadingSource.MANUAL,
            isHistorical: false,
          },
          {
            glucose: 130,
            recordedAt: new Date().toISOString(),
            source: ReadingSource.MANUAL,
            isHistorical: true,
          },
        ],
      };
      const createdReadings = [
        {
          id: "reading-1",
          userId,
          glucoseEncrypted: "encrypted-120",
          recordedAt: new Date(data.readings[0].recordedAt),
          source: ReadingSource.MANUAL,
          isHistorical: false,
        },
        {
          id: "reading-2",
          userId,
          glucoseEncrypted: "encrypted-130",
          recordedAt: new Date(data.readings[1].recordedAt),
          source: ReadingSource.MANUAL,
          isHistorical: true,
        },
      ];

      (prismaService.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const tx = {
          glucoseReading: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockImplementation((args) => {
              const reading = createdReadings.find(
                (r) => r.glucoseEncrypted === args.data.glucoseEncrypted,
              );
              return Promise.resolve(reading || createdReadings[0]);
            }),
          },
          logEntry: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: "log-123" }),
          },
          glucoseEntry: {
            create: jest.fn().mockResolvedValue({ id: "glucose-123" }),
          },
        };
        return callback(tx);
      });

      const result = await service.batchCreateReadings(userId, data);

      expect(result.created).toBe(2);
      expect(result.total).toBe(2);
      expect(result.readings.length).toBe(2);
    });

    it("should throw BadRequestException if no readings provided", async () => {
      const data: BatchCreateSensorReadingsDto = {
        readings: [],
      };

      await expect(service.batchCreateReadings(userId, data)).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException if more than 100 readings", async () => {
      const data: BatchCreateSensorReadingsDto = {
        readings: Array(101).fill({
          glucose: 120,
          recordedAt: new Date().toISOString(),
        }),
      };

      await expect(service.batchCreateReadings(userId, data)).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException if future timestamp", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const data: BatchCreateSensorReadingsDto = {
        readings: [
          {
            glucose: 120,
            recordedAt: futureDate.toISOString(),
          },
        ],
      };

      await expect(service.batchCreateReadings(userId, data)).rejects.toThrow(BadRequestException);
    });

    it("should skip duplicates", async () => {
      const data: BatchCreateSensorReadingsDto = {
        readings: [
          {
            glucose: 120,
            recordedAt: new Date().toISOString(),
            source: ReadingSource.MANUAL,
          },
        ],
      };

      (prismaService.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const tx = {
          glucoseReading: {
            findFirst: jest.fn().mockResolvedValue({ id: "existing" }),
            create: jest.fn(),
          },
          logEntry: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: "log-123" }),
          },
          glucoseEntry: {
            create: jest.fn().mockResolvedValue({ id: "glucose-123" }),
          },
        };
        return callback(tx);
      });

      const result = await service.batchCreateReadings(userId, data);

      expect(result.created).toBe(0);
      expect(result.skipped).toBe(1);
    });
  });

  describe("getReadingsByDateRange", () => {
    it("should return readings within date range", async () => {
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-01-31");
      const readings = [
        {
          id: "reading-1",
          userId,
          glucoseEncrypted: "encrypted-120",
          recordedAt: new Date("2024-01-15"),
          source: ReadingSource.MANUAL,
          isHistorical: false,
          createdAt: new Date(),
        },
      ];

      (prismaService.glucoseReading.findMany as jest.Mock).mockResolvedValue(readings);

      const result = await service.getReadingsByDateRange(userId, startDate, endDate);

      expect(result).toHaveLength(1);
      expect(prismaService.glucoseReading.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId,
            recordedAt: expect.objectContaining({
              gte: startDate,
              lte: endDate,
            }),
          }),
        }),
      );
    });

    it("should return all readings if no date range provided", async () => {
      const readings = [
        {
          id: "reading-1",
          userId,
          glucoseEncrypted: "encrypted-120",
          recordedAt: new Date(),
          source: ReadingSource.MANUAL,
          isHistorical: false,
          createdAt: new Date(),
        },
      ];

      (prismaService.glucoseReading.findMany as jest.Mock).mockResolvedValue(readings);

      const result = await service.getReadingsByDateRange(userId);

      expect(result).toHaveLength(1);
      expect(prismaService.glucoseReading.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId },
        }),
      );
    });
  });

  describe("exportReadings", () => {
    it("should export readings as JSON", async () => {
      const query: ExportReadingsQueryDto = {
        format: ExportFormat.JSON,
      };
      const readings = [
        {
          id: "reading-1",
          userId,
          glucoseEncrypted: "encrypted-120",
          recordedAt: new Date("2024-01-15"),
          source: ReadingSource.MANUAL,
          isHistorical: false,
          createdAt: new Date(),
        },
      ];

      (prismaService.glucoseReading.findMany as jest.Mock).mockResolvedValue(readings);

      const result = await service.exportReadings(userId, query);

      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toMatchObject({
        id: "reading-1",
        userId,
        glucose: 120,
        recordedAt: expect.any(String),
      });
    });

    it("should export readings as CSV", async () => {
      const query: ExportReadingsQueryDto = {
        format: ExportFormat.CSV,
      };
      const readings = [
        {
          id: "reading-1",
          userId,
          glucoseEncrypted: "encrypted-120",
          recordedAt: new Date("2024-01-15"),
          source: ReadingSource.MANUAL,
          isHistorical: false,
          createdAt: new Date(),
        },
      ];

      (prismaService.glucoseReading.findMany as jest.Mock).mockResolvedValue(readings);

      const result = await service.exportReadings(userId, query);

      expect(typeof result).toBe("string");
      expect(result).toContain("recordedAt");
      expect(result).toContain("glucose_mgdl");
      expect(result).toContain("120");
    });

    it("should filter by date range", async () => {
      const query: ExportReadingsQueryDto = {
        startDate: "2024-01-01",
        endDate: "2024-01-31",
        format: ExportFormat.JSON,
      };

      (prismaService.glucoseReading.findMany as jest.Mock).mockResolvedValue([]);

      await service.exportReadings(userId, query);

      expect(prismaService.glucoseReading.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            recordedAt: expect.objectContaining({
              gte: new Date("2024-01-01"),
              lte: new Date("2024-01-31"),
            }),
          }),
        }),
      );
    });
  });

  describe("getLatestReading", () => {
    it("should return latest reading", async () => {
      const latestReading = {
        id: "reading-123",
        recordedAt: new Date(),
        source: ReadingSource.MANUAL,
      };

      (prismaService.glucoseReading.findFirst as jest.Mock).mockResolvedValue(latestReading);

      const result = await service.getLatestReading(userId);

      expect(result).toEqual(latestReading);
      expect(prismaService.glucoseReading.findFirst).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { recordedAt: "desc" },
        select: {
          id: true,
          recordedAt: true,
          source: true,
        },
      });
    });

    it("should return null if no readings", async () => {
      (prismaService.glucoseReading.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.getLatestReading(userId);

      expect(result).toBeNull();
    });
  });

  describe("getStatistics", () => {
    it("should return statistics for readings", async () => {
      const readings = [
        {
          id: "reading-1",
          userId,
          glucoseEncrypted: "encrypted-120",
          recordedAt: new Date(),
          source: ReadingSource.MANUAL,
          isHistorical: false,
          createdAt: new Date(),
        },
        {
          id: "reading-2",
          userId,
          glucoseEncrypted: "encrypted-130",
          recordedAt: new Date(),
          source: ReadingSource.MANUAL,
          isHistorical: false,
          createdAt: new Date(),
        },
        {
          id: "reading-3",
          userId,
          glucoseEncrypted: "encrypted-110",
          recordedAt: new Date(),
          source: ReadingSource.MANUAL,
          isHistorical: false,
          createdAt: new Date(),
        },
      ];

      (prismaService.glucoseReading.findMany as jest.Mock).mockResolvedValue(readings);

      const result = await service.getStatistics(userId, 30);

      expect(result).toMatchObject({
        totalReadings: 3,
        averageGlucose: expect.any(Number),
        minGlucose: expect.any(Number),
        maxGlucose: expect.any(Number),
      });
      expect(result.averageGlucose).toBeGreaterThan(0);
      expect(result.minGlucose).toBe(110);
      expect(result.maxGlucose).toBe(130);
    });

    it("should return null stats when no readings", async () => {
      (prismaService.glucoseReading.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getStatistics(userId, 30);

      expect(result).toEqual({
        totalReadings: 0,
        averageGlucose: null,
        minGlucose: null,
        maxGlucose: null,
      });
    });

    it("should handle decryption errors gracefully", async () => {
      const readings = [
        {
          id: "reading-1",
          userId,
          glucoseEncrypted: "invalid-encrypted",
          recordedAt: new Date(),
          source: ReadingSource.MANUAL,
          isHistorical: false,
          createdAt: new Date(),
        },
      ];

      (prismaService.glucoseReading.findMany as jest.Mock).mockResolvedValue(readings);
      (encryptionService.decryptGlucoseValue as jest.Mock).mockImplementation(() => {
        throw new Error("Decryption failed");
      });

      const result = await service.getStatistics(userId, 30);

      expect(result.totalReadings).toBe(1);
      expect(result.averageGlucose).toBeNull();
    });
  });
});
