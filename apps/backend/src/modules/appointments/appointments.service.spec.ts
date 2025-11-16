import { Test, TestingModule } from "@nestjs/testing";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AppointmentsService } from "./appointments.service";
import { DoctorUtilsService } from "../../common/services/doctor-utils.service";
import { createMockPrismaService } from "../../common/test-helpers/prisma.mock";
import { createMockConfigService } from "../../common/test-helpers/config.mock";
import { CreateAppointmentDto } from "./dto/create-appointment.dto";
import { UpdateAppointmentDto } from "./dto/update-appointment.dto";

describe("AppointmentsService", () => {
  let service: AppointmentsService;
  let prismaService: PrismaService;
  let doctorUtilsService: DoctorUtilsService;

  const doctorId = "doctor-123";
  const patientId = "patient-123";

  beforeEach(async () => {
    const mockPrisma = createMockPrismaService();
    const mockConfig = createMockConfigService();
    const mockDoctorUtilsService = {
      verifyDoctor: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: DoctorUtilsService,
          useValue: mockDoctorUtilsService,
        },
        {
          provide: "ConfigService",
          useValue: mockConfig,
        },
      ],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
    prismaService = module.get<PrismaService>(PrismaService);
    doctorUtilsService = module.get<DoctorUtilsService>(DoctorUtilsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findAll", () => {
    beforeEach(() => {
      (doctorUtilsService.verifyDoctor as jest.Mock).mockResolvedValue(undefined);
    });

    it("should return appointments for doctor", async () => {
      const appointments = [
        {
          id: "apt-1",
          doctorId,
          patientId,
          scheduledAt: new Date("2024-12-31"),
          notes: "Test appointment",
          status: "SCHEDULED",
          createdAt: new Date(),
          updatedAt: new Date(),
          patient: {
            id: patientId,
            email: "patient@example.com",
            firstName: "Patient",
            lastName: "One",
          },
        },
      ];

      (prismaService.appointment.findMany as jest.Mock).mockResolvedValue(appointments);

      const result = await service.findAll(doctorId, false);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "apt-1",
        doctorId,
        patientId,
      });
    });

    it("should filter past appointments when includePast is false", async () => {
      (prismaService.appointment.findMany as jest.Mock).mockResolvedValue([]);

      await service.findAll(doctorId, false);

      expect(prismaService.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            scheduledAt: expect.objectContaining({
              gte: expect.any(Date),
            }),
          }),
        }),
      );
    });
  });

  describe("create", () => {
    beforeEach(() => {
      (doctorUtilsService.verifyDoctor as jest.Mock).mockResolvedValue(undefined);
    });

    it("should create appointment successfully", async () => {
      const createDto: CreateAppointmentDto = {
        patientId,
        scheduledAt: new Date("2024-12-31").toISOString(),
        notes: "Test appointment",
      };
      const relation = {
        id: "relation-123",
        doctorId,
        patientId,
      };
      const appointment = {
        id: "apt-1",
        doctorId,
        patientId,
        scheduledAt: new Date(createDto.scheduledAt),
        notes: createDto.notes,
        status: "SCHEDULED",
        createdAt: new Date(),
        updatedAt: new Date(),
        patient: {
          id: patientId,
          email: "patient@example.com",
          firstName: "Patient",
          lastName: "One",
        },
      };

      (prismaService.doctorPatient.findUnique as jest.Mock).mockResolvedValue(relation);
      (prismaService.appointment.create as jest.Mock).mockResolvedValue(appointment);

      const result = await service.create(doctorId, createDto);

      expect(result).toMatchObject({
        id: "apt-1",
        doctorId,
        patientId,
      });
    });

    it("should throw NotFoundException if patient not assigned", async () => {
      const createDto: CreateAppointmentDto = {
        patientId,
        scheduledAt: new Date("2024-12-31").toISOString(),
      };

      (prismaService.doctorPatient.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.create(doctorId, createDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe("update", () => {
    beforeEach(() => {
      (doctorUtilsService.verifyDoctor as jest.Mock).mockResolvedValue(undefined);
    });

    it("should update appointment successfully", async () => {
      const appointmentId = "apt-1";
      const updateDto: UpdateAppointmentDto = {
        scheduledAt: new Date("2025-01-01").toISOString(),
        notes: "Updated notes",
        status: "CONFIRMED",
      };
      const existingAppointment = {
        id: appointmentId,
        doctorId,
        patientId,
        scheduledAt: new Date("2024-12-31"),
        notes: "Old notes",
        status: "SCHEDULED",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const updatedAppointment = {
        ...existingAppointment,
        ...updateDto,
        scheduledAt: new Date(updateDto.scheduledAt!),
        patient: {
          id: patientId,
          email: "patient@example.com",
          firstName: "Patient",
          lastName: "One",
        },
      };

      (prismaService.appointment.findUnique as jest.Mock).mockResolvedValue(existingAppointment);
      (prismaService.appointment.update as jest.Mock).mockResolvedValue(updatedAppointment);

      const result = await service.update(doctorId, appointmentId, updateDto);

      expect(result).toMatchObject({
        id: appointmentId,
        status: "CONFIRMED",
      });
    });

    it("should throw NotFoundException if appointment not found", async () => {
      const appointmentId = "apt-1";
      const updateDto: UpdateAppointmentDto = {};

      (prismaService.appointment.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.update(doctorId, appointmentId, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw ForbiddenException if appointment not belongs to doctor", async () => {
      const appointmentId = "apt-1";
      const updateDto: UpdateAppointmentDto = {};
      const existingAppointment = {
        id: appointmentId,
        doctorId: "other-doctor",
        patientId,
        scheduledAt: new Date("2024-12-31"),
        notes: "Test",
        status: "SCHEDULED",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prismaService.appointment.findUnique as jest.Mock).mockResolvedValue(existingAppointment);

      await expect(service.update(doctorId, appointmentId, updateDto)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("remove", () => {
    beforeEach(() => {
      (doctorUtilsService.verifyDoctor as jest.Mock).mockResolvedValue(undefined);
    });

    it("should delete appointment successfully", async () => {
      const appointmentId = "apt-1";
      const existingAppointment = {
        id: appointmentId,
        doctorId,
        patientId,
        scheduledAt: new Date("2024-12-31"),
        notes: "Test",
        status: "SCHEDULED",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prismaService.appointment.findUnique as jest.Mock).mockResolvedValue(existingAppointment);
      (prismaService.appointment.delete as jest.Mock).mockResolvedValue(existingAppointment);

      const result = await service.remove(doctorId, appointmentId);

      expect(result).toEqual({ message: "Appointment deleted successfully" });
      expect(prismaService.appointment.delete).toHaveBeenCalled();
    });
  });
});
