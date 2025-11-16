import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../../prisma/prisma.service";
import { EncryptionService } from "../../common/services/encryption.service";
import { GlucoseEntriesService } from "./glucose-entries.service";
import { createMockPrismaService } from "../../common/test-helpers/prisma.mock";
import { createMockGlucoseEntry } from "../../common/test-helpers/fixtures";

describe("GlucoseEntriesService", () => {
  let service: GlucoseEntriesService;
  let prismaService: PrismaService;
  let encryptionService: EncryptionService;

  beforeEach(async () => {
    const mockPrisma = createMockPrismaService();
    const mockEncryption = {
      encryptGlucoseValue: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GlucoseEntriesService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: EncryptionService,
          useValue: mockEncryption,
        },
      ],
    }).compile();

    service = module.get<GlucoseEntriesService>(GlucoseEntriesService);
    prismaService = module.get<PrismaService>(PrismaService);
    encryptionService = module.get<EncryptionService>(EncryptionService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    const userId = "user-123";
    const createDto = {
      mgdl: 120,
      note: "Before breakfast",
    };

    it("should create glucose entry with encrypted value", async () => {
      const encryptedValue = "encrypted-glucose-value";
      const mockEntry = createMockGlucoseEntry({
        userId,
        mgdlEncrypted: encryptedValue,
        note: createDto.note,
      });

      (encryptionService.encryptGlucoseValue as jest.Mock).mockReturnValue(encryptedValue);
      (prismaService.glucoseEntry.create as jest.Mock).mockResolvedValue(mockEntry);

      const result = await service.create(userId, createDto);

      expect(encryptionService.encryptGlucoseValue).toHaveBeenCalledWith(createDto.mgdl);
      expect(prismaService.glucoseEntry.create).toHaveBeenCalledWith({
        data: {
          userId,
          mgdlEncrypted: encryptedValue,
          note: createDto.note,
          recordedAt: expect.any(Date),
        },
      });
      expect(result).toEqual(mockEntry);
    });

    it("should use provided recordedAt if available", async () => {
      const recordedAt = new Date("2024-01-01T12:00:00.000Z");
      const encryptedValue = "encrypted-glucose-value";
      const mockEntry = createMockGlucoseEntry({
        userId,
        recordedAt,
      });

      (encryptionService.encryptGlucoseValue as jest.Mock).mockReturnValue(encryptedValue);
      (prismaService.glucoseEntry.create as jest.Mock).mockResolvedValue(mockEntry);

      await service.create(userId, {
        ...createDto,
        recordedAt: recordedAt.toISOString(),
      });

      expect(prismaService.glucoseEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          recordedAt,
        }),
      });
    });

    it("should use current date if recordedAt not provided", async () => {
      const encryptedValue = "encrypted-glucose-value";
      const mockEntry = createMockGlucoseEntry({ userId });

      (encryptionService.encryptGlucoseValue as jest.Mock).mockReturnValue(encryptedValue);
      (prismaService.glucoseEntry.create as jest.Mock).mockResolvedValue(mockEntry);

      const beforeCreate = new Date();
      await service.create(userId, createDto);
      const afterCreate = new Date();

      const createCall = (prismaService.glucoseEntry.create as jest.Mock).mock.calls[0][0];
      const recordedAt = createCall.data.recordedAt;

      expect(recordedAt).toBeInstanceOf(Date);
      expect(recordedAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(recordedAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    });

    it("should handle entry without note", async () => {
      const encryptedValue = "encrypted-glucose-value";
      const mockEntry = createMockGlucoseEntry({
        userId,
        note: null,
      });

      (encryptionService.encryptGlucoseValue as jest.Mock).mockReturnValue(encryptedValue);
      (prismaService.glucoseEntry.create as jest.Mock).mockResolvedValue(mockEntry);

      await service.create(userId, {
        mgdl: 120,
      });

      expect(prismaService.glucoseEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          note: undefined,
        }),
      });
    });
  });
});
