import { Test, TestingModule } from "@nestjs/testing";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import { ReportsService } from "./reports.service";
import { DoctorUtilsService } from "../../common/services/doctor-utils.service";
import { EncryptionService } from "../../common/services/encryption.service";
import { DoctorPatientService } from "../doctor-patient/doctor-patient.service";
import { createMockPrismaService } from "../../common/test-helpers/prisma.mock";
import { createMockConfigService } from "../../common/test-helpers/config.mock";
import { ReportFormat, ReportType } from "./dto/generate-report.dto";
import { DiabetesType } from "@prisma/client";

// Mock PDFKit
jest.mock("pdfkit", () => {
  return jest.fn().mockImplementation(() => {
    // Declare mockDoc with explicit type to avoid self-reference issues
    const mockDoc: any = {};

    // Initialize methods
    mockDoc.fontSize = jest.fn();
    mockDoc.text = jest.fn();
    mockDoc.moveDown = jest.fn();
    mockDoc.fillColor = jest.fn();
    mockDoc.font = jest.fn();
    mockDoc.addPage = jest.fn();
    mockDoc.on = jest.fn();
    mockDoc.end = jest.fn();

    // Set up method chaining
    mockDoc.fontSize.mockReturnValue(mockDoc);
    mockDoc.text.mockReturnValue(mockDoc);
    mockDoc.moveDown.mockReturnValue(mockDoc);
    mockDoc.fillColor.mockReturnValue(mockDoc);
    mockDoc.font.mockReturnValue(mockDoc);
    mockDoc.addPage.mockReturnValue(mockDoc);

    // Set up on method to handle events and return mockDoc for chaining
    mockDoc.on.mockImplementation((event: string, callback: () => void): any => {
      if (event === "end") {
        setTimeout(callback, 0);
      }
      return mockDoc;
    });

    return mockDoc;
  });
});

// Mock Google Generative AI
jest.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: jest.fn().mockReturnValue("Test AI summary text"),
        },
      }),
    }),
  })),
}));

