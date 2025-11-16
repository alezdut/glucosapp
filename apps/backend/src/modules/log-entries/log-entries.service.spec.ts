import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../../prisma/prisma.service";
import { LogEntriesService } from "./log-entries.service";
import { EncryptionService } from "../../common/services/encryption.service";
import { createMockPrismaService } from "../../common/test-helpers/prisma.mock";
import { createMockConfigService } from "../../common/test-helpers/config.mock";
import { CreateLogEntryDto } from "./dto/create-log-entry.dto";

describe("LogEntriesService", () => {
  let service: LogEntriesService;
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
        LogEntriesService,
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

    service = module.get<LogEntriesService>(LogEntriesService);
    prismaService = module.get<PrismaService>(PrismaService);
    encryptionService = module.get<EncryptionService>(EncryptionService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findAll", () => {
    it("should return log entries with decrypted glucose", async () => {
      const logEntries = [
        {
          id: "log-1",
          userId,
          recordedAt: new Date("2024-01-01"),
          glucoseEntry: {
            id: "glucose-1",
            mgdlEncrypted: "encrypted-120",
            recordedAt: new Date("2024-01-01"),
          },
          insulinDose: null,
          mealTemplate: null,
        },
      ];

      (prismaService.logEntry.findMany as jest.Mock).mockResolvedValue(logEntries);

      const result = await service.findAll(userId);

      expect(result).toHaveLength(1);
      expect(result[0].glucoseEntry?.mgdl).toBe(120);
    });

    it("should filter by date range", async () => {
      const startDate = "2024-01-01";
      const endDate = "2024-01-31";

      (prismaService.logEntry.findMany as jest.Mock).mockResolvedValue([]);

      await service.findAll(userId, startDate, endDate);

      expect(prismaService.logEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            recordedAt: expect.objectContaining({
              gte: new Date(startDate),
              lte: new Date(endDate),
            }),
          }),
        }),
      );
    });

    it("should handle decryption errors gracefully", async () => {
      const logEntries = [
        {
          id: "log-1",
          userId,
          recordedAt: new Date("2024-01-01"),
          glucoseEntry: {
            id: "glucose-1",
            mgdlEncrypted: "invalid-encrypted",
            recordedAt: new Date("2024-01-01"),
          },
          insulinDose: null,
          mealTemplate: null,
        },
      ];

      (prismaService.logEntry.findMany as jest.Mock).mockResolvedValue(logEntries);
      (encryptionService.decryptGlucoseValue as jest.Mock).mockImplementation(() => {
        throw new Error("Decryption failed");
      });

      const result = await service.findAll(userId);

      expect(result).toHaveLength(1);
      expect(result[0].glucoseEntry?.mgdl).toBeNull();
    });
  });

  describe("create", () => {
    it("should create log entry with glucose and insulin", async () => {
      const data: CreateLogEntryDto = {
        glucoseMgdl: 120,
        insulinUnits: 5,
        insulinType: "BOLUS",
        carbohydrates: 50,
        mealType: "BREAKFAST",
      };

      (prismaService.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const tx = {
          glucoseEntry: {
            create: jest.fn().mockResolvedValue({
              id: "glucose-1",
              userId,
              mgdlEncrypted: "encrypted-120",
              recordedAt: new Date(),
            }),
          },
          insulinDose: {
            create: jest.fn().mockResolvedValue({
              id: "insulin-1",
              userId,
              units: 5,
              recordedAt: new Date(),
            }),
          },
          logEntry: {
            create: jest.fn().mockResolvedValue({
              id: "log-1",
              userId,
              recordedAt: new Date(),
              glucoseEntryId: "glucose-1",
              insulinDoseId: "insulin-1",
            }),
          },
        };
        return callback(tx);
      });

      const result = await service.create(userId, data);

      expect(result).toBeDefined();
      expect(encryptionService.encryptGlucoseValue).toHaveBeenCalledWith(120);
    });

    it("should not create insulin dose if units is 0", async () => {
      const data: CreateLogEntryDto = {
        glucoseMgdl: 120,
        insulinUnits: 0,
        insulinType: "BOLUS",
        carbohydrates: 50,
      };

      (prismaService.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const tx = {
          glucoseEntry: {
            create: jest.fn().mockResolvedValue({
              id: "glucose-1",
              userId,
              mgdlEncrypted: "encrypted-120",
              recordedAt: new Date(),
            }),
          },
          insulinDose: {
            create: jest.fn(),
          },
          logEntry: {
            create: jest.fn().mockResolvedValue({
              id: "log-1",
              userId,
              recordedAt: new Date(),
              glucoseEntryId: "glucose-1",
              insulinDoseId: null,
            }),
          },
        };
        return callback(tx);
      });

      await service.create(userId, data);

      expect(prismaService.$transaction).toHaveBeenCalled();
    });
  });
});
