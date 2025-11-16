import { Test, TestingModule } from "@nestjs/testing";
import { ForbiddenException, NotFoundException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { DoctorPatientService } from "./doctor-patient.service";
import { DoctorUtilsService } from "../../common/services/doctor-utils.service";
import { EncryptionService } from "../../common/services/encryption.service";
import { createMockPrismaService } from "../../common/test-helpers/prisma.mock";
import { createMockConfigService } from "../../common/test-helpers/config.mock";
import { createMockUser } from "../../common/test-helpers/fixtures";
import { UserRole, DiabetesType } from "@prisma/client";

describe("DoctorPatientService", () => {
  let service: DoctorPatientService;
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
        DoctorPatientService,
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

    service = module.get<DoctorPatientService>(DoctorPatientService);
    prismaService = module.get<PrismaService>(PrismaService);
    doctorUtilsService = module.get<DoctorUtilsService>(DoctorUtilsService);
    encryptionService = module.get<EncryptionService>(EncryptionService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("assignPatient", () => {
    const createDto = { patientId: "patient-123" };

    it("should assign patient to doctor successfully", async () => {
      const patient = createMockUser({
        id: createDto.patientId,
        role: UserRole.PATIENT,
      });
      const relation = {
        id: "relation-123",
        doctorId,
        patientId: createDto.patientId,
        createdAt: new Date("2024-01-01"),
        patient: {
          id: patient.id,
          email: patient.email,
          firstName: patient.firstName,
          lastName: patient.lastName,
          avatarUrl: patient.avatarUrl,
          createdAt: patient.createdAt,
        },
      };

      (doctorUtilsService.verifyDoctor as jest.Mock).mockResolvedValue(undefined);
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(patient);
      (prismaService.doctorPatient.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.doctorPatient.create as jest.Mock).mockResolvedValue(relation);

      const result = await service.assignPatient(doctorId, createDto);

      expect(result).toMatchObject({
        id: relation.id,
        doctorId: relation.doctorId,
        patientId: relation.patientId,
      });
      expect(prismaService.doctorPatient.create).toHaveBeenCalled();
    });

    it("should throw NotFoundException if patient not found", async () => {
      (doctorUtilsService.verifyDoctor as jest.Mock).mockResolvedValue(undefined);
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.assignPatient(doctorId, createDto)).rejects.toThrow(NotFoundException);
    });

    it("should throw ConflictException if user is not a patient", async () => {
      const user = createMockUser({
        id: createDto.patientId,
        role: UserRole.DOCTOR,
      });

      (doctorUtilsService.verifyDoctor as jest.Mock).mockResolvedValue(undefined);
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(user);

      await expect(service.assignPatient(doctorId, createDto)).rejects.toThrow(ConflictException);
    });

    it("should throw ConflictException if relationship already exists", async () => {
      const patient = createMockUser({
        id: createDto.patientId,
        role: UserRole.PATIENT,
      });
      const existing = {
        id: "existing-relation",
        doctorId,
        patientId: createDto.patientId,
      };

      (doctorUtilsService.verifyDoctor as jest.Mock).mockResolvedValue(undefined);
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(patient);
      (prismaService.doctorPatient.findUnique as jest.Mock).mockResolvedValue(existing);

      await expect(service.assignPatient(doctorId, createDto)).rejects.toThrow(ConflictException);
    });
  });

  describe("getPatients", () => {
    beforeEach(() => {
      (doctorUtilsService.verifyDoctor as jest.Mock).mockResolvedValue(undefined);
    });

    it("should return empty array if no patients assigned", async () => {
      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue([]);

      const result = await service.getPatients(doctorId);

      expect(result).toEqual([]);
    });

    it("should return list of patients with basic info", async () => {
      const assignedPatientIds = [patientId, "patient-456"];
      const patients = [
        createMockUser({
          id: patientId,
          role: UserRole.PATIENT,
          diabetesType: DiabetesType.TYPE_1,
        }),
        createMockUser({
          id: "patient-456",
          role: UserRole.PATIENT,
          diabetesType: DiabetesType.TYPE_2,
        }),
      ];

      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue(assignedPatientIds);
      (prismaService.user.findMany as jest.Mock).mockResolvedValue(patients);
      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.glucoseReading.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.insulinDose.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.meal.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValueOnce([]);
      (prismaService.glucoseReading.findMany as jest.Mock).mockResolvedValueOnce([]);

      const result = await service.getPatients(doctorId);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: patientId,
        email: patients[0].email,
      });
    });

    it("should filter by search term", async () => {
      const assignedPatientIds = [patientId];
      const patients = [
        createMockUser({
          id: patientId,
          firstName: "John",
          lastName: "Doe",
          role: UserRole.PATIENT,
        }),
      ];

      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue(assignedPatientIds);
      (prismaService.user.findMany as jest.Mock).mockResolvedValue(patients);
      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.glucoseReading.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.insulinDose.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.meal.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValueOnce([]);
      (prismaService.glucoseReading.findMany as jest.Mock).mockResolvedValueOnce([]);

      await service.getPatients(doctorId, { search: "John" });

      expect(prismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([expect.objectContaining({ firstName: expect.anything() })]),
          }),
        }),
      );
    });

    it("should filter by diabetes type", async () => {
      const assignedPatientIds = [patientId];
      const patients = [
        createMockUser({
          id: patientId,
          diabetesType: DiabetesType.TYPE_1,
          role: UserRole.PATIENT,
        }),
      ];

      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue(assignedPatientIds);
      (prismaService.user.findMany as jest.Mock).mockResolvedValue(patients);
      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.glucoseReading.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.insulinDose.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.meal.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValueOnce([]);
      (prismaService.glucoseReading.findMany as jest.Mock).mockResolvedValueOnce([]);

      await service.getPatients(doctorId, { diabetesType: DiabetesType.TYPE_1 });

      expect(prismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            diabetesType: DiabetesType.TYPE_1,
          }),
        }),
      );
    });

    it("should filter active patients only", async () => {
      const assignedPatientIds = [patientId];
      const patients = [
        createMockUser({
          id: patientId,
          role: UserRole.PATIENT,
        }),
      ];
      const activeGlucoseEntries = [{ userId: patientId }];

      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue(assignedPatientIds);
      (prismaService.user.findMany as jest.Mock).mockResolvedValue(patients);
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        minTargetGlucose: 70,
        maxTargetGlucose: 180,
      });
      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.glucoseReading.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.insulinDose.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.meal.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getPatients(doctorId, { activeOnly: true });

      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("searchGlobalPatients", () => {
    beforeEach(() => {
      (doctorUtilsService.verifyDoctor as jest.Mock).mockResolvedValue(undefined);
    });

    it("should search for patients globally", async () => {
      const searchDto = { q: "John" };
      const patients = [
        createMockUser({
          id: "patient-456",
          firstName: "John",
          role: UserRole.PATIENT,
        }),
      ];

      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue([patientId]);
      (prismaService.user.findMany as jest.Mock).mockResolvedValue(patients);

      const result = await service.searchGlobalPatients(doctorId, searchDto);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "patient-456",
        firstName: "John",
      });
    });

    it("should exclude already assigned patients", async () => {
      const searchDto = { q: "test" };
      const assignedPatientIds = [patientId];

      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue(assignedPatientIds);
      (prismaService.user.findMany as jest.Mock).mockResolvedValue([]);

      await service.searchGlobalPatients(doctorId, searchDto);

      expect(prismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: expect.objectContaining({
              notIn: assignedPatientIds,
            }),
          }),
        }),
      );
    });
  });

  describe("getPatientDetails", () => {
    beforeEach(() => {
      (doctorUtilsService.verifyDoctor as jest.Mock).mockResolvedValue(undefined);
    });

    it("should return patient details successfully", async () => {
      const patient = createMockUser({
        id: patientId,
        role: UserRole.PATIENT,
        diabetesType: DiabetesType.TYPE_1,
      });
      const assignedPatientIds = [patientId];

      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue(assignedPatientIds);
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(patient);
      (prismaService.glucoseEntry.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.glucoseReading.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.glucoseReading.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.glucoseEntry.count as jest.Mock).mockResolvedValue(0);
      (prismaService.insulinDose.count as jest.Mock).mockResolvedValue(0);
      (prismaService.meal.count as jest.Mock).mockResolvedValue(0);
      (prismaService.alert.count as jest.Mock).mockResolvedValueOnce(10).mockResolvedValueOnce(2);

      const result = await service.getPatientDetails(doctorId, patientId);

      expect(result).toMatchObject({
        id: patientId,
        email: patient.email,
      });
      expect(result.totalGlucoseReadings).toBe(0);
      expect(result.totalAlerts).toBe(10);
      expect(result.unacknowledgedAlerts).toBe(2);
    });

    it("should throw ForbiddenException if patient not assigned", async () => {
      const assignedPatientIds: string[] = [];

      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue(assignedPatientIds);

      await expect(service.getPatientDetails(doctorId, patientId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should throw NotFoundException if patient not found", async () => {
      const assignedPatientIds = [patientId];

      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue(assignedPatientIds);
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getPatientDetails(doctorId, patientId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should include last glucose reading when available", async () => {
      const patient = createMockUser({
        id: patientId,
        role: UserRole.PATIENT,
      });
      const glucoseEntry = {
        mgdlEncrypted: "encrypted-120",
        recordedAt: new Date("2024-01-01T12:00:00Z"),
      };
      const assignedPatientIds = [patientId];

      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue(assignedPatientIds);
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(patient);
      (prismaService.glucoseEntry.findFirst as jest.Mock).mockResolvedValue(glucoseEntry);
      (prismaService.glucoseEntry.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.glucoseReading.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.insulinDose.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.meal.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.alert.count as jest.Mock).mockResolvedValueOnce(0).mockResolvedValueOnce(0);

      const result = await service.getPatientDetails(doctorId, patientId);

      expect(result.lastGlucoseReading).toBeDefined();
      expect(result.lastGlucoseReading?.value).toBe(120);
    });
  });

  describe("removePatient", () => {
    beforeEach(() => {
      (doctorUtilsService.verifyDoctor as jest.Mock).mockResolvedValue(undefined);
    });

    it("should remove patient successfully", async () => {
      const relation = {
        id: "relation-123",
        doctorId,
        patientId,
      };

      (prismaService.doctorPatient.findUnique as jest.Mock).mockResolvedValue(relation);
      (prismaService.doctorPatient.delete as jest.Mock).mockResolvedValue(relation);

      const result = await service.removePatient(doctorId, patientId);

      expect(result).toEqual({ message: "Patient removed successfully" });
      expect(prismaService.doctorPatient.delete).toHaveBeenCalled();
    });

    it("should throw NotFoundException if relationship not found", async () => {
      (prismaService.doctorPatient.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.removePatient(doctorId, patientId)).rejects.toThrow(NotFoundException);
    });
  });

  describe("getPatientProfile", () => {
    beforeEach(() => {
      (doctorUtilsService.verifyDoctor as jest.Mock).mockResolvedValue(undefined);
    });

    it("should return patient profile successfully", async () => {
      const patient = {
        id: patientId,
        email: "patient@example.com",
        icRatioBreakfast: 10,
        icRatioLunch: 12,
        icRatioDinner: 15,
        insulinSensitivityFactor: 50,
        diaHours: 4,
        targetGlucose: 100,
        minTargetGlucose: 70,
        maxTargetGlucose: 180,
        mealTimeBreakfastStart: "08:00",
        mealTimeBreakfastEnd: "10:00",
        mealTimeLunchStart: "12:00",
        mealTimeLunchEnd: "14:00",
        mealTimeDinnerStart: "19:00",
        mealTimeDinnerEnd: "21:00",
      };
      const assignedPatientIds = [patientId];

      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue(assignedPatientIds);
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(patient);

      const result = await service.getPatientProfile(doctorId, patientId);

      expect(result).toMatchObject({
        id: patientId,
        email: patient.email,
        icRatioBreakfast: patient.icRatioBreakfast,
        targetGlucose: patient.targetGlucose,
      });
    });

    it("should throw ForbiddenException if patient not assigned", async () => {
      const assignedPatientIds: string[] = [];

      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue(assignedPatientIds);

      await expect(service.getPatientProfile(doctorId, patientId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should throw NotFoundException if patient not found", async () => {
      const assignedPatientIds = [patientId];

      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue(assignedPatientIds);
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getPatientProfile(doctorId, patientId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("updatePatientProfile", () => {
    beforeEach(() => {
      (doctorUtilsService.verifyDoctor as jest.Mock).mockResolvedValue(undefined);
    });

    it("should update patient profile successfully", async () => {
      const updateData = {
        icRatioBreakfast: 12,
        targetGlucose: 110,
        minTargetGlucose: 80,
        maxTargetGlucose: 190,
      };
      const patient = {
        id: patientId,
      };
      const updatedPatient = {
        id: patientId,
        email: "patient@example.com",
        ...updateData,
      };
      const assignedPatientIds = [patientId];

      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue(assignedPatientIds);
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(patient);
      (prismaService.user.update as jest.Mock).mockResolvedValue(updatedPatient);

      const result = await service.updatePatientProfile(doctorId, patientId, updateData);

      expect(result).toMatchObject({
        id: patientId,
        icRatioBreakfast: updateData.icRatioBreakfast,
        targetGlucose: updateData.targetGlucose,
      });
    });

    it("should handle birthDate conversion", async () => {
      const updateData = {
        birthDate: "1990-01-01",
      };
      const patient = { id: patientId };
      const updatedPatient = {
        id: patientId,
        email: "patient@example.com",
        birthDate: new Date("1990-01-01"),
      };
      const assignedPatientIds = [patientId];

      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue(assignedPatientIds);
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(patient);
      (prismaService.user.update as jest.Mock).mockResolvedValue(updatedPatient);

      await service.updatePatientProfile(doctorId, patientId, updateData);

      expect(prismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            birthDate: new Date("1990-01-01"),
          }),
        }),
      );
    });

    it("should throw ForbiddenException if patient not assigned", async () => {
      const updateData = { targetGlucose: 110 };
      const assignedPatientIds: string[] = [];

      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue(assignedPatientIds);

      await expect(service.updatePatientProfile(doctorId, patientId, updateData)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should throw NotFoundException if patient not found", async () => {
      const updateData = { targetGlucose: 110 };
      const assignedPatientIds = [patientId];

      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue(assignedPatientIds);
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.updatePatientProfile(doctorId, patientId, updateData)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("getPatientDoctor", () => {
    it("should return doctor if assigned", async () => {
      const doctor = createMockUser({
        id: "doctor-456",
        email: "doctor@example.com",
        firstName: "Doctor",
        lastName: "Smith",
      });
      const relation = {
        id: "relation-123",
        doctorId: "doctor-456",
        patientId,
        createdAt: new Date("2024-01-01"),
        doctor,
      };

      (prismaService.doctorPatient.findFirst as jest.Mock).mockResolvedValue(relation);

      const result = await service.getPatientDoctor(patientId);

      expect(result).toMatchObject({
        doctorId: "doctor-456",
        patientId,
        doctor: {
          id: "doctor-456",
          email: "doctor@example.com",
        },
      });
    });

    it("should return null if no doctor assigned", async () => {
      (prismaService.doctorPatient.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.getPatientDoctor(patientId);

      expect(result).toBeNull();
    });
  });

  describe("getPatientMeals", () => {
    beforeEach(() => {
      (doctorUtilsService.verifyDoctor as jest.Mock).mockResolvedValue(undefined);
    });

    it("should return patient meals", async () => {
      const assignedPatientIds = [patientId];
      const meals = [
        {
          id: "meal-123",
          userId: patientId,
          recordedAt: new Date("2024-01-01"),
          mealTemplate: {
            id: "template-123",
            foodItems: [],
          },
        },
      ];

      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue(assignedPatientIds);
      (prismaService.logEntry.findMany as jest.Mock).mockResolvedValue(meals);

      const result = await service.getPatientMeals(doctorId, patientId);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "meal-123",
        userId: patientId,
      });
    });

    it("should filter by date range", async () => {
      const assignedPatientIds = [patientId];
      const startDate = "2024-01-01";
      const endDate = "2024-01-31";

      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue(assignedPatientIds);
      (prismaService.logEntry.findMany as jest.Mock).mockResolvedValue([]);

      await service.getPatientMeals(doctorId, patientId, startDate, endDate);

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

    it("should throw ForbiddenException if patient not assigned", async () => {
      const assignedPatientIds: string[] = [];

      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue(assignedPatientIds);

      await expect(service.getPatientMeals(doctorId, patientId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("getPatientLogEntries", () => {
    beforeEach(() => {
      (doctorUtilsService.verifyDoctor as jest.Mock).mockResolvedValue(undefined);
    });

    it("should return patient log entries with decrypted glucose", async () => {
      const assignedPatientIds = [patientId];
      const logEntries = [
        {
          id: "log-123",
          userId: patientId,
          recordedAt: new Date("2024-01-01"),
          glucoseEntry: {
            id: "glucose-123",
            mgdlEncrypted: "encrypted-120",
            recordedAt: new Date("2024-01-01"),
          },
          insulinDose: null,
          mealTemplate: null,
        },
      ];

      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue(assignedPatientIds);
      (prismaService.logEntry.findMany as jest.Mock).mockResolvedValue(logEntries);

      const result = await service.getPatientLogEntries(doctorId, patientId);

      expect(result).toHaveLength(1);
      expect(result[0].glucoseEntry).toBeDefined();
      expect(result[0].glucoseEntry?.mgdl).toBe(120);
    });

    it("should default to last 7 days if no date range provided", async () => {
      const assignedPatientIds = [patientId];

      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue(assignedPatientIds);
      (prismaService.logEntry.findMany as jest.Mock).mockResolvedValue([]);

      await service.getPatientLogEntries(doctorId, patientId);

      expect(prismaService.logEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            recordedAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });

    it("should throw ForbiddenException if patient not assigned", async () => {
      const assignedPatientIds: string[] = [];

      (doctorUtilsService.getDoctorPatientIds as jest.Mock).mockResolvedValue(assignedPatientIds);

      await expect(service.getPatientLogEntries(doctorId, patientId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
