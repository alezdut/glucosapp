import { Test, TestingModule } from "@nestjs/testing";
import { ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { DoctorUtilsService } from "./doctor-utils.service";
import { createMockPrismaService } from "../test-helpers/prisma.mock";
import { createMockUser } from "../test-helpers/fixtures";
import { UserRole } from "@prisma/client";

describe("DoctorUtilsService", () => {
  let service: DoctorUtilsService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const mockPrisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DoctorUtilsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<DoctorUtilsService>(DoctorUtilsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("verifyDoctor", () => {
    it("should not throw if user is a doctor", async () => {
      const doctor = createMockUser({
        id: "doctor-123",
        role: UserRole.DOCTOR,
      });

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(doctor);

      await expect(service.verifyDoctor(doctor.id)).resolves.not.toThrow();
    });

    it("should throw ForbiddenException if user is not a doctor", async () => {
      const patient = createMockUser({
        id: "patient-123",
        role: UserRole.PATIENT,
      });

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(patient);

      await expect(service.verifyDoctor(patient.id)).rejects.toThrow(ForbiddenException);
    });

    it("should throw ForbiddenException if user not found", async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.verifyDoctor("non-existent-id")).rejects.toThrow(ForbiddenException);
    });
  });

  describe("getDoctorPatientIds", () => {
    it("should return patient IDs for a doctor", async () => {
      const doctorId = "doctor-123";
      const relations = [
        { patientId: "patient-1" },
        { patientId: "patient-2" },
        { patientId: "patient-3" },
      ];

      (prismaService.doctorPatient.findMany as jest.Mock).mockResolvedValue(relations);

      const result = await service.getDoctorPatientIds(doctorId);

      expect(result).toEqual(["patient-1", "patient-2", "patient-3"]);
      expect(prismaService.doctorPatient.findMany).toHaveBeenCalledWith({
        where: { doctorId },
        select: { patientId: true },
      });
    });

    it("should return empty array if doctor has no patients", async () => {
      const doctorId = "doctor-123";

      (prismaService.doctorPatient.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getDoctorPatientIds(doctorId);

      expect(result).toEqual([]);
    });
  });
});
