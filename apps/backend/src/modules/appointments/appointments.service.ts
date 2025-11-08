import { Injectable, ForbiddenException, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { DoctorUtilsService } from "../../common/services/doctor-utils.service";
import { CreateAppointmentDto } from "./dto/create-appointment.dto";
import { UpdateAppointmentDto } from "./dto/update-appointment.dto";
import { AppointmentResponseDto } from "./dto/appointment-response.dto";

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly doctorUtils: DoctorUtilsService,
  ) {}

  /**
   * Get all appointments for a doctor
   */
  async findAll(doctorId: string, includePast: boolean = false): Promise<AppointmentResponseDto[]> {
    await this.doctorUtils.verifyDoctor(doctorId);

    let where: Prisma.AppointmentWhereInput = { doctorId };

    if (!includePast) {
      where.scheduledAt = { gte: new Date() };
    }

    const appointments = await this.prisma.appointment.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        scheduledAt: "asc",
      },
    });

    return appointments.map((apt) => ({
      id: apt.id,
      doctorId: apt.doctorId,
      patientId: apt.patientId,
      scheduledAt: apt.scheduledAt.toISOString(),
      notes: apt.notes || undefined,
      status: apt.status,
      createdAt: apt.createdAt.toISOString(),
      updatedAt: apt.updatedAt.toISOString(),
      patient: {
        id: apt.patient.id,
        email: apt.patient.email,
        firstName: apt.patient.firstName || undefined,
        lastName: apt.patient.lastName || undefined,
      },
    }));
  }

  /**
   * Create a new appointment
   */
  async create(doctorId: string, createDto: CreateAppointmentDto): Promise<AppointmentResponseDto> {
    await this.doctorUtils.verifyDoctor(doctorId);

    // Verify patient exists and is assigned to this doctor
    const relation = await this.prisma.doctorPatient.findUnique({
      where: {
        doctorId_patientId: {
          doctorId,
          patientId: createDto.patientId,
        },
      },
    });

    if (!relation) {
      throw new NotFoundException("Patient is not assigned to this doctor");
    }

    const appointment = await this.prisma.appointment.create({
      data: {
        doctorId,
        patientId: createDto.patientId,
        scheduledAt: new Date(createDto.scheduledAt),
        notes: createDto.notes,
      },
      include: {
        patient: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return {
      id: appointment.id,
      doctorId: appointment.doctorId,
      patientId: appointment.patientId,
      scheduledAt: appointment.scheduledAt.toISOString(),
      notes: appointment.notes || undefined,
      status: appointment.status,
      createdAt: appointment.createdAt.toISOString(),
      updatedAt: appointment.updatedAt.toISOString(),
      patient: {
        id: appointment.patient.id,
        email: appointment.patient.email,
        firstName: appointment.patient.firstName || undefined,
        lastName: appointment.patient.lastName || undefined,
      },
    };
  }

  /**
   * Update an appointment
   */
  async update(
    doctorId: string,
    appointmentId: string,
    updateDto: UpdateAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    await this.doctorUtils.verifyDoctor(doctorId);

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      throw new NotFoundException("Appointment not found");
    }

    if (appointment.doctorId !== doctorId) {
      throw new ForbiddenException("You can only update your own appointments");
    }

    const updated = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        scheduledAt: updateDto.scheduledAt ? new Date(updateDto.scheduledAt) : undefined,
        notes: updateDto.notes,
        status: updateDto.status,
      },
      include: {
        patient: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return {
      id: updated.id,
      doctorId: updated.doctorId,
      patientId: updated.patientId,
      scheduledAt: updated.scheduledAt.toISOString(),
      notes: updated.notes || undefined,
      status: updated.status,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      patient: {
        id: updated.patient.id,
        email: updated.patient.email,
        firstName: updated.patient.firstName || undefined,
        lastName: updated.patient.lastName || undefined,
      },
    };
  }

  /**
   * Delete an appointment
   */
  async remove(doctorId: string, appointmentId: string): Promise<{ message: string }> {
    await this.doctorUtils.verifyDoctor(doctorId);

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      throw new NotFoundException("Appointment not found");
    }

    if (appointment.doctorId !== doctorId) {
      throw new ForbiddenException("You can only delete your own appointments");
    }

    await this.prisma.appointment.delete({
      where: { id: appointmentId },
    });

    return { message: "Appointment deleted successfully" };
  }
}
