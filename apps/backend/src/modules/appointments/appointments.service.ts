import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import {
  AlertSeverity,
  AlertType,
  AppointmentModality,
  AppointmentStatus,
  type AlertSettings,
  type Appointment,
  type Prisma,
  UserRole,
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { DoctorUtilsService } from "../../common/services/doctor-utils.service";
import { CreateAppointmentDto } from "./dto/create-appointment.dto";
import { UpdateAppointmentDto } from "./dto/update-appointment.dto";
import { AppointmentResponseDto } from "./dto/appointment-response.dto";
import { GetAppointmentsQueryDto } from "./dto/get-appointments-query.dto";
import { CalendarDayResponseDto } from "./dto/calendar-day-response.dto";
import { RealtimeNotificationsService } from "../notifications/realtime-notifications.service";
import { NotificationsService } from "../notifications/notifications.service";
import {
  formatDateInTimezone,
  getCurrentTimeInTimezone,
  isTimeInRange,
  parseTimeString,
} from "@glucosapp/utils";

type AppointmentWithRelations = Prisma.AppointmentGetPayload<{
  include: {
    patient: {
      select: {
        id: true;
        email: true;
        firstName: true;
        lastName: true;
        timezone: true;
      };
    };
    doctor: {
      select: {
        id: true;
        email: true;
        firstName: true;
        lastName: true;
        timezone: true;
      };
    };
  };
}>;

type NotificationChannels = {
  dashboard?: boolean;
  email?: boolean;
  push?: boolean;
};

const ACTIVE_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.SCHEDULED,
  AppointmentStatus.CONFIRMED,
];
const FINAL_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.COMPLETED,
  AppointmentStatus.CANCELLED,
];
const APPOINTMENT_DURATION_MINUTES = 60;
const REMINDER_WINDOW_HOURS = 24;
const REMINDER_POLL_INTERVAL_MS = 60 * 1000;

