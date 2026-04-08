import { Test, TestingModule } from "@nestjs/testing";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { AppointmentModality, AppointmentStatus, UserRole } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AppointmentsService } from "./appointments.service";
import { DoctorUtilsService } from "../../common/services/doctor-utils.service";
import { createMockPrismaService } from "../../common/test-helpers/prisma.mock";
import { CreateAppointmentDto } from "./dto/create-appointment.dto";
import { UpdateAppointmentDto } from "./dto/update-appointment.dto";
import { RealtimeNotificationsService } from "../notifications/realtime-notifications.service";
import { NotificationsService } from "../notifications/notifications.service";

describe("AppointmentsService", () => {
  let service: AppointmentsService;
  let prismaService: PrismaService;
  let doctorUtilsService: DoctorUtilsService;
  let realtimeNotificationsService: RealtimeNotificationsService;
  let notificationsService: NotificationsService;

  const doctorId = "doctor-123";
  const patientId = "patient-123";

  const createAppointmentRecord = (overrides?: Partial<any>) => ({
    id: "apt-1",
    doctorId,
    patientId,
    scheduledAt: new Date("2027-12-31T10:00:00.000Z"),
    notes: "Test appointment",
    status: AppointmentStatus.SCHEDULED,
    modality: AppointmentModality.IN_PERSON,
    location: "Consultorio 4",
    meetingUrl: null,
    reminderSentAt: null,
    createdAt: new Date("2026-01-01T10:00:00.000Z"),
    updatedAt: new Date("2026-01-01T10:00:00.000Z"),
    patient: {
      id: patientId,
      email: "patient@example.com",
      firstName: "Patient",
      lastName: "One",
    },
    doctor: {
      id: doctorId,
      email: "doctor@example.com",
      firstName: "Doctor",
      lastName: "One",
      timezone: "America/Argentina/Cordoba",
    },
    ...overrides,
  });

  beforeEach(async () => {
    const mockPrisma = createMockPrismaService();
    const mockDoctorUtilsService = {
      verifyDoctor: jest.fn().mockResolvedValue(undefined),
      getDoctorPatientIds: jest.fn().mockResolvedValue([patientId]),
    };
    const mockRealtimeNotificationsService = {
      emitToUser: jest.fn(),
    };
    const mockNotificationsService = {
      sendToUser: jest.fn(),
      createAppointmentPayload: jest.fn().mockImplementation((input) => input),
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
          provide: RealtimeNotificationsService,
          useValue: mockRealtimeNotificationsService,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
    prismaService = module.get<PrismaService>(PrismaService);
    doctorUtilsService = module.get<DoctorUtilsService>(DoctorUtilsService);
    realtimeNotificationsService = module.get<RealtimeNotificationsService>(
      RealtimeNotificationsService,
    );
    notificationsService = module.get<NotificationsService>(NotificationsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("processDueReminders", () => {
    it("creates alerts, emits events and marks reminders as sent", async () => {
      const reminderAppointment = createAppointmentRecord({
        reminderSentAt: null,
        status: AppointmentStatus.CONFIRMED,
      });

      (prismaService.appointment.findMany as jest.Mock).mockResolvedValue([reminderAppointment]);
      (prismaService.alertSettings.findUnique as jest.Mock).mockResolvedValue({
        notificationChannels: { dashboard: true, email: true, push: false },
        quietHoursEnabled: false,
      });
      (prismaService.alert.create as jest.Mock).mockResolvedValue({ id: "alert-1" });
      (prismaService.appointment.update as jest.Mock).mockResolvedValue(reminderAppointment);

      await service.processDueReminders();

      expect(prismaService.alert.create).toHaveBeenCalled();
      expect(realtimeNotificationsService.emitToUser).toHaveBeenCalledWith(
        patientId,
        "appointment:reminder",
        expect.objectContaining({
          appointmentId: reminderAppointment.id,
          message: expect.stringContaining("Recordatorio de cita"),
        }),
      );
      expect(notificationsService.sendToUser).toHaveBeenCalled();
      expect(prismaService.appointment.update).toHaveBeenCalledWith({
        where: { id: reminderAppointment.id },
        data: { reminderSentAt: expect.any(Date) },
      });
    });

    it("defers reminders during quiet hours without sending or marking them", async () => {
      const reminderAppointment = createAppointmentRecord({
        reminderSentAt: null,
        status: AppointmentStatus.SCHEDULED,
      });

      jest.spyOn<any, any>(service as any, "isInQuietHours").mockReturnValue(true);
      (prismaService.appointment.findMany as jest.Mock).mockResolvedValue([reminderAppointment]);
      (prismaService.alertSettings.findUnique as jest.Mock).mockResolvedValue({
        notificationChannels: { dashboard: true, email: false, push: false },
        quietHoursEnabled: true,
        quietHoursStart: "22:00",
        quietHoursEnd: "07:00",
      });

      await service.processDueReminders();

      expect(prismaService.alert.create).not.toHaveBeenCalled();
      expect(realtimeNotificationsService.emitToUser).not.toHaveBeenCalled();
      expect(notificationsService.sendToUser).not.toHaveBeenCalled();
      expect(prismaService.appointment.update).not.toHaveBeenCalled();
    });
  });

  describe("findAll", () => {
    beforeEach(() => {
      (doctorUtilsService.verifyDoctor as jest.Mock).mockResolvedValue(undefined);
    });

    it("should return appointments for doctor", async () => {
      (prismaService.appointment.findMany as jest.Mock).mockResolvedValue([
        createAppointmentRecord(),
      ]);

      const result = await service.findAll(doctorId, {});

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "apt-1",
        doctorId,
        patientId,
      });
    });

    it("should filter past appointments when includePast is false", async () => {
      (prismaService.appointment.findMany as jest.Mock).mockResolvedValue([]);

      await service.findAll(doctorId, {});

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

    it("should apply doctor filters", async () => {
      (prismaService.appointment.findMany as jest.Mock).mockResolvedValue([]);

      await service.findAll(doctorId, {
        includePast: true,
        patientId,
        status: "CONFIRMED",
        from: "2026-03-01T00:00:00.000Z",
        to: "2026-03-30T23:59:59.999Z",
      });

      expect(prismaService.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            doctorId,
            patientId,
            status: "CONFIRMED",
            scheduledAt: expect.objectContaining({
              gte: new Date("2026-03-01T00:00:00.000Z"),
              lte: new Date("2026-03-30T23:59:59.999Z"),
            }),
          }),
        }),
      );
    });

    it("should reject invalid date ranges", async () => {
      await expect(
        service.findAll(doctorId, {
          from: "2026-03-30T23:59:59.999Z",
          to: "2026-03-01T00:00:00.000Z",
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("create", () => {
    beforeEach(() => {
      (doctorUtilsService.verifyDoctor as jest.Mock).mockResolvedValue(undefined);
      (prismaService.doctorPatient.findUnique as jest.Mock).mockResolvedValue({
        id: "relation-123",
        doctorId,
        patientId,
      });
      (prismaService.appointment.findFirst as jest.Mock).mockResolvedValue(null);
    });

    it("should create appointment successfully", async () => {
      const createDto: CreateAppointmentDto = {
        patientId,
        scheduledAt: new Date("2027-12-31T10:00:00.000Z").toISOString(),
        notes: "Test appointment",
      };

      (prismaService.appointment.create as jest.Mock).mockResolvedValue(createAppointmentRecord());

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
        scheduledAt: new Date("2027-12-31T10:00:00.000Z").toISOString(),
      };

      (prismaService.doctorPatient.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.create(doctorId, createDto)).rejects.toThrow(NotFoundException);
    });

    it("should reject appointments in the past", async () => {
      await expect(
        service.create(doctorId, {
          patientId,
          scheduledAt: new Date("2020-01-01T10:00:00.000Z").toISOString(),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should reject overlapping appointments", async () => {
      (prismaService.appointment.findFirst as jest.Mock).mockResolvedValue({ id: "apt-overlap" });

      await expect(
        service.create(doctorId, {
          patientId,
          scheduledAt: new Date("2027-12-31T10:00:00.000Z").toISOString(),
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("update", () => {
    beforeEach(() => {
      (doctorUtilsService.verifyDoctor as jest.Mock).mockResolvedValue(undefined);
      (prismaService.appointment.findFirst as jest.Mock).mockResolvedValue(null);
    });

    it("should update appointment successfully", async () => {
      const appointmentId = "apt-1";
      const updateDto: UpdateAppointmentDto = {
        scheduledAt: new Date("2027-12-31T11:00:00.000Z").toISOString(),
        notes: "Updated notes",
        status: AppointmentStatus.CONFIRMED,
      };
      const existingAppointment = createAppointmentRecord({
        id: appointmentId,
        status: AppointmentStatus.SCHEDULED,
      });
      const updatedAppointment = createAppointmentRecord({
        id: appointmentId,
        scheduledAt: new Date(updateDto.scheduledAt!),
        notes: "Updated notes",
        status: AppointmentStatus.CONFIRMED,
      });

      (prismaService.appointment.findUnique as jest.Mock).mockResolvedValue(existingAppointment);
      (prismaService.appointment.update as jest.Mock).mockResolvedValue(updatedAppointment);

      const result = await service.update(doctorId, appointmentId, updateDto);

      expect(result).toMatchObject({
        id: appointmentId,
        status: AppointmentStatus.CONFIRMED,
      });
      expect(prismaService.appointment.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { not: appointmentId },
          }),
        }),
      );
    });

    it("should throw NotFoundException if appointment not found", async () => {
      const appointmentId = "apt-1";
      const updateDto: UpdateAppointmentDto = {};

      (prismaService.appointment.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.update(doctorId, appointmentId, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw ForbiddenException if appointment does not belong to doctor", async () => {
      const appointmentId = "apt-1";
      const updateDto: UpdateAppointmentDto = {};
      const existingAppointment = createAppointmentRecord({
        id: appointmentId,
        doctorId: "other-doctor",
      });

      (prismaService.appointment.findUnique as jest.Mock).mockResolvedValue(existingAppointment);

      await expect(service.update(doctorId, appointmentId, updateDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should reject updates on finalized appointments", async () => {
      (prismaService.appointment.findUnique as jest.Mock).mockResolvedValue(
        createAppointmentRecord({
          status: "COMPLETED",
        }),
      );

      await expect(service.update(doctorId, "apt-1", {})).rejects.toThrow(BadRequestException);
    });

    it("should allow notes-only updates on finalized appointments", async () => {
      const existingAppointment = createAppointmentRecord({
        status: AppointmentStatus.COMPLETED,
        notes: "Nota original",
      });
      const updatedAppointment = createAppointmentRecord({
        status: AppointmentStatus.COMPLETED,
        notes: "Nota actualizada",
      });

      (prismaService.appointment.findUnique as jest.Mock).mockResolvedValue(existingAppointment);
      (prismaService.appointment.update as jest.Mock).mockResolvedValue(updatedAppointment);

      const result = await service.update(doctorId, "apt-1", {
        notes: "Nota actualizada",
      });

      expect(result.status).toBe(AppointmentStatus.COMPLETED);
      expect(result.notes).toBe("Nota actualizada");
      expect(prismaService.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: AppointmentStatus.COMPLETED,
            scheduledAt: existingAppointment.scheduledAt,
            modality: existingAppointment.modality,
          }),
        }),
      );
    });

    it("should reject rescheduling to the past", async () => {
      (prismaService.appointment.findUnique as jest.Mock).mockResolvedValue(
        createAppointmentRecord(),
      );

      await expect(
        service.update(doctorId, "apt-1", {
          scheduledAt: new Date("2020-01-01T10:00:00.000Z").toISOString(),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should reset confirmed appointments to scheduled when logistics change", async () => {
      const existingAppointment = createAppointmentRecord({
        status: AppointmentStatus.CONFIRMED,
        modality: AppointmentModality.VIRTUAL,
        location: null,
        meetingUrl: "https://meet.example.com/original",
      });
      const updatedAppointment = createAppointmentRecord({
        status: AppointmentStatus.SCHEDULED,
        modality: AppointmentModality.VIRTUAL,
        location: null,
        meetingUrl: "https://meet.example.com/new",
      });

      (prismaService.appointment.findUnique as jest.Mock).mockResolvedValue(existingAppointment);
      (prismaService.appointment.update as jest.Mock).mockResolvedValue(updatedAppointment);

      const result = await service.update(doctorId, "apt-1", {
        status: AppointmentStatus.CONFIRMED,
        meetingUrl: "https://meet.example.com/new",
      });

      expect(result.status).toBe(AppointmentStatus.SCHEDULED);
      expect(prismaService.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: AppointmentStatus.SCHEDULED,
            reminderSentAt: null,
          }),
        }),
      );
    });

    it("should keep confirmed appointments confirmed when only notes change", async () => {
      const existingAppointment = createAppointmentRecord({
        status: AppointmentStatus.CONFIRMED,
      });
      const updatedAppointment = createAppointmentRecord({
        status: AppointmentStatus.CONFIRMED,
        notes: "Solo notas nuevas",
      });

      (prismaService.appointment.findUnique as jest.Mock).mockResolvedValue(existingAppointment);
      (prismaService.appointment.update as jest.Mock).mockResolvedValue(updatedAppointment);

      const result = await service.update(doctorId, "apt-1", {
        notes: "Solo notas nuevas",
      });

      expect(result.status).toBe(AppointmentStatus.CONFIRMED);
    });
  });

  describe("remove", () => {
    beforeEach(() => {
      (doctorUtilsService.verifyDoctor as jest.Mock).mockResolvedValue(undefined);
    });

    it("should delete appointment successfully", async () => {
      (prismaService.appointment.findUnique as jest.Mock).mockResolvedValue(
        createAppointmentRecord(),
      );
      (prismaService.appointment.delete as jest.Mock).mockResolvedValue(createAppointmentRecord());

      const result = await service.remove(doctorId, "apt-1");

      expect(result).toEqual({ message: "Appointment deleted successfully" });
      expect(prismaService.appointment.delete).toHaveBeenCalled();
    });

    it("should reject deletion of finalized appointments", async () => {
      (prismaService.appointment.findUnique as jest.Mock).mockResolvedValue(
        createAppointmentRecord({
          status: "CANCELLED",
        }),
      );

      await expect(service.remove(doctorId, "apt-1")).rejects.toThrow(BadRequestException);
    });
  });

  describe("findMine", () => {
    it("should return appointments for patient", async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({ role: UserRole.PATIENT });
      (prismaService.appointment.findMany as jest.Mock).mockResolvedValue([
        createAppointmentRecord(),
      ]);

      const result = await service.findMine(patientId, true);

      expect(result).toHaveLength(1);
      expect(prismaService.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            patientId,
          }),
        }),
      );
    });

    it("should reject non-patient users", async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({ role: UserRole.DOCTOR });

      await expect(service.findMine(patientId)).rejects.toThrow(ForbiddenException);
    });
  });

  describe("confirm", () => {
    it("should confirm a scheduled appointment", async () => {
      (prismaService.appointment.findUnique as jest.Mock).mockResolvedValue(
        createAppointmentRecord({
          status: "SCHEDULED",
        }),
      );
      (prismaService.appointment.update as jest.Mock).mockResolvedValue(
        createAppointmentRecord({
          status: "CONFIRMED",
        }),
      );

      const result = await service.confirm(patientId, "apt-1");

      expect(result.status).toBe("CONFIRMED");
    });

    it("should reject confirmation on invalid status", async () => {
      (prismaService.appointment.findUnique as jest.Mock).mockResolvedValue(
        createAppointmentRecord({
          status: "CONFIRMED",
        }),
      );

      await expect(service.confirm(patientId, "apt-1")).rejects.toThrow(BadRequestException);
    });

    it("should reject access to foreign appointment", async () => {
      (prismaService.appointment.findUnique as jest.Mock).mockResolvedValue(
        createAppointmentRecord({
          patientId: "patient-999",
        }),
      );

      await expect(service.confirm(patientId, "apt-1")).rejects.toThrow(ForbiddenException);
    });
  });

  describe("cancel", () => {
    it("should cancel an active appointment", async () => {
      (prismaService.appointment.findUnique as jest.Mock).mockResolvedValue(
        createAppointmentRecord({
          status: "CONFIRMED",
        }),
      );
      (prismaService.appointment.update as jest.Mock).mockResolvedValue(
        createAppointmentRecord({
          status: "CANCELLED",
        }),
      );

      const result = await service.cancel(patientId, "apt-1");

      expect(result.status).toBe("CANCELLED");
    });

    it("should reject cancellation on finalized status", async () => {
      (prismaService.appointment.findUnique as jest.Mock).mockResolvedValue(
        createAppointmentRecord({
          status: "COMPLETED",
        }),
      );

      await expect(service.cancel(patientId, "apt-1")).rejects.toThrow(BadRequestException);
    });
  });
});
