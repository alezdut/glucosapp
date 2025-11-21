import { Injectable, ForbiddenException, BadRequestException, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import { AlertType, AlertSeverity } from "@prisma/client";
import type { Alert, User, AlertSettings } from "@prisma/client";
import { DoctorUtilsService } from "../../common/services/doctor-utils.service";
import { PatientUtilsService } from "../../common/services/patient-utils.service";
import { EncryptionService } from "../../common/services/encryption.service";
import { EmailService } from "../auth/services/email.service";
import { AlertResponseDto } from "./dto/alert-response.dto";
import { AlertSettingsResponseDto, UpdateAlertSettingsDto } from "./dto/alert-settings.dto";

type AlertWithUser = Alert & {
  user: Pick<User, "id" | "email" | "firstName" | "lastName">;
};

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly doctorUtils: DoctorUtilsService,
    private readonly patientUtils: PatientUtilsService,
    private readonly encryptionService: EncryptionService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Map Alert entity with user to AlertResponseDto
   */
  private mapAlertToDto(alert: AlertWithUser): AlertResponseDto {
    return {
      id: alert.id,
      userId: alert.userId,
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      glucoseReadingId: alert.glucoseReadingId || undefined,
      glucoseEntryId: alert.glucoseEntryId || undefined,
      acknowledged: alert.acknowledged,
      acknowledgedAt: alert.acknowledgedAt?.toISOString(),
      createdAt: alert.createdAt.toISOString(),
      patient: {
        id: alert.user.id,
        email: alert.user.email,
        firstName: alert.user.firstName || undefined,
        lastName: alert.user.lastName || undefined,
      },
    };
  }

  /**
   * Get or create default alert settings for a user
   */
  private async getOrCreateDefaultSettings(userId: string): Promise<AlertSettings> {
    const defaultSettings = {
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
      criticalAlertsIgnoreQuietHours: false,
      notificationFrequency: "IMMEDIATE",
    };

    return await this.prisma.alertSettings.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        ...defaultSettings,
      },
    });
  }

  /**
   * Get alert settings for doctor's patients
   * - Only doctors can access alert settings
   * - Returns settings from the first assigned patient (as template for all patients)
   */
  async getAlertSettings(userId: string): Promise<AlertSettingsResponseDto> {
    // Only doctors can access alert settings
    await this.doctorUtils.verifyDoctor(userId);

    // Get all assigned patient IDs
    const assignedPatientIds = await this.doctorUtils.getDoctorPatientIds(userId);
    if (assignedPatientIds.length === 0) {
      throw new ForbiddenException("Doctor has no assigned patients");
    }

    // Use first patient's settings as template (all patients should have same settings)
    const firstPatientId = assignedPatientIds[0];
    const settings = await this.getOrCreateDefaultSettings(firstPatientId);

    return {
      id: settings.id,
      userId: settings.userId,
      alertsEnabled: settings.alertsEnabled,
      hypoglycemiaEnabled: settings.hypoglycemiaEnabled,
      hypoglycemiaThreshold: settings.hypoglycemiaThreshold,
      severeHypoglycemiaEnabled: settings.severeHypoglycemiaEnabled,
      severeHypoglycemiaThreshold: settings.severeHypoglycemiaThreshold,
      hyperglycemiaEnabled: settings.hyperglycemiaEnabled,
      hyperglycemiaThreshold: settings.hyperglycemiaThreshold,
      persistentHyperglycemiaEnabled: settings.persistentHyperglycemiaEnabled,
      persistentHyperglycemiaThreshold: settings.persistentHyperglycemiaThreshold,
      persistentHyperglycemiaWindowHours: settings.persistentHyperglycemiaWindowHours,
      persistentHyperglycemiaMinReadings: settings.persistentHyperglycemiaMinReadings,
      notificationChannels: settings.notificationChannels as {
        dashboard: boolean;
        email: boolean;
        push: boolean;
      },
      dailySummaryEnabled: settings.dailySummaryEnabled,
      dailySummaryTime: settings.dailySummaryTime,
      quietHoursEnabled: settings.quietHoursEnabled,
      quietHoursStart: settings.quietHoursStart || undefined,
      quietHoursEnd: settings.quietHoursEnd || undefined,
      criticalAlertsIgnoreQuietHours: settings.criticalAlertsIgnoreQuietHours,
      notificationFrequency: settings.notificationFrequency,
      createdAt: settings.createdAt.toISOString(),
      updatedAt: settings.updatedAt.toISOString(),
    };
  }

  /**
   * Update alert settings for all doctor's patients
   * - Only doctors can update alert settings
   * - Updates settings for all assigned patients
   */
  async updateAlertSettings(
    userId: string,
    data: UpdateAlertSettingsDto,
  ): Promise<AlertSettingsResponseDto> {
    // Only doctors can update alert settings
    await this.doctorUtils.verifyDoctor(userId);

    // Get all assigned patient IDs
    const assignedPatientIds = await this.doctorUtils.getDoctorPatientIds(userId);
    if (assignedPatientIds.length === 0) {
      throw new ForbiddenException("Doctor has no assigned patients");
    }

    // Get current settings from first patient for validation
    const firstPatientId = assignedPatientIds[0];
    const currentSettings = await this.getOrCreateDefaultSettings(firstPatientId);

    // Validate that severeHypoglycemiaThreshold < hypoglycemiaThreshold
    // Use provided values or fall back to current values
    const hypoglycemiaThreshold =
      data.hypoglycemiaThreshold ?? currentSettings.hypoglycemiaThreshold;
    const severeHypoglycemiaThreshold =
      data.severeHypoglycemiaThreshold ?? currentSettings.severeHypoglycemiaThreshold;

    if (severeHypoglycemiaThreshold >= hypoglycemiaThreshold) {
      throw new BadRequestException(
        `El umbral de hipoglucemia severa (${severeHypoglycemiaThreshold}) debe ser menor que el umbral de hipoglucemia (${hypoglycemiaThreshold})`,
      );
    }

    // Update settings for all assigned patients
    const updateData = {
      alertsEnabled: data.alertsEnabled,
      hypoglycemiaEnabled: data.hypoglycemiaEnabled,
      hypoglycemiaThreshold: data.hypoglycemiaThreshold,
      severeHypoglycemiaEnabled: data.severeHypoglycemiaEnabled,
      severeHypoglycemiaThreshold: data.severeHypoglycemiaThreshold,
      hyperglycemiaEnabled: data.hyperglycemiaEnabled,
      hyperglycemiaThreshold: data.hyperglycemiaThreshold,
      persistentHyperglycemiaEnabled: data.persistentHyperglycemiaEnabled,
      persistentHyperglycemiaThreshold: data.persistentHyperglycemiaThreshold,
      persistentHyperglycemiaWindowHours: data.persistentHyperglycemiaWindowHours,
      persistentHyperglycemiaMinReadings: data.persistentHyperglycemiaMinReadings,
      notificationChannels: data.notificationChannels
        ? (data.notificationChannels as object)
        : undefined,
      dailySummaryEnabled: data.dailySummaryEnabled,
      dailySummaryTime: data.dailySummaryTime,
      quietHoursEnabled: data.quietHoursEnabled,
      quietHoursStart: data.quietHoursStart,
      quietHoursEnd: data.quietHoursEnd,
      criticalAlertsIgnoreQuietHours: data.criticalAlertsIgnoreQuietHours,
      notificationFrequency: data.notificationFrequency,
    };

    // Update all patients' settings in parallel
    await Promise.all(
      assignedPatientIds.map((patientId) =>
        this.prisma.alertSettings.upsert({
          where: { userId: patientId },
          update: updateData,
          create: {
            userId: patientId,
            ...updateData,
          },
        }),
      ),
    );

    // Return the updated settings from the first patient
    const updated = await this.prisma.alertSettings.findUnique({
      where: { userId: firstPatientId },
    });

    if (!updated) {
      throw new ForbiddenException("Failed to retrieve updated alert settings");
    }

    return {
      id: updated.id,
      userId: updated.userId,
      alertsEnabled: updated.alertsEnabled,
      hypoglycemiaEnabled: updated.hypoglycemiaEnabled,
      hypoglycemiaThreshold: updated.hypoglycemiaThreshold,
      severeHypoglycemiaEnabled: updated.severeHypoglycemiaEnabled,
      severeHypoglycemiaThreshold: updated.severeHypoglycemiaThreshold,
      hyperglycemiaEnabled: updated.hyperglycemiaEnabled,
      hyperglycemiaThreshold: updated.hyperglycemiaThreshold,
      persistentHyperglycemiaEnabled: updated.persistentHyperglycemiaEnabled,
      persistentHyperglycemiaThreshold: updated.persistentHyperglycemiaThreshold,
      persistentHyperglycemiaWindowHours: updated.persistentHyperglycemiaWindowHours,
      persistentHyperglycemiaMinReadings: updated.persistentHyperglycemiaMinReadings,
      notificationChannels: updated.notificationChannels as {
        dashboard: boolean;
        email: boolean;
        push: boolean;
      },
      dailySummaryEnabled: updated.dailySummaryEnabled,
      dailySummaryTime: updated.dailySummaryTime,
      quietHoursEnabled: updated.quietHoursEnabled,
      quietHoursStart: updated.quietHoursStart || undefined,
      quietHoursEnd: updated.quietHoursEnd || undefined,
      criticalAlertsIgnoreQuietHours: updated.criticalAlertsIgnoreQuietHours,
      notificationFrequency: updated.notificationFrequency,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * Check if current time is within quiet hours for a user
   * Handles midnight crossover correctly using user's timezone
   */
  private isInQuietHours(
    quietHoursStart: string,
    quietHoursEnd: string,
    userTimezone: string = "UTC",
  ): boolean {
    try {
      // Get current time in user's timezone
      const now = new Date();
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: userTimezone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      const parts = formatter.formatToParts(now);
      const currentHour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
      const currentMinute = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
      const currentTimeMinutes = currentHour * 60 + currentMinute;

      // Parse quiet hours
      const [startHour, startMin] = quietHoursStart.split(":").map(Number);
      const [endHour, endMin] = quietHoursEnd.split(":").map(Number);
      const startTimeMinutes = startHour * 60 + startMin;
      const endTimeMinutes = endHour * 60 + endMin;

      // Handle midnight crossover (e.g., 22:00 to 07:00)
      if (startTimeMinutes <= endTimeMinutes) {
        // Normal case: start < end (e.g., 09:00 to 17:00)
        return currentTimeMinutes >= startTimeMinutes && currentTimeMinutes < endTimeMinutes;
      } else {
        // Midnight crossover: start > end (e.g., 22:00 to 07:00)
        return currentTimeMinutes >= startTimeMinutes || currentTimeMinutes < endTimeMinutes;
      }
    } catch (error) {
      this.logger.error(`Failed to check quiet hours for timezone ${userTimezone}`, error);
      // If timezone is invalid, fallback to UTC calculation without recursion
      if (userTimezone !== "UTC") {
        return this.isInQuietHours(quietHoursStart, quietHoursEnd, "UTC");
      }
      // If UTC also fails, return false (don't block notifications)
      this.logger.warn("Failed to check quiet hours even with UTC, defaulting to false");
      return false;
    }
  }

  /**
   * Send email notification for an alert
   * Only sends if email notifications are enabled and quiet hours allow it
   * Sends email to the doctor assigned to the patient
   */
  private async sendAlertEmailNotification(
    patientId: string,
    alertType: AlertType,
    severity: AlertSeverity,
    message: string,
    settings: AlertSettings,
    glucoseMgdl: number,
    alertCreatedAt: Date,
  ): Promise<void> {
    // Check if email notifications are enabled
    const notificationChannels = settings.notificationChannels as {
      dashboard: boolean;
      email: boolean;
      push: boolean;
    };

    if (!notificationChannels?.email) {
      return; // Email notifications disabled
    }

    // Get doctor assigned to this patient
    const doctorRelation = await this.prisma.doctorPatient.findFirst({
      where: { patientId },
      include: {
        doctor: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            timezone: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!doctorRelation?.doctor?.email) {
      this.logger.debug(
        `Cannot send alert email: patient ${patientId} has no assigned doctor or doctor has no email`,
      );
      return;
    }

    const doctor = doctorRelation.doctor;

    // Check quiet hours using doctor's timezone
    if (settings.quietHoursEnabled && settings.quietHoursStart && settings.quietHoursEnd) {
      const doctorTimezone = doctor.timezone || "UTC";
      const inQuietHours = this.isInQuietHours(
        settings.quietHoursStart,
        settings.quietHoursEnd,
        doctorTimezone,
      );

      // Check if we should ignore quiet hours for critical alerts
      const isCritical = severity === AlertSeverity.CRITICAL;
      const shouldIgnoreQuietHours = isCritical && settings.criticalAlertsIgnoreQuietHours;

      if (inQuietHours && !shouldIgnoreQuietHours) {
        this.logger.debug(
          `Skipping email notification for alert ${alertType} due to quiet hours (doctor timezone: ${doctorTimezone})`,
        );
        return; // Don't send email during quiet hours (unless critical alerts ignore it)
      }
    }

    // Get patient info for email context
    const patient = await this.prisma.user.findUnique({
      where: { id: patientId },
      select: { firstName: true, lastName: true, email: true },
    });

    const patientName = patient
      ? `${patient.firstName || ""} ${patient.lastName || ""}`.trim() || "Paciente"
      : "Paciente";
    const patientEmail = patient?.email || "";

    // Format alert time in doctor's timezone
    const doctorTimezone = doctor.timezone || "UTC";
    const alertTimeFormatter = new Intl.DateTimeFormat("es-ES", {
      timeZone: doctorTimezone,
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const alertTimeFormatted = alertTimeFormatter.format(alertCreatedAt);

    // Build dashboard URL with patient filter
    const frontendUrl = this.configService.get<string>("FRONTEND_URL", "http://localhost:3001");
    const dashboardUrl = `${frontendUrl}/dashboard/patients/${patientId}`;

    // Send email to doctor
    await this.emailService.sendAlertEmail(
      doctor.email,
      doctor.firstName || undefined,
      alertType,
      severity,
      message,
      dashboardUrl,
      {
        patientName,
        patientEmail,
        glucoseValue: glucoseMgdl,
        alertTime: alertTimeFormatted,
        alertTimezone: doctorTimezone,
      },
    );
  }

  /**
   * Detect and create alert for a glucose reading
   * This should be called when a glucose reading is created
   * Now uses user's alert settings instead of hardcoded values
   * Always creates alerts in dashboard, but respects quiet hours for email notifications
   */
  async detectAlert(
    userId: string,
    glucoseMgdl: number,
    glucoseReadingId?: string,
    glucoseEntryId?: string,
  ): Promise<void> {
    // Get user's alert settings
    const settings = await this.getOrCreateDefaultSettings(userId);

    // If alerts are globally disabled, don't create any alerts
    if (!settings.alertsEnabled) {
      return;
    }

    let alertType: AlertType | null = null;
    let severity: AlertSeverity | null = null;
    let message = "";

    // Severe hypoglycemia: check threshold and if enabled
    if (settings.severeHypoglycemiaEnabled && glucoseMgdl < settings.severeHypoglycemiaThreshold) {
      alertType = AlertType.SEVERE_HYPOGLYCEMIA;
      severity = AlertSeverity.CRITICAL;
      message = `Hipoglucemia severa: nivel de glucosa en ${glucoseMgdl} mg/dL (< ${settings.severeHypoglycemiaThreshold} mg/dL). Requiere atención inmediata.`;
    }
    // Hypoglycemia: check threshold and if enabled
    else if (
      settings.hypoglycemiaEnabled &&
      glucoseMgdl < settings.hypoglycemiaThreshold &&
      glucoseMgdl >= settings.severeHypoglycemiaThreshold
    ) {
      alertType = AlertType.HYPOGLYCEMIA;
      severity = AlertSeverity.HIGH;
      message = `Hipoglucemia: nivel de glucosa en ${glucoseMgdl} mg/dL.`;
    }
    // Persistent hyperglycemia: check first if enabled (independent of regular hyperglycemia)
    else if (
      settings.persistentHyperglycemiaEnabled &&
      glucoseMgdl > settings.persistentHyperglycemiaThreshold
    ) {
      const windowHoursAgo = new Date(
        Date.now() - settings.persistentHyperglycemiaWindowHours * 60 * 60 * 1000,
      );

      // Search in both glucoseEntry and glucoseReading tables
      const [recentEntries, recentReadings] = await Promise.all([
        this.prisma.glucoseEntry.findMany({
          where: {
            userId,
            recordedAt: { gte: windowHoursAgo },
          },
          select: {
            mgdlEncrypted: true,
          },
        }),
        this.prisma.glucoseReading.findMany({
          where: {
            userId,
            recordedAt: { gte: windowHoursAgo },
            isHistorical: false, // Only count non-historical readings
          },
          select: {
            glucoseEncrypted: true,
          },
        }),
      ]);

      // Decrypt and count high readings (including current reading)
      let recentHighReadings = 0;

      // Process glucose entries
      for (const entry of recentEntries) {
        try {
          const decryptedValue = this.encryptionService.decryptGlucoseValue(entry.mgdlEncrypted);
          if (decryptedValue > settings.persistentHyperglycemiaThreshold) {
            recentHighReadings++;
          }
        } catch (error) {
          console.error("[Alerts] Failed to decrypt glucose entry:", error);
        }
      }

      // Process glucose readings
      for (const reading of recentReadings) {
        try {
          const decryptedValue = this.encryptionService.decryptGlucoseValue(
            reading.glucoseEncrypted,
          );
          if (decryptedValue > settings.persistentHyperglycemiaThreshold) {
            recentHighReadings++;
          }
        } catch (error) {
          console.error("[Alerts] Failed to decrypt glucose reading:", error);
        }
      }

      if (recentHighReadings >= settings.persistentHyperglycemiaMinReadings) {
        // Check if there's already a recent persistent hyperglycemia alert within the time window
        // This prevents duplicate alerts and resets the counter after an alert is triggered
        const existingAlert = await this.prisma.alert.findFirst({
          where: {
            userId,
            type: AlertType.PERSISTENT_HYPERGLYCEMIA,
            createdAt: { gte: windowHoursAgo },
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        if (!existingAlert) {
          // No recent alert exists, create a new one
          alertType = AlertType.PERSISTENT_HYPERGLYCEMIA;
          severity = AlertSeverity.HIGH;
          message = `Hiperglucemia persistente: se registraron al menos ${settings.persistentHyperglycemiaMinReadings} registros de glucosa por encima de ${settings.persistentHyperglycemiaThreshold} mg/dL en el rango de ${settings.persistentHyperglycemiaWindowHours} horas.`;
        } else {
          // Recent alert exists, don't create a new one (counter resets)
          // Check for regular hyperglycemia instead if enabled
          if (settings.hyperglycemiaEnabled && glucoseMgdl > settings.hyperglycemiaThreshold) {
            alertType = AlertType.HYPERGLYCEMIA;
            severity = AlertSeverity.MEDIUM;
            message = `Hiperglucemia: nivel de glucosa en ${glucoseMgdl} mg/dL.`;
          }
        }
      } else if (settings.hyperglycemiaEnabled && glucoseMgdl > settings.hyperglycemiaThreshold) {
        // If persistent hyperglycemia check didn't trigger but regular hyperglycemia is enabled, check for regular hyperglycemia
        alertType = AlertType.HYPERGLYCEMIA;
        severity = AlertSeverity.MEDIUM;
        message = `Hiperglucemia: nivel de glucosa en ${glucoseMgdl} mg/dL.`;
      }
    }
    // Hyperglycemia: check threshold and if enabled (only if persistent hyperglycemia is not enabled or didn't trigger)
    else if (settings.hyperglycemiaEnabled && glucoseMgdl > settings.hyperglycemiaThreshold) {
      alertType = AlertType.HYPERGLYCEMIA;
      severity = AlertSeverity.MEDIUM;
      message = `Hiperglucemia: nivel de glucosa en ${glucoseMgdl} mg/dL.`;
    }

    // Create alert if detected (always create for dashboard, regardless of quiet hours)
    if (alertType && severity) {
      const alertData: {
        userId: string;
        type: AlertType;
        severity: AlertSeverity;
        message: string;
        glucoseReadingId?: string;
        glucoseEntryId?: string;
      } = {
        userId,
        type: alertType,
        severity,
        message,
      };

      // Only include glucoseReadingId if it's provided and not empty
      // Explicitly check for truthy value and non-empty string
      if (glucoseReadingId) {
        const trimmedId =
          typeof glucoseReadingId === "string"
            ? glucoseReadingId.trim()
            : String(glucoseReadingId).trim();
        if (trimmedId !== "") {
          alertData.glucoseReadingId = trimmedId;
        }
      }

      // Only include glucoseEntryId if it's provided and not empty
      if (glucoseEntryId) {
        const trimmedId =
          typeof glucoseEntryId === "string"
            ? glucoseEntryId.trim()
            : String(glucoseEntryId).trim();
        if (trimmedId !== "") {
          alertData.glucoseEntryId = trimmedId;
        }
      }

      this.logger.debug(
        `Creating alert - glucoseReadingId: ${glucoseReadingId || "undefined"}, glucoseEntryId: ${glucoseEntryId || "undefined"}, will include readingId: ${!!alertData.glucoseReadingId}, entryId: ${!!alertData.glucoseEntryId}`,
      );

      const alert = await this.prisma.alert.create({
        data: alertData,
      });

      this.logger.debug(
        `Alert created with ID: ${alert.id}, glucoseReadingId: ${alert.glucoseReadingId || "null"}, glucoseEntryId: ${alert.glucoseEntryId || "null"}`,
      );

      // Send email notification if enabled (respects quiet hours)
      // Use non-blocking approach to avoid slowing down alert creation
      this.sendAlertEmailNotification(
        userId,
        alertType,
        severity,
        message,
        settings,
        glucoseMgdl,
        alert.createdAt,
      ).catch((error) => {
        this.logger.error(`Failed to send email notification for alert ${alert.id}`, error);
      });
    }
  }

  /**
   * Get all alerts for doctor's patients
   */
  async findAll(doctorId: string, limit: number = 50): Promise<AlertResponseDto[]> {
    await this.doctorUtils.verifyDoctor(doctorId);

    const patientIds = await this.doctorUtils.getDoctorPatientIds(doctorId);
    if (patientIds.length === 0) {
      return [];
    }

    const alerts = await this.prisma.alert.findMany({
      where: {
        userId: { in: patientIds },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });

    return alerts.map((alert) => this.mapAlertToDto(alert));
  }

  /**
   * Get critical alerts (not acknowledged, severity CRITICAL or HIGH)
   */
  async getCritical(doctorId: string): Promise<AlertResponseDto[]> {
    await this.doctorUtils.verifyDoctor(doctorId);

    const patientIds = await this.doctorUtils.getDoctorPatientIds(doctorId);
    if (patientIds.length === 0) {
      return [];
    }

    const alerts = await this.prisma.alert.findMany({
      where: {
        userId: { in: patientIds },
        acknowledged: false,
        severity: { in: [AlertSeverity.CRITICAL, AlertSeverity.HIGH] },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return alerts.map((alert) => this.mapAlertToDto(alert));
  }

  /**
   * Get recent alerts (last 24 hours)
   */
  async getRecent(doctorId: string, limit: number = 10): Promise<AlertResponseDto[]> {
    await this.doctorUtils.verifyDoctor(doctorId);

    const patientIds = await this.doctorUtils.getDoctorPatientIds(doctorId);
    if (patientIds.length === 0) {
      return [];
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const alerts = await this.prisma.alert.findMany({
      where: {
        userId: { in: patientIds },
        createdAt: { gte: twentyFourHoursAgo },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });

    return alerts.map((alert) => this.mapAlertToDto(alert));
  }

  /**
   * Acknowledge an alert
   */
  async acknowledge(doctorId: string, alertId: string): Promise<AlertResponseDto> {
    await this.doctorUtils.verifyDoctor(doctorId);

    const alert = await this.prisma.alert.findUnique({
      where: { id: alertId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!alert) {
      throw new ForbiddenException("Alert not found");
    }

    // Verify the alert belongs to one of the doctor's patients
    const patientIds = await this.doctorUtils.getDoctorPatientIds(doctorId);
    if (!patientIds.includes(alert.userId)) {
      throw new ForbiddenException("You can only acknowledge alerts for your patients");
    }

    const updated = await this.prisma.alert.update({
      where: { id: alertId },
      data: {
        acknowledged: true,
        acknowledgedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return this.mapAlertToDto(updated);
  }
}
