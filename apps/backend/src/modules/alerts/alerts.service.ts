import { Injectable, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AlertType, AlertSeverity } from "@prisma/client";
import { DoctorUtilsService } from "../../common/services/doctor-utils.service";
import { EncryptionService } from "../../common/services/encryption.service";
import { AlertResponseDto } from "./dto/alert-response.dto";

@Injectable()
export class AlertsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly doctorUtils: DoctorUtilsService,
    private readonly encryptionService: EncryptionService,
  ) {}

  /**
   * Detect and create alert for a glucose reading
   * This should be called when a glucose reading is created
   */
  async detectAlert(userId: string, glucoseMgdl: number, glucoseReadingId?: string): Promise<void> {
    let alertType: AlertType | null = null;
    let severity: AlertSeverity | null = null;
    let message = "";

    // Severe hypoglycemia: < 70 mg/dL
    if (glucoseMgdl < 70) {
      alertType = AlertType.SEVERE_HYPOGLYCEMIA;
      severity = AlertSeverity.CRITICAL;
      message = `Hipoglucemia severa: nivel de glucosa en ${glucoseMgdl} mg/dL. Requiere atención inmediata.`;
    }
    // Hypoglycemia: 70-80 mg/dL
    else if (glucoseMgdl < 80) {
      alertType = AlertType.HYPOGLYCEMIA;
      severity = AlertSeverity.HIGH;
      message = `Hipoglucemia: nivel de glucosa en ${glucoseMgdl} mg/dL.`;
    }
    // Hyperglycemia: > 250 mg/dL
    else if (glucoseMgdl > 250) {
      // Check for persistent hyperglycemia (need to check last 4 hours)
      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
      const recentEntries = await this.prisma.glucoseEntry.findMany({
        where: {
          userId,
          recordedAt: { gte: fourHoursAgo },
        },
        select: {
          mgdlEncrypted: true,
        },
      });

      // Decrypt and count high readings
      let recentHighReadings = 0;
      for (const entry of recentEntries) {
        try {
          const decryptedValue = this.encryptionService.decryptGlucoseValue(entry.mgdlEncrypted);
          if (decryptedValue > 250) {
            recentHighReadings++;
          }
        } catch (error) {
          console.error("[Alerts] Failed to decrypt glucose entry:", error);
        }
      }

      if (recentHighReadings >= 2) {
        // Persistent hyperglycemia
        alertType = AlertType.PERSISTENT_HYPERGLYCEMIA;
        severity = AlertSeverity.HIGH;
        message = `Hiperglucemia persistente: nivel de glucosa > 250 mg/dL por más de 4 horas. Revisar medicación.`;
      } else {
        // Single hyperglycemia
        alertType = AlertType.HYPERGLYCEMIA;
        severity = AlertSeverity.MEDIUM;
        message = `Hiperglucemia: nivel de glucosa en ${glucoseMgdl} mg/dL.`;
      }
    }

    // Create alert if detected
    if (alertType && severity) {
      await this.prisma.alert.create({
        data: {
          userId,
          type: alertType,
          severity,
          message,
          glucoseReadingId,
        },
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

    return alerts.map((alert) => ({
      id: alert.id,
      userId: alert.userId,
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      glucoseReadingId: alert.glucoseReadingId || undefined,
      acknowledged: alert.acknowledged,
      acknowledgedAt: alert.acknowledgedAt?.toISOString(),
      createdAt: alert.createdAt.toISOString(),
      patient: {
        id: alert.user.id,
        email: alert.user.email,
        firstName: alert.user.firstName || undefined,
        lastName: alert.user.lastName || undefined,
      },
    }));
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

    return alerts.map((alert) => ({
      id: alert.id,
      userId: alert.userId,
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      glucoseReadingId: alert.glucoseReadingId || undefined,
      acknowledged: alert.acknowledged,
      acknowledgedAt: alert.acknowledgedAt?.toISOString(),
      createdAt: alert.createdAt.toISOString(),
      patient: {
        id: alert.user.id,
        email: alert.user.email,
        firstName: alert.user.firstName || undefined,
        lastName: alert.user.lastName || undefined,
      },
    }));
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

    return alerts.map((alert) => ({
      id: alert.id,
      userId: alert.userId,
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      glucoseReadingId: alert.glucoseReadingId || undefined,
      acknowledged: alert.acknowledged,
      acknowledgedAt: alert.acknowledgedAt?.toISOString(),
      createdAt: alert.createdAt.toISOString(),
      patient: {
        id: alert.user.id,
        email: alert.user.email,
        firstName: alert.user.firstName || undefined,
        lastName: alert.user.lastName || undefined,
      },
    }));
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

    return {
      id: updated.id,
      userId: updated.userId,
      type: updated.type,
      severity: updated.severity,
      message: updated.message,
      glucoseReadingId: updated.glucoseReadingId || undefined,
      acknowledged: updated.acknowledged,
      acknowledgedAt: updated.acknowledgedAt?.toISOString(),
      createdAt: updated.createdAt.toISOString(),
      patient: {
        id: updated.user.id,
        email: updated.user.email,
        firstName: updated.user.firstName || undefined,
        lastName: updated.user.lastName || undefined,
      },
    };
  }
}