@Injectable()
export class AppointmentsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AppointmentsService.name);
  private reminderInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly doctorUtils: DoctorUtilsService,
    private readonly realtimeNotifications: RealtimeNotificationsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  onModuleInit() {
    this.processDueReminders().catch((error) => {
      this.logger.error("Failed to process appointment reminders on startup", error);
    });

    this.reminderInterval = setInterval(() => {
      this.processDueReminders().catch((error) => {
        this.logger.error("Failed to process appointment reminders", error);
      });
    }, REMINDER_POLL_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.reminderInterval) {
      clearInterval(this.reminderInterval);
      this.reminderInterval = null;
    }
  }

  private mapAppointmentToDto(apt: AppointmentWithRelations): AppointmentResponseDto {
    return {
      id: apt.id,
      doctorId: apt.doctorId,
      patientId: apt.patientId,
      scheduledAt: apt.scheduledAt.toISOString(),
      notes: apt.notes || undefined,
      status: apt.status,
      modality: apt.modality,
      location: apt.location || undefined,
      meetingUrl: apt.meetingUrl || undefined,
      createdAt: apt.createdAt.toISOString(),
      updatedAt: apt.updatedAt.toISOString(),
      patient: {
        id: apt.patient.id,
        email: apt.patient.email,
        firstName: apt.patient.firstName || undefined,
        lastName: apt.patient.lastName || undefined,
      },
      doctor: {
        id: apt.doctor.id,
        email: apt.doctor.email,
        firstName: apt.doctor.firstName || undefined,
        lastName: apt.doctor.lastName || undefined,
      },
    };
  }

  private getAppointmentRelationsInclude() {
    return {
      patient: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          timezone: true,
        },
      },
      doctor: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          timezone: true,
        },
      },
    } as const;
  }

  private parseScheduledAt(scheduledAt: string): Date {
    const parsedDate = new Date(scheduledAt);
    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException("Invalid appointment date");
    }
    return parsedDate;
  }

  private ensureFutureAppointment(scheduledAt: Date): void {
    if (scheduledAt <= new Date()) {
      throw new BadRequestException("Appointments must be scheduled in the future");
    }
  }

  private ensureDateRange(from?: string, to?: string): void {
    if (!from || !to) return;

    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (fromDate > toDate) {
      throw new BadRequestException("Invalid date range");
    }
  }

  private ensureMutableAppointment(appointment: Appointment): void {
    if (FINAL_APPOINTMENT_STATUSES.includes(appointment.status)) {
      throw new BadRequestException("Finalized appointments cannot be modified");
    }
  }

  private isNotesOnlyUpdate(updateDto: UpdateAppointmentDto): boolean {
    const allowedKeys = ["notes"];
    const definedKeys = Object.entries(updateDto)
      .filter(([, value]) => value !== undefined)
      .map(([key]) => key);

    return definedKeys.length > 0 && definedKeys.every((key) => allowedKeys.includes(key));
  }

  private sanitizeOptionalText(value: string | null | undefined): string | undefined {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private normalizeModalityFields(
    modality: AppointmentModality,
    location?: string,
    meetingUrl?: string,
  ) {
    const normalizedLocation = this.sanitizeOptionalText(location);
    const normalizedMeetingUrl = this.sanitizeOptionalText(meetingUrl);

    if (modality === AppointmentModality.IN_PERSON) {
      return {
        modality,
        location: normalizedLocation,
        meetingUrl: undefined,
      };
    }

    return {
      modality,
      location: undefined,
      meetingUrl: normalizedMeetingUrl,
    };
  }

  private hasField<T extends object>(value: T, property: keyof T): boolean {
    return Object.prototype.hasOwnProperty.call(value, property);
  }

  private hasLogisticalChanges(
    appointment: Appointment,
    nextScheduledAt: Date,
    nextModality: AppointmentModality,
    nextLocation?: string,
    nextMeetingUrl?: string,
  ): boolean {
    return (
      appointment.scheduledAt.getTime() !== nextScheduledAt.getTime() ||
      appointment.modality !== nextModality ||
      (appointment.location || undefined) !== nextLocation ||
      (appointment.meetingUrl || undefined) !== nextMeetingUrl
    );
  }

  private async ensureDoctorPatientRelation(doctorId: string, patientId: string): Promise<void> {
    const relation = await this.prisma.doctorPatient.findUnique({
      where: {
        doctorId_patientId: {
          doctorId,
          patientId,
        },
      },
    });

    if (!relation) {
      throw new NotFoundException("Patient is not assigned to this doctor");
    }
  }

  private async ensureDoctorAvailability(
    doctorId: string,
    scheduledAt: Date,
    excludeAppointmentId?: string,
  ): Promise<void> {
    const start = scheduledAt;
    const end = new Date(start.getTime() + APPOINTMENT_DURATION_MINUTES * 60 * 1000);
    const lowerBound = new Date(start.getTime() - APPOINTMENT_DURATION_MINUTES * 60 * 1000);

    const overlappingAppointment = await this.prisma.appointment.findFirst({
      where: {
        doctorId,
        id: excludeAppointmentId ? { not: excludeAppointmentId } : undefined,
        status: { in: ACTIVE_APPOINTMENT_STATUSES },
        scheduledAt: {
          gt: lowerBound,
          lt: end,
        },
      },
      select: { id: true },
    });

    if (overlappingAppointment) {
      throw new ConflictException("Doctor already has an overlapping appointment");
    }
  }

  private async findAndVerifyAppointment(
    doctorId: string,
    appointmentId: string,
  ): Promise<Appointment> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      throw new NotFoundException("Appointment not found");
    }

    if (appointment.doctorId !== doctorId) {
      throw new ForbiddenException("You can only update your own appointments");
    }

    return appointment;
  }

  private async findAndVerifyPatientAppointment(
    patientId: string,
    appointmentId: string,
  ): Promise<Appointment> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      throw new NotFoundException("Appointment not found");
    }

    if (appointment.patientId !== patientId) {
      throw new ForbiddenException("You can only access your own appointments");
    }

    return appointment;
  }

  private getDateKeyInTimezone(date: Date, timezone: string): string {
    try {
      const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      return formatter.format(date);
    } catch {
      return date.toISOString().split("T")[0];
    }
  }

  private getMonthRange(month: string) {
    const [yearText, monthText] = month.split("-");
    const year = parseInt(yearText, 10);
    const monthIndex = parseInt(monthText, 10) - 1;

    if (Number.isNaN(year) || Number.isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
      throw new BadRequestException("Invalid month");
    }

    const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0, 0));
    const paddedStart = new Date(start.getTime() - 48 * 60 * 60 * 1000);
    const paddedEnd = new Date(end.getTime() + 48 * 60 * 60 * 1000);

    return { start, end, paddedStart, paddedEnd };
  }

  private parseNotificationChannels(settings: AlertSettings | null): NotificationChannels {
    if (!settings?.notificationChannels || typeof settings.notificationChannels !== "object") {
      return { dashboard: true, email: false, push: false };
    }

    return settings.notificationChannels as NotificationChannels;
  }

  private isInQuietHours(
    quietHoursStart: string,
    quietHoursEnd: string,
    timezone: string,
  ): boolean {
    const startTimeMinutes = parseTimeString(quietHoursStart);
    const endTimeMinutes = parseTimeString(quietHoursEnd);

    if (startTimeMinutes === null || endTimeMinutes === null) {
      return false;
    }

    const currentTime = getCurrentTimeInTimezone(timezone);
    if (!currentTime) {
      return false;
    }

    return isTimeInRange(currentTime.totalMinutes, startTimeMinutes, endTimeMinutes);
  }

  private async getReminderDeliveryDecision(
    appointment: AppointmentWithRelations,
  ): Promise<{ sendInApp: boolean; deferUntilLater: boolean }> {
    const settings = await this.prisma.alertSettings.findUnique({
      where: { userId: appointment.patientId },
    });
    const channels = this.parseNotificationChannels(settings);
    const patientTimezone = appointment.patient.timezone || appointment.doctor.timezone || "UTC";

    if (
      settings?.quietHoursEnabled &&
      settings.quietHoursStart &&
      settings.quietHoursEnd &&
      this.isInQuietHours(settings.quietHoursStart, settings.quietHoursEnd, patientTimezone)
    ) {
      return { sendInApp: false, deferUntilLater: true };
    }

    if (channels.dashboard === false) {
      return { sendInApp: false, deferUntilLater: false };
    }

    return { sendInApp: true, deferUntilLater: false };
  }

  private async createReminderAlert(appointment: AppointmentWithRelations, message: string) {
    await this.prisma.alert.create({
      data: {
        userId: appointment.patientId,
        type: AlertType.OTHER,
        severity: AlertSeverity.LOW,
        message,
      },
    });
  }

  private async emitAppointmentEvent(
    userId: string,
    event: "appointment:updated" | "appointment:reminder",
    payload: Record<string, unknown>,
  ): Promise<void> {
    this.realtimeNotifications.emitToUser(userId, event, payload);
  }

  private buildReminderMessage(appointment: AppointmentWithRelations): string {
    const formattedDate =
      formatDateInTimezone(appointment.scheduledAt, appointment.doctor.timezone || "UTC", "es-ES", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }) || appointment.scheduledAt.toISOString();

    return `Recordatorio de cita para ${formattedDate}.`;
  }

  async processDueReminders(): Promise<void> {
    const now = new Date();
    const reminderThreshold = new Date(now.getTime() + REMINDER_WINDOW_HOURS * 60 * 60 * 1000);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        status: { in: ACTIVE_APPOINTMENT_STATUSES },
        scheduledAt: {
          gt: now,
          lte: reminderThreshold,
        },
        reminderSentAt: null,
      },
      include: this.getAppointmentRelationsInclude(),
      orderBy: { scheduledAt: "asc" },
    });

    for (const appointment of appointments) {
      const message = this.buildReminderMessage(appointment);
      const decision = await this.getReminderDeliveryDecision(appointment);

      if (decision.deferUntilLater) {
        continue;
      }

      if (decision.sendInApp) {
        await this.createReminderAlert(appointment, message);
        await this.emitAppointmentEvent(appointment.patientId, "appointment:reminder", {
          appointmentId: appointment.id,
          message,
          appointment: this.mapAppointmentToDto(appointment),
        });
        await this.notificationsService.sendToUser(
          appointment.patientId,
          this.notificationsService.createAppointmentPayload({
            type: "appointment_reminder",
            appointmentId: appointment.id,
            message,
          }),
        );
      }

      await this.prisma.appointment.update({
        where: { id: appointment.id },
        data: { reminderSentAt: new Date() },
      });
    }
  }

  async findAll(
    doctorId: string,
    query: GetAppointmentsQueryDto = {},
  ): Promise<AppointmentResponseDto[]> {
    await this.doctorUtils.verifyDoctor(doctorId);
    this.ensureDateRange(query.from, query.to);

    const where: Prisma.AppointmentWhereInput = { doctorId };
    const now = new Date();
    let scheduledAtFilter: Prisma.DateTimeFilter | undefined;

    if (!query.includePast) {
      scheduledAtFilter = { gte: now };
    }

    if (query.patientId) {
      where.patientId = query.patientId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.from) {
      const fromDate = new Date(query.from);
      scheduledAtFilter = {
        ...(scheduledAtFilter || {}),
        gte:
          scheduledAtFilter?.gte instanceof Date && scheduledAtFilter.gte > fromDate
            ? scheduledAtFilter.gte
            : fromDate,
      };
    }

    if (query.to) {
      scheduledAtFilter = {
        ...(scheduledAtFilter || {}),
        lte: new Date(query.to),
      };
    }

    if (scheduledAtFilter) {
      where.scheduledAt = scheduledAtFilter;
    }

    const appointments = await this.prisma.appointment.findMany({
      where,
      include: this.getAppointmentRelationsInclude(),
      orderBy: {
        scheduledAt: "asc",
      },
    });

    return appointments.map((apt) => this.mapAppointmentToDto(apt));
  }

  async getCalendarSummary(doctorId: string, month: string): Promise<CalendarDayResponseDto[]> {
    await this.doctorUtils.verifyDoctor(doctorId);

    const doctor = await this.prisma.user.findUnique({
      where: { id: doctorId },
      select: { timezone: true },
    });

    const timezone = doctor?.timezone || "UTC";
    const { paddedStart, paddedEnd } = this.getMonthRange(month);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        doctorId,
        scheduledAt: {
          gte: paddedStart,
          lt: paddedEnd,
        },
      },
      select: {
        scheduledAt: true,
      },
      orderBy: {
        scheduledAt: "asc",
      },
    });

    const counts = new Map<string, number>();
    for (const appointment of appointments) {
      const dateKey = this.getDateKeyInTimezone(appointment.scheduledAt, timezone);
      if (!dateKey.startsWith(month)) continue;
      counts.set(dateKey, (counts.get(dateKey) || 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((left, right) => left.date.localeCompare(right.date));
  }

  async create(doctorId: string, createDto: CreateAppointmentDto): Promise<AppointmentResponseDto> {
    await this.doctorUtils.verifyDoctor(doctorId);
    const scheduledAt = this.parseScheduledAt(createDto.scheduledAt);
    const modality = createDto.modality || AppointmentModality.IN_PERSON;
    const normalizedFields = this.normalizeModalityFields(
      modality,
      createDto.location,
      createDto.meetingUrl,
    );

    this.ensureFutureAppointment(scheduledAt);
    await this.ensureDoctorPatientRelation(doctorId, createDto.patientId);
    await this.ensureDoctorAvailability(doctorId, scheduledAt);

    const appointment = await this.prisma.appointment.create({
      data: {
        doctorId,
        patientId: createDto.patientId,
        scheduledAt,
        notes: this.sanitizeOptionalText(createDto.notes),
        modality: normalizedFields.modality,
        location: normalizedFields.location,
        meetingUrl: normalizedFields.meetingUrl,
        reminderSentAt: null,
      },
      include: this.getAppointmentRelationsInclude(),
    });

    await this.emitAppointmentEvent(appointment.patientId, "appointment:updated", {
      type: "created",
      message: "Tu médico programó una nueva cita.",
      appointment: this.mapAppointmentToDto(appointment),
    });
    await this.notificationsService.sendToUser(
      appointment.patientId,
      this.notificationsService.createAppointmentPayload({
        type: "appointment_created",
        appointmentId: appointment.id,
        message: "Tu médico programó una nueva cita.",
      }),
    );

    return this.mapAppointmentToDto(appointment);
  }

  async update(
    doctorId: string,
    appointmentId: string,
    updateDto: UpdateAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    await this.doctorUtils.verifyDoctor(doctorId);

    const appointment = await this.findAndVerifyAppointment(doctorId, appointmentId);
    const finalizedAppointment = FINAL_APPOINTMENT_STATUSES.includes(appointment.status);
    if (finalizedAppointment && !this.isNotesOnlyUpdate(updateDto)) {
      this.ensureMutableAppointment(appointment);
    }

    const nextScheduledAt = updateDto.scheduledAt
      ? this.parseScheduledAt(updateDto.scheduledAt)
      : appointment.scheduledAt;
    if (!finalizedAppointment) {
      this.ensureFutureAppointment(nextScheduledAt);
      await this.ensureDoctorAvailability(doctorId, nextScheduledAt, appointmentId);
    }

    const nextModality = updateDto.modality ?? appointment.modality;
    const rawLocation = this.hasField(updateDto, "location")
      ? updateDto.location
      : (appointment.location ?? undefined);
    const rawMeetingUrl = this.hasField(updateDto, "meetingUrl")
      ? updateDto.meetingUrl
      : (appointment.meetingUrl ?? undefined);
    const normalizedFields = this.normalizeModalityFields(nextModality, rawLocation, rawMeetingUrl);
    const logisticalChanges = this.hasLogisticalChanges(
      appointment,
      nextScheduledAt,
      nextModality,
      normalizedFields.location,
      normalizedFields.meetingUrl,
    );

    let nextStatus = updateDto.status ?? appointment.status;
    if (finalizedAppointment) {
      nextStatus = appointment.status;
    } else if (appointment.status === AppointmentStatus.CONFIRMED && logisticalChanges) {
      nextStatus = AppointmentStatus.SCHEDULED;
    }

    const updated = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        scheduledAt: finalizedAppointment ? appointment.scheduledAt : nextScheduledAt,
        notes: this.hasField(updateDto, "notes")
          ? this.sanitizeOptionalText(updateDto.notes)
          : appointment.notes,
        status: nextStatus,
        modality: finalizedAppointment ? appointment.modality : normalizedFields.modality,
        location: finalizedAppointment ? appointment.location : normalizedFields.location,
        meetingUrl: finalizedAppointment ? appointment.meetingUrl : normalizedFields.meetingUrl,
        reminderSentAt:
          finalizedAppointment || !logisticalChanges ? appointment.reminderSentAt : null,
      },
      include: this.getAppointmentRelationsInclude(),
    });

    if (!finalizedAppointment && logisticalChanges) {
      const message =
        appointment.status === AppointmentStatus.CONFIRMED
          ? "Tu cita fue actualizada y requiere una nueva confirmación."
          : "Tu cita fue actualizada.";

      await this.emitAppointmentEvent(updated.patientId, "appointment:updated", {
        type: "updated",
        message,
        appointment: this.mapAppointmentToDto(updated),
      });
      await this.notificationsService.sendToUser(
        updated.patientId,
        this.notificationsService.createAppointmentPayload({
          type: "appointment_updated",
          appointmentId: updated.id,
          message,
        }),
      );
    }

    return this.mapAppointmentToDto(updated);
  }

  async remove(doctorId: string, appointmentId: string): Promise<{ message: string }> {
    await this.doctorUtils.verifyDoctor(doctorId);

    const appointment = await this.findAndVerifyAppointment(doctorId, appointmentId);
    this.ensureMutableAppointment(appointment);

    await this.prisma.appointment.delete({
      where: { id: appointmentId },
    });

    return { message: "Appointment deleted successfully" };
  }

  async findMine(
    patientId: string,
    includePast: boolean = false,
  ): Promise<AppointmentResponseDto[]> {
    const patient = await this.prisma.user.findUnique({
      where: { id: patientId },
      select: { role: true },
    });

    if (!patient || patient.role !== UserRole.PATIENT) {
      throw new ForbiddenException("Only patients can access this endpoint");
    }

    const appointments = await this.prisma.appointment.findMany({
      where: {
        patientId,
        ...(includePast ? {} : { scheduledAt: { gte: new Date() } }),
      },
      include: this.getAppointmentRelationsInclude(),
      orderBy: { scheduledAt: "asc" },
    });

    return appointments.map((appointment) => this.mapAppointmentToDto(appointment));
  }

  async confirm(patientId: string, appointmentId: string): Promise<AppointmentResponseDto> {
    const appointment = await this.findAndVerifyPatientAppointment(patientId, appointmentId);

    if (appointment.status !== AppointmentStatus.SCHEDULED) {
      throw new BadRequestException("Only scheduled appointments can be confirmed");
    }

    const updated = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: AppointmentStatus.CONFIRMED },
      include: this.getAppointmentRelationsInclude(),
    });

    return this.mapAppointmentToDto(updated);
  }

  async cancel(patientId: string, appointmentId: string): Promise<AppointmentResponseDto> {
    const appointment = await this.findAndVerifyPatientAppointment(patientId, appointmentId);

    if (!ACTIVE_APPOINTMENT_STATUSES.includes(appointment.status)) {
      throw new BadRequestException("Only active appointments can be cancelled");
    }

    const updated = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: AppointmentStatus.CANCELLED },
      include: this.getAppointmentRelationsInclude(),
    });

    return this.mapAppointmentToDto(updated);
  }
}