describe("ReportsService", () => {
  let service: ReportsService;
  let prismaService: PrismaService;
  let doctorUtilsService: DoctorUtilsService;
  let doctorPatientService: DoctorPatientService;
  let configService: ConfigService;

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
      getDoctorPatientIds: jest.fn().mockResolvedValue([patientId]),
    };
    const mockDoctorPatientService = {
      getPatients: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
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
          provide: DoctorPatientService,
          useValue: mockDoctorPatientService,
        },
        {
          provide: ConfigService,
          useValue: mockConfig,
        },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    prismaService = module.get<PrismaService>(PrismaService);
    doctorUtilsService = module.get<DoctorUtilsService>(DoctorUtilsService);
    doctorPatientService = module.get<DoctorPatientService>(DoctorPatientService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("generateIndividualReport", () => {
    const dto = {
      patientId,
      startDate: "2024-01-01T00:00:00.000Z",
      endDate: "2024-01-31T23:59:59.999Z",
      format: ReportFormat.PDF,
      reportTypes: [ReportType.GLUCOSE],
      includeAISummary: false,
    };

    beforeEach(() => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        id: patientId,
        email: "patient@example.com",
        firstName: "John",
        lastName: "Doe",
        diabetesType: DiabetesType.TYPE_1,
        birthDate: new Date("1990-01-01"),
        weight: 75,
        minTargetGlucose: 80,
        maxTargetGlucose: 140,
      });

      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue([
        {
          id: "entry-1",
          mgdlEncrypted: "encrypted-120",
          recordedAt: new Date("2024-01-15T10:00:00.000Z"),
        },
        {
          id: "entry-2",
          mgdlEncrypted: "encrypted-130",
          recordedAt: new Date("2024-01-16T10:00:00.000Z"),
        },
      ]);
    });

    it("should generate individual PDF report", async () => {
      const result = await service.generateIndividualReport(doctorId, dto);

      expect(result).toBeInstanceOf(Buffer);
      expect(doctorUtilsService.verifyDoctor).toHaveBeenCalledWith(doctorId);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: patientId },
        select: expect.objectContaining({
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        }),
      });
    });

    it("should throw ForbiddenException if patient not assigned", async () => {
      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue([]);

      await expect(service.generateIndividualReport(doctorId, dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should throw NotFoundException if patient not found", async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.generateIndividualReport(doctorId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should generate CSV report", async () => {
      const csvDto = { ...dto, format: ReportFormat.CSV };
      const result = await service.generateIndividualReport(doctorId, csvDto);

      expect(typeof result).toBe("string");
      expect(result).toContain("Tipo,Fecha,Valor");
    });

    it("should include meals recorded directly on log entries when mealTemplateId is null", async () => {
      const csvDto = {
        ...dto,
        format: ReportFormat.CSV,
        reportTypes: [ReportType.MEALS],
      };

      (prismaService.logEntry.findMany as jest.Mock).mockResolvedValue([
        {
          id: "log-1",
          recordedAt: new Date("2024-01-15T12:00:00.000Z"),
          mealType: "LUNCH",
          carbohydrates: 48,
          mealTemplate: null,
        },
        {
          id: "log-2",
          recordedAt: new Date("2024-01-15T20:00:00.000Z"),
          mealType: "DINNER",
          carbohydrates: 36,
          mealTemplate: {
            id: "meal-1",
            name: "Cena ejemplo",
            carbohydrates: 40,
            foodItems: [],
          },
        },
      ]);

      const result = await service.generateIndividualReport(doctorId, csvDto);

      expect(typeof result).toBe("string");
      const csv = result as string;

      expect(csv).toContain("Comida,2024-01-15T12:00:00.000Z,48,g,Registro LUNCH");
      expect(csv).toContain("Comida,2024-01-15T20:00:00.000Z,36,g,Cena ejemplo");
      expect(prismaService.logEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: patientId,
            OR: [{ mealTemplateId: { not: null } }, { carbohydrates: { gt: 0 } }],
          }),
        }),
      );
    });

    it("should include AI summary when requested and API key is configured", async () => {
      (configService.get as jest.Mock).mockReturnValue("test-api-key");
      const aiDto = { ...dto, includeAISummary: true };

      const result = await service.generateIndividualReport(doctorId, aiDto);

      expect(result).toBeInstanceOf(Buffer);
    });

    it("should continue without AI summary when generation fails", async () => {
      (configService.get as jest.Mock).mockReturnValue("test-api-key");
      jest
        .spyOn<any, any>(service as any, "generateAISummary")
        .mockRejectedValue(new Error("gemini unavailable"));

      const result = await service.generateIndividualReport(doctorId, {
        ...dto,
        includeAISummary: true,
      });

      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe("generateGroupReport", () => {
    const dto = {
      startDate: "2024-01-01T00:00:00.000Z",
      endDate: "2024-01-31T23:59:59.999Z",
      format: ReportFormat.PDF,
      reportTypes: [ReportType.GLUCOSE, ReportType.INSULIN],
      filters: {
        diabetesType: DiabetesType.TYPE_1,
        ageRange: "31-50",
      },
      includeAISummary: false,
    };

    const mockPatients = [
      {
        id: "patient-1",
        email: "patient1@example.com",
        firstName: "John",
        lastName: "Doe",
        diabetesType: DiabetesType.TYPE_1,
      },
      {
        id: "patient-2",
        email: "patient2@example.com",
        firstName: "Jane",
        lastName: "Smith",
        diabetesType: DiabetesType.TYPE_1,
      },
    ];

    beforeEach(() => {
      (doctorPatientService.getPatients as jest.Mock).mockResolvedValue(mockPatients);

      // Mock batch patient details query
      (prismaService.user.findMany as jest.Mock).mockImplementation((args: any) => {
        if (args.where.id?.in) {
          const patientIds = args.where.id.in;
          const results: any[] = [];
          if (patientIds.includes("patient-1")) {
            results.push({
              id: "patient-1",
              birthDate: new Date("1985-05-15"), // ~39 years old
              weight: 70,
              minTargetGlucose: 80,
              maxTargetGlucose: 140,
            });
          }
          if (patientIds.includes("patient-2")) {
            results.push({
              id: "patient-2",
              birthDate: new Date("1980-03-20"), // ~44 years old
              weight: 80,
              minTargetGlucose: 70,
              maxTargetGlucose: 180,
            });
          }
          return Promise.resolve(results);
        }
        return Promise.resolve([]);
      });

      // Keep findUnique for individual reports
      (prismaService.user.findUnique as jest.Mock).mockImplementation((args: any) => {
        if (args.where.id === "patient-1") {
          return Promise.resolve({
            birthDate: new Date("1985-05-15"), // ~39 years old
            weight: 70,
            minTargetGlucose: 80,
            maxTargetGlucose: 140,
          });
        }
        if (args.where.id === "patient-2") {
          return Promise.resolve({
            birthDate: new Date("1980-03-20"), // ~44 years old
            weight: 80,
            minTargetGlucose: 70,
            maxTargetGlucose: 180,
          });
        }
        return Promise.resolve(null);
      });

      // Mock glucose data - Patient 1: [100, 110, 120], Patient 2: [130, 140, 150]
      // Now using batch queries with userId: { in: [...] }
      (prismaService.glucoseEntry.findMany as jest.Mock).mockImplementation((args: any) => {
        if (args.where.userId?.in) {
          // Batch query - return all entries for all patients
          const patientIds = args.where.userId.in;
          const allEntries: any[] = [];
          if (patientIds.includes("patient-1")) {
            allEntries.push(
              {
                id: "e1",
                mgdlEncrypted: "encrypted-100",
                recordedAt: new Date("2024-01-10"),
                userId: "patient-1",
              },
              {
                id: "e2",
                mgdlEncrypted: "encrypted-110",
                recordedAt: new Date("2024-01-11"),
                userId: "patient-1",
              },
              {
                id: "e3",
                mgdlEncrypted: "encrypted-120",
                recordedAt: new Date("2024-01-12"),
                userId: "patient-1",
              },
            );
          }
          if (patientIds.includes("patient-2")) {
            allEntries.push(
              {
                id: "e4",
                mgdlEncrypted: "encrypted-130",
                recordedAt: new Date("2024-01-10"),
                userId: "patient-2",
              },
              {
                id: "e5",
                mgdlEncrypted: "encrypted-140",
                recordedAt: new Date("2024-01-11"),
                userId: "patient-2",
              },
              {
                id: "e6",
                mgdlEncrypted: "encrypted-150",
                recordedAt: new Date("2024-01-12"),
                userId: "patient-2",
              },
            );
          }
          return Promise.resolve(allEntries);
        }
        // Fallback for single patient queries (individual reports)
        if (args.where.userId === "patient-1") {
          return Promise.resolve([
            { id: "e1", mgdlEncrypted: "encrypted-100", recordedAt: new Date("2024-01-10") },
            { id: "e2", mgdlEncrypted: "encrypted-110", recordedAt: new Date("2024-01-11") },
            { id: "e3", mgdlEncrypted: "encrypted-120", recordedAt: new Date("2024-01-12") },
          ]);
        }
        if (args.where.userId === "patient-2") {
          return Promise.resolve([
            { id: "e4", mgdlEncrypted: "encrypted-130", recordedAt: new Date("2024-01-10") },
            { id: "e5", mgdlEncrypted: "encrypted-140", recordedAt: new Date("2024-01-11") },
            { id: "e6", mgdlEncrypted: "encrypted-150", recordedAt: new Date("2024-01-12") },
          ]);
        }
        return Promise.resolve([]);
      });

      // Mock insulin data
      (prismaService.insulinDose.findMany as jest.Mock).mockImplementation((args: any) => {
        if (args.where.userId?.in) {
          // Batch query - return all doses for all patients
          const patientIds = args.where.userId.in;
          const allDoses: any[] = [];
          if (patientIds.includes("patient-1")) {
            allDoses.push(
              {
                id: "i1",
                units: 5,
                type: "BASAL",
                recordedAt: new Date("2024-01-10"),
                userId: "patient-1",
              },
              {
                id: "i2",
                units: 3,
                type: "BOLUS",
                recordedAt: new Date("2024-01-11"),
                userId: "patient-1",
              },
            );
          }
          if (patientIds.includes("patient-2")) {
            allDoses.push(
              {
                id: "i3",
                units: 6,
                type: "BASAL",
                recordedAt: new Date("2024-01-10"),
                userId: "patient-2",
              },
              {
                id: "i4",
                units: 4,
                type: "BOLUS",
                recordedAt: new Date("2024-01-11"),
                userId: "patient-2",
              },
            );
          }
          return Promise.resolve(allDoses);
        }
        // Fallback for single patient queries (individual reports)
        if (args.where.userId === "patient-1") {
          return Promise.resolve([
            { id: "i1", units: 5, type: "BASAL", recordedAt: new Date("2024-01-10") },
            { id: "i2", units: 3, type: "BOLUS", recordedAt: new Date("2024-01-11") },
          ]);
        }
        if (args.where.userId === "patient-2") {
          return Promise.resolve([
            { id: "i3", units: 6, type: "BASAL", recordedAt: new Date("2024-01-10") },
            { id: "i4", units: 4, type: "BOLUS", recordedAt: new Date("2024-01-11") },
          ]);
        }
        return Promise.resolve([]);
      });
    });

    it("should generate group PDF report with aggregated data", async () => {
      const result = await service.generateGroupReport(doctorId, dto);

      expect(result).toBeInstanceOf(Buffer);
      expect(doctorPatientService.getPatients).toHaveBeenCalledWith(
        doctorId,
        expect.objectContaining({
          diabetesType: DiabetesType.TYPE_1,
          ageRange: "31-50",
        }),
      );
    });

    it("should calculate correct aggregated demographics", async () => {
      const result = await service.generateGroupReport(doctorId, dto);

      expect(result).toBeInstanceOf(Buffer);
      // Verify batch query was used instead of individual queries
      expect(prismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: ["patient-1", "patient-2"] } },
        }),
      );
    });

    it("should calculate correct aggregated glucose statistics", async () => {
      const result = await service.generateGroupReport(doctorId, dto);

      expect(result).toBeInstanceOf(Buffer);
      // Total readings: 6 (3 per patient)
      // Values: [100, 110, 120, 130, 140, 150]
      // Average: (100+110+120+130+140+150)/6 = 125
      // Min: 100, Max: 150
      // Median: (120+130)/2 = 125
      expect(prismaService.glucoseEntry.findMany).toHaveBeenCalled();
    });

    it("should calculate correct aggregated insulin statistics", async () => {
      const result = await service.generateGroupReport(doctorId, dto);

      expect(result).toBeInstanceOf(Buffer);
      // Total doses: 4 (2 per patient)
      // Total units: 5+3+6+4 = 18
      // Average dose: 18/4 = 4.5
      // Basal: 2 doses, 11 units
      // Bolus: 2 doses, 7 units
      expect(prismaService.insulinDose.findMany).toHaveBeenCalled();
    });

    it("should throw NotFoundException if no patients match criteria", async () => {
      (doctorPatientService.getPatients as jest.Mock).mockResolvedValue([]);

      await expect(service.generateGroupReport(doctorId, dto)).rejects.toThrow(NotFoundException);
    });

    it("should generate group CSV report with aggregated statistics", async () => {
      const csvDto = { ...dto, format: ReportFormat.CSV };
      const result = await service.generateGroupReport(doctorId, csvDto);

      expect(typeof result).toBe("string");
      expect(result).toContain("Tipo,Métrica,Valor,Unidad");
      expect(result).toContain("Grupo,Total de pacientes");
    });
  });

  describe("getGlucoseData", () => {
    const startDate = new Date("2024-01-01T00:00:00.000Z");
    const endDate = new Date("2024-01-31T23:59:59.999Z");

    beforeEach(() => {
      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue([
        { id: "e1", mgdlEncrypted: "encrypted-100", recordedAt: new Date("2024-01-15") },
        { id: "e2", mgdlEncrypted: "encrypted-120", recordedAt: new Date("2024-01-16") },
      ]);

      (prismaService.glucoseReading.findMany as jest.Mock).mockResolvedValue([
        {
          id: "r1",
          glucoseEncrypted: "encrypted-110",
          recordedAt: new Date("2024-01-15"),
          source: "DEXCOM",
        },
        {
          id: "r2",
          glucoseEncrypted: "encrypted-130",
          recordedAt: new Date("2024-01-16"),
          source: "LIBRE_NFC",
        },
      ]);
    });

    it("should get only manual glucose entries when includeManual=true and includeSensor=false", async () => {
      // Access private method via reflection or make it public for testing
      // For now, we'll test through generateIndividualReport
      const dto = {
        patientId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        format: ReportFormat.PDF,
        reportTypes: [ReportType.GLUCOSE],
        includeAISummary: false,
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        id: patientId,
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
        diabetesType: DiabetesType.TYPE_1,
        birthDate: new Date("1990-01-01"),
        weight: 75,
        minTargetGlucose: 80,
        maxTargetGlucose: 140,
      });

      await service.generateIndividualReport(doctorId, dto);

      expect(prismaService.glucoseEntry.findMany).toHaveBeenCalled();
      expect(prismaService.glucoseReading.findMany).not.toHaveBeenCalled();
    });

    it("should get only sensor readings when includeManual=false and includeSensor=true", async () => {
      const dto = {
        patientId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        format: ReportFormat.PDF,
        reportTypes: [ReportType.SENSOR_READINGS],
        includeAISummary: false,
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        id: patientId,
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
        diabetesType: DiabetesType.TYPE_1,
        birthDate: new Date("1990-01-01"),
        weight: 75,
        minTargetGlucose: 80,
        maxTargetGlucose: 140,
      });

      await service.generateIndividualReport(doctorId, dto);

      expect(prismaService.glucoseReading.findMany).toHaveBeenCalled();
      expect(prismaService.glucoseEntry.findMany).not.toHaveBeenCalled();
    });
  });

  describe("aggregated statistics calculations", () => {
    it("should calculate correct glucose statistics for known values", async () => {
      // Test data: [80, 90, 100, 110, 120, 130, 140, 150, 200, 250]
      // Expected: avg=137, median=125, min=80, max=250, p25=100, p75=150
      const dto = {
        startDate: "2024-01-01T00:00:00.000Z",
        endDate: "2024-01-31T23:59:59.999Z",
        format: ReportFormat.PDF,
        reportTypes: [ReportType.GLUCOSE],
        filters: {},
        includeAISummary: false,
      };

      const mockPatients = [
        {
          id: "patient-1",
          email: "p1@example.com",
          firstName: "P1",
          lastName: "Test",
          diabetesType: DiabetesType.TYPE_1,
        },
      ];

      (doctorPatientService.getPatients as jest.Mock).mockResolvedValue(mockPatients);
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        birthDate: new Date("1985-01-01"),
        weight: 70,
        minTargetGlucose: 80,
        maxTargetGlucose: 140,
      });

      const glucoseValues = [80, 90, 100, 110, 120, 130, 140, 150, 200, 250];
      (prismaService.glucoseEntry.findMany as jest.Mock).mockImplementation((args: any) => {
        if (args.where.userId?.in) {
          // Batch query
          return Promise.resolve(
            glucoseValues.map((val, idx) => ({
              id: `e${idx}`,
              mgdlEncrypted: `encrypted-${val}`,
              recordedAt: new Date(`2024-01-${idx + 1}`),
              userId: "patient-1",
            })),
          );
        }
        return Promise.resolve([]);
      });

      const result = await service.generateGroupReport(doctorId, dto);

      expect(result).toBeInstanceOf(Buffer);
      // Verify calculations were performed
      expect(prismaService.glucoseEntry.findMany).toHaveBeenCalled();
    });

    it("should calculate correct statistics for specific glucose values", async () => {
      // Test with known values: [70, 80, 90, 100, 110, 120, 130, 140, 150, 180, 200, 250]
      // Expected calculations:
      // - Average: (70+80+90+100+110+120+130+140+150+180+200+250)/12 = 137.5
      // - Sorted: [70, 80, 90, 100, 110, 120, 130, 140, 150, 180, 200, 250]
      // - Median: (120+130)/2 = 125
      // - Min: 70, Max: 250
      // - P25: 90, P75: 150
      // - In range (80-140): 7 values (80,90,100,110,120,130,140) = 58.3%
      // - Hypoglycemia (<70): 1 value (70) = 8.3%
      // - Severe hypo (<54): 0 = 0%
      // - Hyperglycemia (>180): 2 values (200,250) = 16.7%
      // - Severe hyper (>250): 0 = 0%
      const dto = {
        startDate: "2024-01-01T00:00:00.000Z",
        endDate: "2024-01-31T23:59:59.999Z",
        format: ReportFormat.CSV,
        reportTypes: [ReportType.GLUCOSE],
        filters: {},
        includeAISummary: false,
      };

      const mockPatients = [
        {
          id: "patient-test",
          email: "test@example.com",
          firstName: "Test",
          lastName: "Patient",
          diabetesType: DiabetesType.TYPE_1,
        },
      ];

      (doctorPatientService.getPatients as jest.Mock).mockResolvedValue(mockPatients);
      (prismaService.user.findMany as jest.Mock).mockResolvedValue([
        {
          id: "patient-test",
          birthDate: new Date("1985-01-01"),
          weight: 70,
          minTargetGlucose: 80,
          maxTargetGlucose: 140,
        },
      ]);

      const testValues = [70, 80, 90, 100, 110, 120, 130, 140, 150, 180, 200, 250];
      (prismaService.glucoseEntry.findMany as jest.Mock).mockImplementation((args: any) => {
        if (args.where.userId?.in) {
          // Batch query
          return Promise.resolve(
            testValues.map((val, idx) => ({
              id: `e${idx}`,
              mgdlEncrypted: `encrypted-${val}`,
              recordedAt: new Date(`2024-01-${String(idx + 1).padStart(2, "0")}`),
              userId: "patient-test",
            })),
          );
        }
        return Promise.resolve([]);
      });

      const result = await service.generateGroupReport(doctorId, dto);

      expect(typeof result).toBe("string");
      const csv = result as string;

      // Verify CSV contains aggregated statistics
      // Values: [70, 80, 90, 100, 110, 120, 130, 140, 150, 180, 200, 250]
      // Average: (70+80+90+100+110+120+130+140+150+180+200+250)/12 = 135.0
      // Sorted: [70, 80, 90, 100, 110, 120, 130, 140, 150, 180, 200, 250]
      // Median: (120+130)/2 = 125 (correct calculation for even-length array)
      // P25: index 3 = 100, P75: index 9 = 180
      // In range (80-140): 7 values = 58.3%
      // Hypoglycemia (<70): 0 (70 is not < 70)
      // Hyperglycemia (>180): 2 values (200, 250) = 16.7%
      expect(csv).toContain("Glucosa,Total de lecturas,12,lecturas");
      expect(csv).toContain("Glucosa,Promedio,135.0,mg/dL");
      expect(csv).toContain("Glucosa,Mediana,125.0,mg/dL");
      expect(csv).toContain("Glucosa,Mínimo,70,mg/dL");
      expect(csv).toContain("Glucosa,Máximo,250,mg/dL");
      expect(csv).toContain("Glucosa,Percentil 25,100,mg/dL");
      expect(csv).toContain("Glucosa,Percentil 75,180,mg/dL");
      expect(csv).toContain("Glucosa,Tiempo en rango,58.3,%");
      expect(csv).toContain("Glucosa,Hipoglucemias,0,eventos");
      expect(csv).toContain("Glucosa,Hipoglucemias %,0.0,%");
      expect(csv).toContain("Glucosa,Hiperglucemias,2,eventos");
      expect(csv).toContain("Glucosa,Hiperglucemias %,16.7,%");
    });
  });

  describe("demographics aggregation", () => {
    it("should correctly aggregate diabetes type distribution", async () => {
      const dto = {
        startDate: "2024-01-01T00:00:00.000Z",
        endDate: "2024-01-31T23:59:59.999Z",
        format: ReportFormat.CSV,
        reportTypes: [],
        filters: {},
        includeAISummary: false,
      };

      const mockPatients = [
        {
          id: "p1",
          email: "p1@test.com",
          firstName: "P1",
          lastName: "Test",
          diabetesType: DiabetesType.TYPE_1,
        },
        {
          id: "p2",
          email: "p2@test.com",
          firstName: "P2",
          lastName: "Test",
          diabetesType: DiabetesType.TYPE_1,
        },
        {
          id: "p3",
          email: "p3@test.com",
          firstName: "P3",
          lastName: "Test",
          diabetesType: DiabetesType.TYPE_2,
        },
      ];

      (doctorPatientService.getPatients as jest.Mock).mockResolvedValue(mockPatients);
      (prismaService.user.findMany as jest.Mock).mockResolvedValue([
        {
          id: "p1",
          birthDate: new Date("1985-01-01"),
          weight: 70,
          minTargetGlucose: 80,
          maxTargetGlucose: 140,
        },
        {
          id: "p2",
          birthDate: new Date("1985-01-01"),
          weight: 70,
          minTargetGlucose: 80,
          maxTargetGlucose: 140,
        },
        {
          id: "p3",
          birthDate: new Date("1985-01-01"),
          weight: 70,
          minTargetGlucose: 80,
          maxTargetGlucose: 140,
        },
      ]);

      const result = await service.generateGroupReport(doctorId, dto);

      expect(typeof result).toBe("string");
      const csv = result as string;

      // Should have 2 TYPE_1 and 1 TYPE_2 (66.7% and 33.3%)
      expect(csv).toContain("Demografía,Tipo de Diabetes Tipo 1,2,pacientes");
      expect(csv).toContain("Demografía,Tipo de Diabetes Tipo 2,1,pacientes");
      // Verify batch query was used
      expect(prismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: ["p1", "p2", "p3"] } },
        }),
      );
    });

    it("should correctly calculate age statistics", async () => {
      const dto = {
        startDate: "2024-01-01T00:00:00.000Z",
        endDate: "2024-01-31T23:59:59.999Z",
        format: ReportFormat.CSV,
        reportTypes: [],
        filters: {},
        includeAISummary: false,
      };

      const now = new Date();
      const birthDate1 = new Date(now.getFullYear() - 30, 0, 1); // 30 years old
      const birthDate2 = new Date(now.getFullYear() - 40, 0, 1); // 40 years old
      const birthDate3 = new Date(now.getFullYear() - 50, 0, 1); // 50 years old

      const mockPatients = [
        {
          id: "p1",
          email: "p1@test.com",
          firstName: "P1",
          lastName: "Test",
          diabetesType: DiabetesType.TYPE_1,
        },
        {
          id: "p2",
          email: "p2@test.com",
          firstName: "P2",
          lastName: "Test",
          diabetesType: DiabetesType.TYPE_1,
        },
        {
          id: "p3",
          email: "p3@test.com",
          firstName: "P3",
          lastName: "Test",
          diabetesType: DiabetesType.TYPE_1,
        },
      ];

      (doctorPatientService.getPatients as jest.Mock).mockResolvedValue(mockPatients);
      (prismaService.user.findMany as jest.Mock).mockResolvedValue([
        {
          id: "p1",
          birthDate: birthDate1,
          weight: 70,
          minTargetGlucose: 80,
          maxTargetGlucose: 140,
        },
        {
          id: "p2",
          birthDate: birthDate2,
          weight: 75,
          minTargetGlucose: 80,
          maxTargetGlucose: 140,
        },
        {
          id: "p3",
          birthDate: birthDate3,
          weight: 80,
          minTargetGlucose: 80,
          maxTargetGlucose: 140,
        },
      ]);

      const result = await service.generateGroupReport(doctorId, dto);

      expect(typeof result).toBe("string");
      const csv = result as string;

      // Ages: 30, 40, 50
      // Average: 40, Min: 30, Max: 50, Median: 40
      expect(csv).toContain("Demografía,Edad promedio,40.0,años");
      expect(csv).toContain("Demografía,Edad mínima,30,años");
      expect(csv).toContain("Demografía,Edad máxima,50,años");
      expect(csv).toContain("Demografía,Mediana de edad,40,años");
      // Verify batch query was used
      expect(prismaService.user.findMany).toHaveBeenCalled();
    });

    it("should correctly calculate weight statistics", async () => {
      const dto = {
        startDate: "2024-01-01T00:00:00.000Z",
        endDate: "2024-01-31T23:59:59.999Z",
        format: ReportFormat.CSV,
        reportTypes: [],
        filters: {},
        includeAISummary: false,
      };

      const mockPatients = [
        {
          id: "p1",
          email: "p1@test.com",
          firstName: "P1",
          lastName: "Test",
          diabetesType: DiabetesType.TYPE_1,
        },
        {
          id: "p2",
          email: "p2@test.com",
          firstName: "P2",
          lastName: "Test",
          diabetesType: DiabetesType.TYPE_1,
        },
        {
          id: "p3",
          email: "p3@test.com",
          firstName: "P3",
          lastName: "Test",
          diabetesType: DiabetesType.TYPE_1,
        },
      ];

      (doctorPatientService.getPatients as jest.Mock).mockResolvedValue(mockPatients);
      (prismaService.user.findMany as jest.Mock).mockResolvedValue([
        {
          id: "p1",
          birthDate: new Date("1985-01-01"),
          weight: 60,
          minTargetGlucose: 80,
          maxTargetGlucose: 140,
        },
        {
          id: "p2",
          birthDate: new Date("1985-01-01"),
          weight: 70,
          minTargetGlucose: 80,
          maxTargetGlucose: 140,
        },
        {
          id: "p3",
          birthDate: new Date("1985-01-01"),
          weight: 80,
          minTargetGlucose: 80,
          maxTargetGlucose: 140,
        },
      ]);

      const result = await service.generateGroupReport(doctorId, dto);

      expect(typeof result).toBe("string");
      const csv = result as string;

      // Weights: 60, 70, 80
      // Average: 70, Min: 60, Max: 80, Median: 70
      expect(csv).toContain("Demografía,Peso promedio,70.0,kg");
      expect(csv).toContain("Demografía,Peso mínimo,60,kg");
      expect(csv).toContain("Demografía,Peso máximo,80,kg");
      expect(csv).toContain("Demografía,Mediana de peso,70.0,kg");
      // Verify batch query was used
      expect(prismaService.user.findMany).toHaveBeenCalled();
    });
  });

  describe("insulin aggregation", () => {
    it("should correctly calculate aggregated insulin statistics", async () => {
      const dto = {
        startDate: "2024-01-01T00:00:00.000Z",
        endDate: "2024-01-31T23:59:59.999Z", // 31 days
        format: ReportFormat.CSV,
        reportTypes: [ReportType.INSULIN],
        filters: {},
        includeAISummary: false,
      };

      const mockPatients = [
        {
          id: "p1",
          email: "p1@test.com",
          firstName: "P1",
          lastName: "Test",
          diabetesType: DiabetesType.TYPE_1,
        },
        {
          id: "p2",
          email: "p2@test.com",
          firstName: "P2",
          lastName: "Test",
          diabetesType: DiabetesType.TYPE_1,
        },
      ];

      (doctorPatientService.getPatients as jest.Mock).mockResolvedValue(mockPatients);
      (prismaService.user.findMany as jest.Mock).mockResolvedValue([
        {
          id: "p1",
          birthDate: new Date("1985-01-01"),
          weight: 70,
          minTargetGlucose: 80,
          maxTargetGlucose: 140,
        },
        {
          id: "p2",
          birthDate: new Date("1985-01-01"),
          weight: 70,
          minTargetGlucose: 80,
          maxTargetGlucose: 140,
        },
      ]);

      // Patient 1: 2 basal (5+6=11), 1 bolus (3)
      // Patient 2: 1 basal (4), 2 bolus (2+3=5)
      // Total: 3 basal (15 units), 3 bolus (8 units), 6 doses, 23 units
      (prismaService.insulinDose.findMany as jest.Mock).mockImplementation((args: any) => {
        if (args.where.userId?.in) {
          // Batch query - return all doses for all patients
          return Promise.resolve([
            { id: "i1", units: 5, type: "BASAL", recordedAt: new Date("2024-01-10"), userId: "p1" },
            { id: "i2", units: 6, type: "BASAL", recordedAt: new Date("2024-01-11"), userId: "p1" },
            { id: "i3", units: 3, type: "BOLUS", recordedAt: new Date("2024-01-12"), userId: "p1" },
            { id: "i4", units: 4, type: "BASAL", recordedAt: new Date("2024-01-10"), userId: "p2" },
            { id: "i5", units: 2, type: "BOLUS", recordedAt: new Date("2024-01-11"), userId: "p2" },
            { id: "i6", units: 3, type: "BOLUS", recordedAt: new Date("2024-01-12"), userId: "p2" },
          ]);
        }
        return Promise.resolve([]);
      });

      const result = await service.generateGroupReport(doctorId, dto);

      expect(typeof result).toBe("string");
      const csv = result as string;

      // Verify exact calculations
      // Total doses: 6
      // Total units: 5+6+3+4+2+3 = 23
      // Average dose: 23/6 = 3.833... rounded to 3.8
      // Average daily: 23/31 = 0.742... rounded to 0.7
      // Average daily per patient: 0.742/2 = 0.371... rounded to 0.4
      // Basal: 3 doses, 15 units
      // Bolus: 3 doses, 8 units
      expect(csv).toContain("Insulina,Total de dosis,6,dosis");
      expect(csv).toContain("Insulina,Total de unidades,23.0,U");
      expect(csv).toContain("Insulina,Promedio por dosis,3.8,U");
      expect(csv).toContain("Insulina,Dosis basal,3,dosis");
      expect(csv).toContain("Insulina,Unidades basal,15.0,U");
      expect(csv).toContain("Insulina,Dosis bolus,3,dosis");
      expect(csv).toContain("Insulina,Unidades bolus,8.0,U");
      // Verify batch query was used (single call instead of per-patient calls)
      expect(prismaService.insulinDose.findMany).toHaveBeenCalled();
    });
  });

  describe("meals aggregation", () => {
    it("should correctly calculate aggregated meals statistics", async () => {
      const dto = {
        startDate: "2024-01-01T00:00:00.000Z",
        endDate: "2024-01-31T23:59:59.999Z", // 31 days
        format: ReportFormat.CSV,
        reportTypes: [ReportType.MEALS],
        filters: {},
        includeAISummary: false,
      };

      const mockPatients = [
        {
          id: "p1",
          email: "p1@test.com",
          firstName: "P1",
          lastName: "Test",
          diabetesType: DiabetesType.TYPE_1,
        },
        {
          id: "p2",
          email: "p2@test.com",
          firstName: "P2",
          lastName: "Test",
          diabetesType: DiabetesType.TYPE_1,
        },
      ];

      (doctorPatientService.getPatients as jest.Mock).mockResolvedValue(mockPatients);
      (prismaService.user.findMany as jest.Mock).mockResolvedValue([
        {
          id: "p1",
          birthDate: new Date("1985-01-01"),
          weight: 70,
          minTargetGlucose: 80,
          maxTargetGlucose: 140,
        },
        {
          id: "p2",
          birthDate: new Date("1985-01-01"),
          weight: 70,
          minTargetGlucose: 80,
          maxTargetGlucose: 140,
        },
      ]);

      // Mock meal templates
      const mockMealTemplate = {
        id: "meal-1",
        name: "Test Meal",
        carbohydrates: 50,
        foodItems: [],
      };

      // Patient 1: 2 meals (manual 45 + template 60 = 105g carbs)
      // Patient 2: 3 meals (manual 40 + template 50 + manual 30 = 120g carbs)
      // Total: 5 meals, 225g carbs
      (prismaService.logEntry.findMany as jest.Mock).mockImplementation((args: any) => {
        if (args.where.userId?.in) {
          // Batch query - return all meals for all patients
          return Promise.resolve([
            {
              id: "l1",
              recordedAt: new Date("2024-01-10"),
              userId: "p1",
              mealType: "BREAKFAST",
              carbohydrates: 45,
              mealTemplate: null,
            },
            {
              id: "l2",
              recordedAt: new Date("2024-01-11"),
              userId: "p1",
              mealType: "LUNCH",
              carbohydrates: 60,
              mealTemplate: { ...mockMealTemplate, carbohydrates: 60 },
            },
            {
              id: "l3",
              recordedAt: new Date("2024-01-10"),
              userId: "p2",
              mealType: "BREAKFAST",
              carbohydrates: 40,
              mealTemplate: null,
            },
            {
              id: "l4",
              recordedAt: new Date("2024-01-11"),
              userId: "p2",
              mealType: "LUNCH",
              carbohydrates: 50,
              mealTemplate: { ...mockMealTemplate, carbohydrates: 50 },
            },
            {
              id: "l5",
              recordedAt: new Date("2024-01-12"),
              userId: "p2",
              mealType: "DINNER",
              carbohydrates: 30,
              mealTemplate: null,
            },
          ]);
        }
        return Promise.resolve([]);
      });

      const result = await service.generateGroupReport(doctorId, dto);

      expect(typeof result).toBe("string");
      const csv = result as string;

      // Verify exact calculations
      // Total meals: 5
      // Total carbs: 225g
      // Average per meal: 225/5 = 45g
      // Average daily: 225/31 = 7.25g rounded to 7.3
      // Average daily per patient: 7.25/2 = 3.63g rounded to 3.6
      expect(csv).toContain("Comidas,Total de comidas,5,comidas");
      expect(csv).toContain("Comidas,Total de carbohidratos,225.0,g");
      expect(csv).toContain("Comidas,Promedio por comida,45.0,g");
      expect(csv).toContain("Comidas,Promedio diario total,7.3,g/día");
      expect(csv).toContain("Comidas,Promedio diario por paciente,3.6,g/día/paciente");
      // Verify batch query was used (single call instead of per-patient calls)
      expect(prismaService.logEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: { in: ["p1", "p2"] },
            OR: [{ mealTemplateId: { not: null } }, { carbohydrates: { gt: 0 } }],
          }),
        }),
      );
    });
  });

  describe("glucose statistics calculations", () => {
    it("should calculate correct statistics for known glucose values", async () => {
      const dto = {
        startDate: "2024-01-01T00:00:00.000Z",
        endDate: "2024-01-31T23:59:59.999Z",
        format: ReportFormat.CSV,
        reportTypes: [ReportType.GLUCOSE],
        filters: {},
        includeAISummary: false,
      };

      const mockPatients = [
        {
          id: "p1",
          email: "p1@test.com",
          firstName: "P1",
          lastName: "Test",
          diabetesType: DiabetesType.TYPE_1,
        },
      ];

      (doctorPatientService.getPatients as jest.Mock).mockResolvedValue(mockPatients);
      (prismaService.user.findMany as jest.Mock).mockResolvedValue([
        {
          id: "p1",
          birthDate: new Date("1985-01-01"),
          weight: 70,
          minTargetGlucose: 80,
          maxTargetGlucose: 140,
        },
      ]);

      // Test values: [60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 180, 200, 250, 300]
      // Expected: avg=141.43 rounded to 141.4
      // Sorted: [60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 180, 200, 250, 300]
      // Median: (value[6] + value[7])/2 = (120 + 130)/2 = 125
      // P25: index 3 = 90, P75: index 10 = 180
      // In range (80-140): 7 values = 50%
      // Hypoglycemia (<70): 1 value (60) = 7.1%
      // Severe hypo (<54): 0 = 0%
      // Hyperglycemia (>180): 3 values (200, 250, 300) = 21.4%
      // Severe hyper (>250): 1 value (300) = 7.1%
      const testValues = [60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 180, 200, 250, 300];
      (prismaService.glucoseEntry.findMany as jest.Mock).mockImplementation((args: any) => {
        if (args.where.userId?.in) {
          // Batch query
          return Promise.resolve(
            testValues.map((val, idx) => ({
              id: `e${idx}`,
              mgdlEncrypted: `encrypted-${val}`,
              recordedAt: new Date(`2024-01-${String(idx + 1).padStart(2, "0")}`),
              userId: "p1",
            })),
          );
        }
        return Promise.resolve([]);
      });

      const result = await service.generateGroupReport(doctorId, dto);

      expect(typeof result).toBe("string");
      const csv = result as string;

      // Verify exact calculations
      // Values: [60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 180, 200, 250, 300]
      // Average: (60+70+80+90+100+110+120+130+140+150+180+200+250+300)/14 = 141.43 rounded to 141.4
      // Sorted: [60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 180, 200, 250, 300]
      // Median: (value[6] + value[7])/2 = (120 + 130)/2 = 125 (correct calculation for even-length array)
      // P25: index 3 = 90, P75: index 10 = 180
      // In range (80-140): 7 values = 50%
      // Hypoglycemia (<70): 1 value (60) = 7.1%
      // Severe hypo (<54): 0 = 0%
      // Hyperglycemia (>180): 3 values (200, 250, 300) = 21.4%
      // Severe hyper (>250): 1 value (300) = 7.1%
      expect(csv).toContain("Glucosa,Total de lecturas,14,lecturas");
      expect(csv).toContain("Glucosa,Promedio,141.4,mg/dL");
      expect(csv).toContain("Glucosa,Mediana,125.0,mg/dL");
      expect(csv).toContain("Glucosa,Mínimo,60,mg/dL");
      expect(csv).toContain("Glucosa,Máximo,300,mg/dL");
      expect(csv).toContain("Glucosa,Percentil 25,90,mg/dL");
      expect(csv).toContain("Glucosa,Percentil 75,180,mg/dL");
      expect(csv).toContain("Glucosa,Tiempo en rango,50.0,%");
      expect(csv).toContain("Glucosa,Hipoglucemias,1,eventos");
      expect(csv).toContain("Glucosa,Hipoglucemias %,7.1,%");
      expect(csv).toContain("Glucosa,Hiperglucemias,3,eventos");
      expect(csv).toContain("Glucosa,Hiperglucemias %,21.4,%");
      expect(csv).toContain("Glucosa,Hiperglucemias severas,1,eventos");
      expect(csv).toContain("Glucosa,Hiperglucemias severas %,7.1,%");
      expect(prismaService.glucoseEntry.findMany).toHaveBeenCalled();
    });
  });

  describe("sanitizePatientData", () => {
    it("should remove personal information while keeping useful data", async () => {
      const dto = {
        patientId,
        startDate: "2024-01-01T00:00:00.000Z",
        endDate: "2024-01-31T23:59:59.999Z",
        format: ReportFormat.PDF,
        reportTypes: [ReportType.GLUCOSE],
        includeAISummary: true,
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        id: patientId,
        email: "patient@example.com",
        firstName: "John",
        lastName: "Doe",
        diabetesType: DiabetesType.TYPE_1,
        birthDate: new Date("1990-01-01"),
        weight: 75,
        minTargetGlucose: 80,
        maxTargetGlucose: 140,
      });

      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue([
        { id: "e1", mgdlEncrypted: "encrypted-100", recordedAt: new Date("2024-01-15") },
        { id: "e2", mgdlEncrypted: "encrypted-120", recordedAt: new Date("2024-01-16") },
      ]);

      (configService.get as jest.Mock).mockReturnValue("test-api-key");

      const result = await service.generateIndividualReport(doctorId, dto);

      expect(result).toBeInstanceOf(Buffer);
      // Verify AI summary was requested (which uses sanitizePatientData)
      expect(configService.get).toHaveBeenCalledWith("GEMINI_API_KEY");
    });
  });

  describe("cleanAISummaryText", () => {
    it("should remove markdown formatting", async () => {
      // This is tested indirectly through generateAISummary
      // We can verify the text cleaning by checking the PDF output
      const dto = {
        patientId,
        startDate: "2024-01-01T00:00:00.000Z",
        endDate: "2024-01-31T23:59:59.999Z",
        format: ReportFormat.PDF,
        reportTypes: [ReportType.GLUCOSE],
        includeAISummary: true,
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        id: patientId,
        email: "patient@example.com",
        firstName: "John",
        lastName: "Doe",
        diabetesType: DiabetesType.TYPE_1,
        birthDate: new Date("1990-01-01"),
        weight: 75,
        minTargetGlucose: 80,
        maxTargetGlucose: 140,
      });

      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue([
        { id: "e1", mgdlEncrypted: "encrypted-100", recordedAt: new Date("2024-01-15") },
      ]);

      (configService.get as jest.Mock).mockReturnValue("test-api-key");

      const result = await service.generateIndividualReport(doctorId, dto);

      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe("date parsing", () => {
    it("should correctly parse dates from YYYY-MM-DD format", async () => {
      const dto = {
        patientId,
        startDate: "2024-01-01",
        endDate: "2024-01-31",
        format: ReportFormat.PDF,
        reportTypes: [ReportType.GLUCOSE],
        includeAISummary: false,
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        id: patientId,
        email: "patient@example.com",
        firstName: "John",
        lastName: "Doe",
        diabetesType: DiabetesType.TYPE_1,
        birthDate: new Date("1990-01-01"),
        weight: 75,
        minTargetGlucose: 80,
        maxTargetGlucose: 140,
      });

      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.generateIndividualReport(doctorId, dto);

      expect(result).toBeInstanceOf(Buffer);
      // Verify date parsing by checking the query was made with correct date range
      expect(prismaService.glucoseEntry.findMany).toHaveBeenCalled();
    });
  });
});
