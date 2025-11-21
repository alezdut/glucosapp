import { Test, TestingModule } from "@nestjs/testing";
import { ForbiddenException, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import { AlertsService } from "./alerts.service";
import { DoctorUtilsService } from "../../common/services/doctor-utils.service";
import { PatientUtilsService } from "../../common/services/patient-utils.service";
import { EncryptionService } from "../../common/services/encryption.service";
import { EmailService } from "../auth/services/email.service";
import { createMockPrismaService } from "../../common/test-helpers/prisma.mock";
import { createMockConfigService } from "../../common/test-helpers/config.mock";
import { AlertType, AlertSeverity, UserRole } from "@prisma/client";
import { UpdateAlertSettingsDto } from "./dto/alert-settings.dto";

describe("AlertsService", () => {
  let service: AlertsService;
  let prismaService: any;
  let doctorUtilsService: DoctorUtilsService;
  let patientUtilsService: PatientUtilsService;
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
    const mockPatientUtilsService = {
      verifyPatient: jest.fn().mockResolvedValue(undefined),
    };
    const mockEmailService = {
      sendAlertEmail: jest.fn().mockResolvedValue(undefined),
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
          provide: PatientUtilsService,
          useValue: mockPatientUtilsService,
        },
        {
          provide: EncryptionService,
          useValue: mockEncryptionService,
        },
        {
          provide: "ConfigService",
          useValue: mockConfig,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: ConfigService,
          useValue: mockConfig,
        },
      ],
    }).compile();

    service = module.get<AlertsService>(AlertsService);
    prismaService = module.get<PrismaService>(PrismaService) as any;
    doctorUtilsService = module.get<DoctorUtilsService>(DoctorUtilsService);
    patientUtilsService = module.get<PatientUtilsService>(PatientUtilsService);
    encryptionService = module.get<EncryptionService>(EncryptionService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("detectAlert", () => {
    const mockDefaultSettings = {
      id: "settings-123",
      userId: patientId,
      alertsEnabled: true,
      hypoglycemiaEnabled: true,
      hypoglycemiaThreshold: 70,
      severeHypoglycemiaEnabled: true,
      severeHypoglycemiaThreshold: 54,
      hyperglycemiaEnabled: true,
      hyperglycemiaThreshold: 250,
      persistentHyperglycemiaEnabled: true,
      persistentHyperglycemiaThreshold: 250,
      persistentHyperglycemiaWindowHours: 4,
      persistentHyperglycemiaMinReadings: 2,
      notificationChannels: { dashboard: true, email: false, push: false },
      dailySummaryEnabled: true,
      dailySummaryTime: "08:00",
      quietHoursEnabled: false,
      quietHoursStart: null,
      quietHoursEnd: null,
      notificationFrequency: "IMMEDIATE",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      (prismaService.alertSettings.upsert as jest.Mock).mockResolvedValue(mockDefaultSettings);
      // Default mock for glucoseReading.findMany (empty array)
      (prismaService.glucoseReading.findMany as jest.Mock).mockResolvedValue([]);
    });

    it("should create alert for severe hypoglycemia", async () => {
      const glucoseMgdl = 50;

      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.alert.create as jest.Mock).mockResolvedValue({
        id: "alert-123",
        userId: patientId,
        type: AlertType.SEVERE_HYPOGLYCEMIA,
        severity: AlertSeverity.CRITICAL,
        createdAt: new Date(),
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
        createdAt: new Date(),
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
      (prismaService.glucoseReading.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.alert.create as jest.Mock).mockResolvedValue({
        id: "alert-123",
        userId: patientId,
        type: AlertType.HYPERGLYCEMIA,
        severity: AlertSeverity.MEDIUM,
        createdAt: new Date(),
      });

      await service.detectAlert(patientId, glucoseMgdl);

      expect(prismaService.glucoseEntry.findMany).toHaveBeenCalled();
      expect(prismaService.glucoseReading.findMany).toHaveBeenCalled();
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
      const recentReadings: any[] = [];

      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue(recentEntries);
      (prismaService.glucoseReading.findMany as jest.Mock).mockResolvedValue(recentReadings);
      (prismaService.alert.findFirst as jest.Mock).mockResolvedValue(null); // No existing alert
      (prismaService.alert.create as jest.Mock).mockResolvedValue({
        id: "alert-123",
        userId: patientId,
        type: AlertType.PERSISTENT_HYPERGLYCEMIA,
        severity: AlertSeverity.HIGH,
        createdAt: new Date(),
      });

      await service.detectAlert(patientId, glucoseMgdl);

      expect(prismaService.glucoseEntry.findMany).toHaveBeenCalled();
      expect(prismaService.glucoseReading.findMany).toHaveBeenCalled();
      expect(prismaService.alert.findFirst).toHaveBeenCalled();
      expect(prismaService.alert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: AlertType.PERSISTENT_HYPERGLYCEMIA,
            severity: AlertSeverity.HIGH,
          }),
        }),
      );
    });

    it("should save glucoseReadingId when provided", async () => {
      const glucoseMgdl = 50;
      const readingId = "reading-123";

      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.alert.create as jest.Mock).mockResolvedValue({
        id: "alert-123",
        userId: patientId,
        type: AlertType.SEVERE_HYPOGLYCEMIA,
        severity: AlertSeverity.CRITICAL,
        glucoseReadingId: readingId,
        createdAt: new Date(),
      });

      await service.detectAlert(patientId, glucoseMgdl, readingId);

      expect(prismaService.alert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: AlertType.SEVERE_HYPOGLYCEMIA,
            severity: AlertSeverity.CRITICAL,
            glucoseReadingId: readingId,
          }),
        }),
      );
    });

    it("should not include glucoseReadingId when not provided", async () => {
      const glucoseMgdl = 50;

      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.alert.create as jest.Mock).mockResolvedValue({
        id: "alert-123",
        userId: patientId,
        type: AlertType.SEVERE_HYPOGLYCEMIA,
        severity: AlertSeverity.CRITICAL,
        createdAt: new Date(),
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
      // Verify glucoseReadingId is not in the data object
      const createCall = (prismaService.alert.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data).not.toHaveProperty("glucoseReadingId");
    });

    it("should save glucoseEntryId when provided", async () => {
      const glucoseMgdl = 50;
      const entryId = "entry-123";

      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.alert.create as jest.Mock).mockResolvedValue({
        id: "alert-123",
        userId: patientId,
        type: AlertType.SEVERE_HYPOGLYCEMIA,
        severity: AlertSeverity.CRITICAL,
        glucoseEntryId: entryId,
        createdAt: new Date(),
      });

      await service.detectAlert(patientId, glucoseMgdl, undefined, entryId);

      expect(prismaService.alert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: AlertType.SEVERE_HYPOGLYCEMIA,
            severity: AlertSeverity.CRITICAL,
            glucoseEntryId: entryId,
          }),
        }),
      );
    });

    it("should save both glucoseReadingId and glucoseEntryId when both provided", async () => {
      const glucoseMgdl = 50;
      const readingId = "reading-123";
      const entryId = "entry-123";

      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.alert.create as jest.Mock).mockResolvedValue({
        id: "alert-123",
        userId: patientId,
        type: AlertType.SEVERE_HYPOGLYCEMIA,
        severity: AlertSeverity.CRITICAL,
        glucoseReadingId: readingId,
        glucoseEntryId: entryId,
        createdAt: new Date(),
      });

      await service.detectAlert(patientId, glucoseMgdl, readingId, entryId);

      expect(prismaService.alert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: AlertType.SEVERE_HYPOGLYCEMIA,
            severity: AlertSeverity.CRITICAL,
            glucoseReadingId: readingId,
            glucoseEntryId: entryId,
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

    it("should not create alert if alertsEnabled is false", async () => {
      const glucoseMgdl = 50; // Would normally trigger severe hypoglycemia
      const disabledSettings = {
        ...mockDefaultSettings,
        alertsEnabled: false,
      };

      (prismaService.alertSettings.upsert as jest.Mock).mockResolvedValue(disabledSettings);
      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue([]);

      await service.detectAlert(patientId, glucoseMgdl);

      expect(prismaService.alert.create).not.toHaveBeenCalled();
    });

    it("should not create alert if specific alert type is disabled", async () => {
      const glucoseMgdl = 65; // Would normally trigger hypoglycemia
      const disabledHypoglycemiaSettings = {
        ...mockDefaultSettings,
        hypoglycemiaEnabled: false,
      };

      (prismaService.alertSettings.upsert as jest.Mock).mockResolvedValue(
        disabledHypoglycemiaSettings,
      );
      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue([]);

      await service.detectAlert(patientId, glucoseMgdl);

      expect(prismaService.alert.create).not.toHaveBeenCalled();
    });

    it("should not create severe hypoglycemia alert if disabled", async () => {
      const glucoseMgdl = 50; // Would normally trigger severe hypoglycemia
      const disabledSevereSettings = {
        ...mockDefaultSettings,
        severeHypoglycemiaEnabled: false,
      };

      (prismaService.alertSettings.upsert as jest.Mock).mockResolvedValue(disabledSevereSettings);
      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue([]);

      await service.detectAlert(patientId, glucoseMgdl);

      // Should not create alert because severe is disabled and value is below hypoglycemia threshold
      expect(prismaService.alert.create).not.toHaveBeenCalled();
    });

    it("should respect custom hypoglycemia threshold", async () => {
      const glucoseMgdl = 75; // Above default threshold (70) but below custom (80)
      const customSettings = {
        ...mockDefaultSettings,
        hypoglycemiaThreshold: 80,
      };

      (prismaService.alertSettings.upsert as jest.Mock).mockResolvedValue(customSettings);
      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.alert.create as jest.Mock).mockResolvedValue({
        id: "alert-123",
        userId: patientId,
        type: AlertType.HYPOGLYCEMIA,
        severity: AlertSeverity.HIGH,
        createdAt: new Date(),
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

    it("should respect custom severe hypoglycemia threshold", async () => {
      const glucoseMgdl = 50; // Above default severe threshold (54) but below custom (45)
      const customSettings = {
        ...mockDefaultSettings,
        severeHypoglycemiaThreshold: 45,
      };

      (prismaService.alertSettings.upsert as jest.Mock).mockResolvedValue(customSettings);
      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.alert.create as jest.Mock).mockResolvedValue({
        id: "alert-123",
        userId: patientId,
        type: AlertType.HYPOGLYCEMIA,
        severity: AlertSeverity.HIGH,
        createdAt: new Date(),
      });

      await service.detectAlert(patientId, glucoseMgdl);

      // Should not create severe alert because 50 > 45, but should create regular hypoglycemia
      expect(prismaService.alert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: AlertType.HYPOGLYCEMIA,
            severity: AlertSeverity.HIGH,
          }),
        }),
      );
    });

    it("should respect custom hyperglycemia threshold", async () => {
      const glucoseMgdl = 240; // Above default threshold (250) but below custom (230)
      const customSettings = {
        ...mockDefaultSettings,
        hyperglycemiaThreshold: 230,
      };

      (prismaService.alertSettings.upsert as jest.Mock).mockResolvedValue(customSettings);
      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.glucoseReading.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.alert.create as jest.Mock).mockResolvedValue({
        id: "alert-123",
        userId: patientId,
        type: AlertType.HYPERGLYCEMIA,
        severity: AlertSeverity.MEDIUM,
        createdAt: new Date(),
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

    it("should not create hyperglycemia alert if disabled", async () => {
      const glucoseMgdl = 280; // Would normally trigger hyperglycemia
      const disabledHyperglycemiaSettings = {
        ...mockDefaultSettings,
        hyperglycemiaEnabled: false,
      };

      (prismaService.alertSettings.upsert as jest.Mock).mockResolvedValue(
        disabledHyperglycemiaSettings,
      );
      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.glucoseReading.findMany as jest.Mock).mockResolvedValue([]);

      await service.detectAlert(patientId, glucoseMgdl);

      expect(prismaService.alert.create).not.toHaveBeenCalled();
    });

    it("should create persistent hyperglycemia alert with custom settings", async () => {
      const glucoseMgdl = 280;
      const customSettings = {
        ...mockDefaultSettings,
        persistentHyperglycemiaThreshold: 240,
        persistentHyperglycemiaWindowHours: 2,
        persistentHyperglycemiaMinReadings: 2,
      };
      const recentEntries = [
        { mgdlEncrypted: "encrypted-250" },
        { mgdlEncrypted: "encrypted-260" },
      ];
      const recentReadings: any[] = [];

      (prismaService.alertSettings.upsert as jest.Mock).mockResolvedValue(customSettings);
      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue(recentEntries);
      (prismaService.glucoseReading.findMany as jest.Mock).mockResolvedValue(recentReadings);
      (prismaService.alert.findFirst as jest.Mock).mockResolvedValue(null); // No existing alert
      (prismaService.alert.create as jest.Mock).mockResolvedValue({
        id: "alert-123",
        userId: patientId,
        type: AlertType.PERSISTENT_HYPERGLYCEMIA,
        severity: AlertSeverity.HIGH,
        createdAt: new Date(),
      });

      await service.detectAlert(patientId, glucoseMgdl);

      expect(prismaService.glucoseEntry.findMany).toHaveBeenCalled();
      expect(prismaService.glucoseReading.findMany).toHaveBeenCalled();
      expect(prismaService.alert.findFirst).toHaveBeenCalled();
      expect(prismaService.alert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: AlertType.PERSISTENT_HYPERGLYCEMIA,
            severity: AlertSeverity.HIGH,
            message: expect.stringMatching(
              /al menos 2 registros.*240 mg\/dL.*2 horas|2 horas.*240 mg\/dL.*al menos 2 registros/,
            ),
          }),
        }),
      );
    });

    it("should not create persistent hyperglycemia alert if disabled", async () => {
      const glucoseMgdl = 280;
      const disabledPersistentSettings = {
        ...mockDefaultSettings,
        persistentHyperglycemiaEnabled: false,
      };
      const recentEntries = [
        { mgdlEncrypted: "encrypted-260" },
        { mgdlEncrypted: "encrypted-270" },
      ];
      const recentReadings: any[] = [];

      (prismaService.alertSettings.upsert as jest.Mock).mockResolvedValue(
        disabledPersistentSettings,
      );
      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue(recentEntries);
      (prismaService.glucoseReading.findMany as jest.Mock).mockResolvedValue(recentReadings);
      (prismaService.alert.create as jest.Mock).mockResolvedValue({
        id: "alert-123",
        userId: patientId,
        type: AlertType.HYPERGLYCEMIA,
        severity: AlertSeverity.MEDIUM,
        createdAt: new Date(),
      });

      await service.detectAlert(patientId, glucoseMgdl);

      // Should create regular hyperglycemia, not persistent
      expect(prismaService.alert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: AlertType.HYPERGLYCEMIA,
            severity: AlertSeverity.MEDIUM,
          }),
        }),
      );
      expect(prismaService.alert.create).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: AlertType.PERSISTENT_HYPERGLYCEMIA,
          }),
        }),
      );
    });

    it("should not create persistent hyperglycemia if min readings not met", async () => {
      const glucoseMgdl = 280;
      const customSettings = {
        ...mockDefaultSettings,
        persistentHyperglycemiaMinReadings: 3, // Require 3 readings
      };
      const recentEntries = [
        { mgdlEncrypted: "encrypted-260" },
        { mgdlEncrypted: "encrypted-270" },
        // Only 2 high readings, need 3
      ];
      const recentReadings: any[] = [];

      (prismaService.alertSettings.upsert as jest.Mock).mockResolvedValue(customSettings);
      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue(recentEntries);
      (prismaService.glucoseReading.findMany as jest.Mock).mockResolvedValue(recentReadings);
      (prismaService.alert.create as jest.Mock).mockResolvedValue({
        id: "alert-123",
        userId: patientId,
        type: AlertType.HYPERGLYCEMIA,
        severity: AlertSeverity.MEDIUM,
        createdAt: new Date(),
      });

      await service.detectAlert(patientId, glucoseMgdl);

      // Should create regular hyperglycemia, not persistent
      expect(prismaService.glucoseEntry.findMany).toHaveBeenCalled();
      expect(prismaService.glucoseReading.findMany).toHaveBeenCalled();
      expect(prismaService.alert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: AlertType.HYPERGLYCEMIA,
            severity: AlertSeverity.MEDIUM,
          }),
        }),
      );
    });

    it("should not create persistent hyperglycemia with only one reading (should create regular hyperglycemia)", async () => {
      const glucoseMgdl = 280;
      const recentEntries: any[] = []; // No previous entries
      const recentReadings: any[] = []; // No previous readings

      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue(recentEntries);
      (prismaService.glucoseReading.findMany as jest.Mock).mockResolvedValue(recentReadings);
      (prismaService.alert.create as jest.Mock).mockResolvedValue({
        id: "alert-123",
        userId: patientId,
        type: AlertType.HYPERGLYCEMIA,
        severity: AlertSeverity.MEDIUM,
        createdAt: new Date(),
      });

      await service.detectAlert(patientId, glucoseMgdl);

      // Should search both tables
      expect(prismaService.glucoseEntry.findMany).toHaveBeenCalled();
      expect(prismaService.glucoseReading.findMany).toHaveBeenCalled();
      // Should create regular hyperglycemia, not persistent (only 1 reading, need 2)
      expect(prismaService.alert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: AlertType.HYPERGLYCEMIA,
            severity: AlertSeverity.MEDIUM,
          }),
        }),
      );
      expect(prismaService.alert.create).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: AlertType.PERSISTENT_HYPERGLYCEMIA,
          }),
        }),
      );
    });

    it("should combine readings from both glucoseEntry and glucoseReading tables", async () => {
      const glucoseMgdl = 280;
      const recentEntries = [
        { mgdlEncrypted: "encrypted-260" }, // 1 reading from glucoseEntry
      ];
      const recentReadings = [
        { glucoseEncrypted: "encrypted-270" }, // 1 reading from glucoseReading
      ];

      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue(recentEntries);
      (prismaService.glucoseReading.findMany as jest.Mock).mockResolvedValue(recentReadings);
      (prismaService.alert.findFirst as jest.Mock).mockResolvedValue(null); // No existing alert
      (prismaService.alert.create as jest.Mock).mockResolvedValue({
        id: "alert-123",
        userId: patientId,
        type: AlertType.PERSISTENT_HYPERGLYCEMIA,
        severity: AlertSeverity.HIGH,
        createdAt: new Date(),
      });

      await service.detectAlert(patientId, glucoseMgdl);

      // Should search both tables
      expect(prismaService.glucoseEntry.findMany).toHaveBeenCalled();
      expect(prismaService.glucoseReading.findMany).toHaveBeenCalled();
      expect(prismaService.alert.findFirst).toHaveBeenCalled();
      // Should create persistent hyperglycemia (1 from entries + 1 from readings + current = 3 total, but only counting previous ones)
      // Actually, current reading is included in the count, so: 1 entry + 1 reading = 2, which meets minReadings of 2
      expect(prismaService.alert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: AlertType.PERSISTENT_HYPERGLYCEMIA,
            severity: AlertSeverity.HIGH,
          }),
        }),
      );
    });

    it("should not create duplicate persistent hyperglycemia alert if one already exists in time window", async () => {
      const glucoseMgdl = 280;
      const customSettings = {
        ...mockDefaultSettings,
        hyperglycemiaEnabled: false, // Disable regular hyperglycemia to test only persistent
      };
      const recentEntries = [
        { mgdlEncrypted: "encrypted-260" },
        { mgdlEncrypted: "encrypted-270" },
      ];
      const recentReadings: any[] = [];
      const existingAlert = {
        id: "existing-alert-123",
        userId: patientId,
        type: AlertType.PERSISTENT_HYPERGLYCEMIA,
        severity: AlertSeverity.HIGH,
        createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago (within 2 hour window)
      };

      (prismaService.alertSettings.upsert as jest.Mock).mockResolvedValue(customSettings);
      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue(recentEntries);
      (prismaService.glucoseReading.findMany as jest.Mock).mockResolvedValue(recentReadings);
      (prismaService.alert.findFirst as jest.Mock).mockResolvedValue(existingAlert); // Existing alert found

      await service.detectAlert(patientId, glucoseMgdl);

      // Should search both tables
      expect(prismaService.glucoseEntry.findMany).toHaveBeenCalled();
      expect(prismaService.glucoseReading.findMany).toHaveBeenCalled();
      // Should check for existing alert
      expect(prismaService.alert.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: patientId,
            type: AlertType.PERSISTENT_HYPERGLYCEMIA,
            createdAt: expect.any(Object),
          }),
        }),
      );
      // Should NOT create a new alert (counter resets, and regular hyperglycemia is disabled)
      expect(prismaService.alert.create).not.toHaveBeenCalled();
    });

    it("should create new persistent hyperglycemia alert if previous one is outside time window", async () => {
      const glucoseMgdl = 280;
      const recentEntries = [
        { mgdlEncrypted: "encrypted-260" },
        { mgdlEncrypted: "encrypted-270" },
      ];
      const recentReadings: any[] = [];

      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue(recentEntries);
      (prismaService.glucoseReading.findMany as jest.Mock).mockResolvedValue(recentReadings);
      (prismaService.alert.findFirst as jest.Mock).mockResolvedValue(null); // No existing alert in window
      (prismaService.alert.create as jest.Mock).mockResolvedValue({
        id: "alert-123",
        userId: patientId,
        type: AlertType.PERSISTENT_HYPERGLYCEMIA,
        severity: AlertSeverity.HIGH,
        createdAt: new Date(),
      });

      await service.detectAlert(patientId, glucoseMgdl);

      // Should check for existing alert
      expect(prismaService.alert.findFirst).toHaveBeenCalled();
      // Should create a new alert since previous one is outside window
      expect(prismaService.alert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: AlertType.PERSISTENT_HYPERGLYCEMIA,
            severity: AlertSeverity.HIGH,
          }),
        }),
      );
    });

    it("should create regular hyperglycemia alert if persistent alert exists but regular hyperglycemia is enabled", async () => {
      const glucoseMgdl = 280;
      const recentEntries = [
        { mgdlEncrypted: "encrypted-260" },
        { mgdlEncrypted: "encrypted-270" },
      ];
      const recentReadings: any[] = [];
      const existingAlert = {
        id: "existing-alert-123",
        userId: patientId,
        type: AlertType.PERSISTENT_HYPERGLYCEMIA,
        severity: AlertSeverity.HIGH,
        createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago (within 2 hour window)
      };

      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue(recentEntries);
      (prismaService.glucoseReading.findMany as jest.Mock).mockResolvedValue(recentReadings);
      (prismaService.alert.findFirst as jest.Mock).mockResolvedValue(existingAlert); // Existing alert found
      (prismaService.alert.create as jest.Mock).mockResolvedValue({
        id: "alert-123",
        userId: patientId,
        type: AlertType.HYPERGLYCEMIA,
        severity: AlertSeverity.MEDIUM,
        createdAt: new Date(),
      });

      await service.detectAlert(patientId, glucoseMgdl);

      // Should check for existing alert
      expect(prismaService.alert.findFirst).toHaveBeenCalled();
      // Should create regular hyperglycemia alert instead
      expect(prismaService.alert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: AlertType.HYPERGLYCEMIA,
            severity: AlertSeverity.MEDIUM,
          }),
        }),
      );
    });

    it("should search glucoseReading table with isHistorical: false filter", async () => {
      const glucoseMgdl = 280;
      const recentEntries: any[] = [];
      const recentReadings: any[] = [];

      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue(recentEntries);
      (prismaService.glucoseReading.findMany as jest.Mock).mockResolvedValue(recentReadings);
      (prismaService.alert.create as jest.Mock).mockResolvedValue({
        id: "alert-123",
        userId: patientId,
        type: AlertType.HYPERGLYCEMIA,
        severity: AlertSeverity.MEDIUM,
        createdAt: new Date(),
      });

      await service.detectAlert(patientId, glucoseMgdl);

      // Verify that glucoseReading.findMany is called with isHistorical: false
      expect(prismaService.glucoseReading.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: patientId,
            isHistorical: false,
            recordedAt: expect.any(Object),
          }),
        }),
      );
    });

    it("should prioritize severe hypoglycemia over regular hypoglycemia", async () => {
      const glucoseMgdl = 50; // Below severe threshold (54)
      const customSettings = {
        ...mockDefaultSettings,
        severeHypoglycemiaThreshold: 54,
        hypoglycemiaThreshold: 70,
      };

      (prismaService.alertSettings.upsert as jest.Mock).mockResolvedValue(customSettings);
      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.alert.create as jest.Mock).mockResolvedValue({
        id: "alert-123",
        userId: patientId,
        type: AlertType.SEVERE_HYPOGLYCEMIA,
        severity: AlertSeverity.CRITICAL,
        createdAt: new Date(),
      });

      await service.detectAlert(patientId, glucoseMgdl);

      // Should create severe, not regular hypoglycemia
      expect(prismaService.alert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: AlertType.SEVERE_HYPOGLYCEMIA,
            severity: AlertSeverity.CRITICAL,
          }),
        }),
      );
      expect(prismaService.alert.create).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: AlertType.HYPOGLYCEMIA,
          }),
        }),
      );
    });

    it("should create regular hypoglycemia when between thresholds", async () => {
      const glucoseMgdl = 60; // Between severe (54) and regular (70)
      const customSettings = {
        ...mockDefaultSettings,
        severeHypoglycemiaThreshold: 54,
        hypoglycemiaThreshold: 70,
      };

      (prismaService.alertSettings.upsert as jest.Mock).mockResolvedValue(customSettings);
      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.alert.create as jest.Mock).mockResolvedValue({
        id: "alert-123",
        userId: patientId,
        type: AlertType.HYPOGLYCEMIA,
        severity: AlertSeverity.HIGH,
        createdAt: new Date(),
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

  describe("getAlertSettings", () => {
    const doctorId = "doctor-123";
    const patientId = "patient-123";

    beforeEach(() => {
      // Mock doctor verification
      (doctorUtilsService.verifyDoctor as jest.Mock).mockResolvedValue(undefined);
      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue([patientId]);
    });

    it("should verify doctor role before returning settings", async () => {
      const mockSettings = {
        id: "settings-123",
        userId: patientId,
        alertsEnabled: true,
        hypoglycemiaEnabled: true,
        hypoglycemiaThreshold: 70,
        severeHypoglycemiaEnabled: true,
        severeHypoglycemiaThreshold: 54,
        hyperglycemiaEnabled: true,
        hyperglycemiaThreshold: 250,
        persistentHyperglycemiaEnabled: true,
        persistentHyperglycemiaThreshold: 250,
        persistentHyperglycemiaWindowHours: 4,
        persistentHyperglycemiaMinReadings: 2,
        notificationChannels: { dashboard: true, email: false, push: false },
        dailySummaryEnabled: true,
        dailySummaryTime: "08:00",
        quietHoursEnabled: false,
        quietHoursStart: null,
        quietHoursEnd: null,
        notificationFrequency: "IMMEDIATE",
        createdAt: new Date("2024-01-01T00:00:00.000Z"),
        updatedAt: new Date("2024-01-01T00:00:00.000Z"),
      };

      (prismaService.alertSettings.upsert as jest.Mock).mockResolvedValue(mockSettings);

      const result = await service.getAlertSettings(doctorId);

      expect(doctorUtilsService.verifyDoctor).toHaveBeenCalledWith(doctorId);
      expect(doctorUtilsService.getDoctorPatientIds).toHaveBeenCalledWith(doctorId);
      expect(result).toMatchObject({
        id: "settings-123",
        userId: patientId,
        alertsEnabled: true,
        hypoglycemiaThreshold: 70,
        severeHypoglycemiaThreshold: 54,
        hyperglycemiaThreshold: 250,
      });
      expect(prismaService.alertSettings.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: patientId },
        }),
      );
    });

    it("should throw ForbiddenException if doctor has no assigned patients", async () => {
      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue([]);

      await expect(service.getAlertSettings(doctorId)).rejects.toThrow(ForbiddenException);
      await expect(service.getAlertSettings(doctorId)).rejects.toThrow(
        "Doctor has no assigned patients",
      );
    });

    it("should return existing alert settings", async () => {
      const mockSettings = {
        id: "settings-123",
        userId: patientId,
        alertsEnabled: true,
        hypoglycemiaEnabled: true,
        hypoglycemiaThreshold: 70,
        severeHypoglycemiaEnabled: true,
        severeHypoglycemiaThreshold: 54,
        hyperglycemiaEnabled: true,
        hyperglycemiaThreshold: 250,
        persistentHyperglycemiaEnabled: true,
        persistentHyperglycemiaThreshold: 250,
        persistentHyperglycemiaWindowHours: 4,
        persistentHyperglycemiaMinReadings: 2,
        notificationChannels: { dashboard: true, email: false, push: false },
        dailySummaryEnabled: true,
        dailySummaryTime: "08:00",
        quietHoursEnabled: false,
        quietHoursStart: null,
        quietHoursEnd: null,
        notificationFrequency: "IMMEDIATE",
        createdAt: new Date("2024-01-01T00:00:00.000Z"),
        updatedAt: new Date("2024-01-01T00:00:00.000Z"),
      };

      (prismaService.alertSettings.upsert as jest.Mock).mockResolvedValue(mockSettings);

      const result = await service.getAlertSettings(doctorId);

      expect(result).toMatchObject({
        id: "settings-123",
        userId: patientId,
        alertsEnabled: true,
        hypoglycemiaThreshold: 70,
        severeHypoglycemiaThreshold: 54,
        hyperglycemiaThreshold: 250,
      });
      expect(prismaService.alertSettings.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: patientId },
        }),
      );
    });

    it("should create default settings if they don't exist", async () => {
      const mockSettings = {
        id: "settings-123",
        userId: patientId,
        alertsEnabled: true,
        hypoglycemiaEnabled: true,
        hypoglycemiaThreshold: 70,
        severeHypoglycemiaEnabled: true,
        severeHypoglycemiaThreshold: 54,
        hyperglycemiaEnabled: true,
        hyperglycemiaThreshold: 250,
        persistentHyperglycemiaEnabled: true,
        persistentHyperglycemiaThreshold: 250,
        persistentHyperglycemiaWindowHours: 4,
        persistentHyperglycemiaMinReadings: 2,
        notificationChannels: { dashboard: true, email: false, push: false },
        dailySummaryEnabled: true,
        dailySummaryTime: "08:00",
        quietHoursEnabled: false,
        quietHoursStart: null,
        quietHoursEnd: null,
        notificationFrequency: "IMMEDIATE",
        createdAt: new Date("2024-01-01T00:00:00.000Z"),
        updatedAt: new Date("2024-01-01T00:00:00.000Z"),
      };

      (prismaService.alertSettings.upsert as jest.Mock).mockResolvedValue(mockSettings);

      const result = await service.getAlertSettings(doctorId);

      expect(result).toBeDefined();
      expect(prismaService.alertSettings.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: patientId },
          create: expect.objectContaining({
            userId: patientId,
            alertsEnabled: true,
            hypoglycemiaThreshold: 70,
            severeHypoglycemiaThreshold: 54,
          }),
        }),
      );
    });
  });

  describe("updateAlertSettings", () => {
    const doctorId = "doctor-123";
    const patientId = "patient-123";

    beforeEach(() => {
      // Mock doctor verification
      (doctorUtilsService.verifyDoctor as jest.Mock).mockResolvedValue(undefined);
      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue([patientId]);
    });

    it("should verify doctor role before updating settings", async () => {
      const currentSettings = {
        id: "settings-123",
        userId: patientId,
        alertsEnabled: true,
        hypoglycemiaEnabled: true,
        hypoglycemiaThreshold: 70,
        severeHypoglycemiaEnabled: true,
        severeHypoglycemiaThreshold: 54,
        hyperglycemiaEnabled: true,
        hyperglycemiaThreshold: 250,
        persistentHyperglycemiaEnabled: true,
        persistentHyperglycemiaThreshold: 250,
        persistentHyperglycemiaWindowHours: 4,
        persistentHyperglycemiaMinReadings: 2,
        notificationChannels: { dashboard: true, email: false, push: false },
        dailySummaryEnabled: true,
        dailySummaryTime: "08:00",
        quietHoursEnabled: false,
        quietHoursStart: null,
        quietHoursEnd: null,
        notificationFrequency: "IMMEDIATE",
        createdAt: new Date("2024-01-01T00:00:00.000Z"),
        updatedAt: new Date("2024-01-01T00:00:00.000Z"),
      };

      const updateDto: UpdateAlertSettingsDto = {
        hypoglycemiaThreshold: 75,
        hyperglycemiaThreshold: 240,
        notificationChannels: {
          dashboard: true,
          email: true,
          push: false,
        },
      };

      const updatedSettings = {
        ...currentSettings,
        ...updateDto,
        updatedAt: new Date("2024-01-02T00:00:00.000Z"),
      };

      (prismaService.alertSettings.upsert as jest.Mock).mockResolvedValue(currentSettings);
      (prismaService.alertSettings.findUnique as jest.Mock).mockResolvedValue(updatedSettings);

      const result = await service.updateAlertSettings(doctorId, updateDto);

      expect(doctorUtilsService.verifyDoctor).toHaveBeenCalledWith(doctorId);
      expect(doctorUtilsService.getDoctorPatientIds).toHaveBeenCalledWith(doctorId);
      expect(result.hypoglycemiaThreshold).toBe(75);
      expect(result.hyperglycemiaThreshold).toBe(240);
      expect(result.notificationChannels).toEqual({
        dashboard: true,
        email: true,
        push: false,
      });
      // Verify that upsert was called (once for getOrCreateDefaultSettings, once for each patient update)
      // Since we have 1 patient, upsert should be called 2 times total
      expect(prismaService.alertSettings.upsert).toHaveBeenCalledTimes(2);
      // Verify the update call (second call)
      expect(prismaService.alertSettings.upsert).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: { userId: patientId },
          update: expect.objectContaining(updateDto),
        }),
      );
    });

    it("should throw ForbiddenException if doctor has no assigned patients", async () => {
      const updateDto: UpdateAlertSettingsDto = {
        hypoglycemiaThreshold: 75,
      };

      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue([]);

      await expect(service.updateAlertSettings(doctorId, updateDto)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.updateAlertSettings(doctorId, updateDto)).rejects.toThrow(
        "Doctor has no assigned patients",
      );
    });

    it("should throw ForbiddenException if patient is not assigned to doctor", async () => {
      const updateDto: UpdateAlertSettingsDto = {
        hypoglycemiaThreshold: 75,
      };

      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue([]);

      await expect(service.updateAlertSettings(doctorId, updateDto)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.updateAlertSettings(doctorId, updateDto)).rejects.toThrow(
        "Doctor has no assigned patients",
      );
    });

    it("should throw BadRequestException if severeHypoglycemiaThreshold >= hypoglycemiaThreshold", async () => {
      const currentSettings = {
        id: "settings-123",
        userId: patientId,
        alertsEnabled: true,
        hypoglycemiaEnabled: true,
        hypoglycemiaThreshold: 70,
        severeHypoglycemiaEnabled: true,
        severeHypoglycemiaThreshold: 54,
        hyperglycemiaEnabled: true,
        hyperglycemiaThreshold: 250,
        persistentHyperglycemiaEnabled: true,
        persistentHyperglycemiaThreshold: 250,
        persistentHyperglycemiaWindowHours: 4,
        persistentHyperglycemiaMinReadings: 2,
        notificationChannels: { dashboard: true, email: false, push: false },
        dailySummaryEnabled: true,
        dailySummaryTime: "08:00",
        quietHoursEnabled: false,
        quietHoursStart: null,
        quietHoursEnd: null,
        notificationFrequency: "IMMEDIATE",
        createdAt: new Date("2024-01-01T00:00:00.000Z"),
        updatedAt: new Date("2024-01-01T00:00:00.000Z"),
      };

      const updateDto: UpdateAlertSettingsDto = {
        severeHypoglycemiaThreshold: 75, // Greater than current hypoglycemiaThreshold
        hypoglycemiaThreshold: 70,
      };

      (prismaService.alertSettings.upsert as jest.Mock).mockResolvedValue(currentSettings);

      await expect(service.updateAlertSettings(doctorId, updateDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should validate using current settings when only one threshold is updated", async () => {
      const currentSettings = {
        id: "settings-123",
        userId: patientId,
        alertsEnabled: true,
        hypoglycemiaEnabled: true,
        hypoglycemiaThreshold: 70,
        severeHypoglycemiaEnabled: true,
        severeHypoglycemiaThreshold: 54,
        hyperglycemiaEnabled: true,
        hyperglycemiaThreshold: 250,
        persistentHyperglycemiaEnabled: true,
        persistentHyperglycemiaThreshold: 250,
        persistentHyperglycemiaWindowHours: 4,
        persistentHyperglycemiaMinReadings: 2,
        notificationChannels: { dashboard: true, email: false, push: false },
        dailySummaryEnabled: true,
        dailySummaryTime: "08:00",
        quietHoursEnabled: false,
        quietHoursStart: null,
        quietHoursEnd: null,
        notificationFrequency: "IMMEDIATE",
        createdAt: new Date("2024-01-01T00:00:00.000Z"),
        updatedAt: new Date("2024-01-01T00:00:00.000Z"),
      };

      const updateDto: UpdateAlertSettingsDto = {
        severeHypoglycemiaThreshold: 75, // Greater than current hypoglycemiaThreshold (70)
      };

      (prismaService.alertSettings.upsert as jest.Mock).mockResolvedValue(currentSettings);

      await expect(service.updateAlertSettings(doctorId, updateDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should allow valid threshold updates", async () => {
      const currentSettings = {
        id: "settings-123",
        userId: patientId,
        alertsEnabled: true,
        hypoglycemiaEnabled: true,
        hypoglycemiaThreshold: 70,
        severeHypoglycemiaEnabled: true,
        severeHypoglycemiaThreshold: 54,
        hyperglycemiaEnabled: true,
        hyperglycemiaThreshold: 250,
        persistentHyperglycemiaEnabled: true,
        persistentHyperglycemiaThreshold: 250,
        persistentHyperglycemiaWindowHours: 4,
        persistentHyperglycemiaMinReadings: 2,
        notificationChannels: { dashboard: true, email: false, push: false },
        dailySummaryEnabled: true,
        dailySummaryTime: "08:00",
        quietHoursEnabled: false,
        quietHoursStart: null,
        quietHoursEnd: null,
        notificationFrequency: "IMMEDIATE",
        createdAt: new Date("2024-01-01T00:00:00.000Z"),
        updatedAt: new Date("2024-01-01T00:00:00.000Z"),
      };

      const updateDto: UpdateAlertSettingsDto = {
        severeHypoglycemiaThreshold: 50, // Less than current hypoglycemiaThreshold (70)
        hypoglycemiaThreshold: 75,
      };

      const updatedSettings = {
        ...currentSettings,
        ...updateDto,
        updatedAt: new Date("2024-01-02T00:00:00.000Z"),
      };

      (prismaService.alertSettings.upsert as jest.Mock).mockResolvedValue(currentSettings);
      (prismaService.alertSettings.findUnique as jest.Mock).mockResolvedValue(updatedSettings);

      const result = await service.updateAlertSettings(doctorId, updateDto);

      expect(doctorUtilsService.verifyDoctor).toHaveBeenCalledWith(doctorId);
      expect(doctorUtilsService.getDoctorPatientIds).toHaveBeenCalledWith(doctorId);

      expect(result.severeHypoglycemiaThreshold).toBe(50);
      expect(result.hypoglycemiaThreshold).toBe(75);
    });
  });
});
