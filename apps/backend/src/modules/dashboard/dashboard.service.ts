import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { DoctorUtilsService } from "../../common/services/doctor-utils.service";
import { EncryptionService } from "../../common/services/encryption.service";
import { DashboardSummaryDto } from "./dto/dashboard-summary.dto";
import { GlucoseEvolutionDto, GlucoseEvolutionPointDto } from "./dto/glucose-evolution.dto";
import { InsulinStatsDto } from "./dto/insulin-stats.dto";
import { MealStatsDto } from "./dto/meal-stats.dto";

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly doctorUtils: DoctorUtilsService,
    private readonly encryptionService: EncryptionService,
  ) {}

  /**
   * Get dashboard summary (active patients, critical alerts, upcoming appointments)
   */
  async getSummary(doctorId: string): Promise<DashboardSummaryDto> {
    await this.doctorUtils.verifyDoctor(doctorId);

    const patientIds = await this.doctorUtils.getDoctorPatientIds(doctorId);

    // Count active patients (patients with recent activity in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activePatientsCount = await this.prisma.user.count({
      where: {
        id: { in: patientIds },
        OR: [
          {
            glucoseReadings: {
              some: {
                recordedAt: { gte: thirtyDaysAgo },
              },
            },
          },
          {
            insulinDoses: {
              some: {
                recordedAt: { gte: thirtyDaysAgo },
              },
            },
          },
          {
            meals: {
              some: {
                createdAt: { gte: thirtyDaysAgo },
              },
            },
          },
        ],
      },
    });

    // Count critical alerts (not acknowledged, severity CRITICAL or HIGH)
    const criticalAlertsCount = await this.prisma.alert.count({
      where: {
        userId: { in: patientIds },
        acknowledged: false,
        severity: { in: ["CRITICAL", "HIGH"] },
      },
    });

    // Count upcoming appointments (in next 7 days)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const now = new Date();

    const upcomingAppointmentsCount = await this.prisma.appointment.count({
      where: {
        doctorId,
        scheduledAt: {
          gte: now,
          lte: sevenDaysFromNow,
        },
        status: {
          in: ["SCHEDULED", "CONFIRMED"],
        },
      },
    });

    return {
      activePatients: activePatientsCount,
      criticalAlerts: criticalAlertsCount,
      upcomingAppointments: upcomingAppointmentsCount,
    };
  }

  /**
   * Get glucose evolution data for the last 15 days (aggregated by day)
   * Shows daily average of all patients under treatment
   */
  async getGlucoseEvolution(doctorId: string): Promise<GlucoseEvolutionDto> {
    await this.doctorUtils.verifyDoctor(doctorId);

    const patientIds = await this.doctorUtils.getDoctorPatientIds(doctorId);
    if (patientIds.length === 0) {
      return { data: [] };
    }

    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
    fifteenDaysAgo.setHours(0, 0, 0, 0);

    // Get all glucose entries from patients in the last 15 days
    const glucoseEntries = await this.prisma.glucoseEntry.findMany({
      where: {
        userId: { in: patientIds },
        recordedAt: { gte: fifteenDaysAgo },
      },
      select: {
        mgdl: true,
        recordedAt: true,
      },
      orderBy: {
        recordedAt: "asc",
      },
    });

    // Get all glucose readings (encrypted) from patients in the last 15 days
    const glucoseReadings = await this.prisma.glucoseReading.findMany({
      where: {
        userId: { in: patientIds },
        recordedAt: { gte: fifteenDaysAgo },
      },
      select: {
        glucoseEncrypted: true,
        recordedAt: true,
      },
      orderBy: {
        recordedAt: "asc",
      },
    });

    // Decrypt glucose readings and combine with entries
    const allReadings: { value: number; recordedAt: Date }[] = [
      // Manual entries (already in mg/dL)
      ...glucoseEntries.map((entry) => ({
        value: entry.mgdl,
        recordedAt: entry.recordedAt,
      })),
      // Sensor readings (need to decrypt)
      ...glucoseReadings
        .map((reading) => {
          try {
            const glucoseValue = this.encryptionService.decryptGlucoseValue(
              reading.glucoseEncrypted,
            );
            return {
              value: glucoseValue,
              recordedAt: reading.recordedAt,
            };
          } catch (error) {
            console.error("[Dashboard] Failed to decrypt glucose reading:", error);
            return null;
          }
        })
        .filter((reading): reading is { value: number; recordedAt: Date } => reading !== null),
    ];

    // Group by date and calculate daily averages, min, max for all patients
    const groupedByDate = new Map<string, number[]>();

    allReadings.forEach((reading) => {
      const dateKey = reading.recordedAt.toISOString().split("T")[0];
      if (!groupedByDate.has(dateKey)) {
        groupedByDate.set(dateKey, []);
      }
      groupedByDate.get(dateKey)!.push(reading.value);
    });

    // Generate data points for the last 15 days
    // Calculate daily average across all patients for each day
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const data: GlucoseEvolutionPointDto[] = [];

    for (let i = 14; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split("T")[0];

      const values = groupedByDate.get(dateKey) || [];
      // Only include days with data (daily average of all patients)
      if (values.length > 0) {
        data.push({
          date: dateKey,
          averageGlucose: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
          minGlucose: Math.min(...values),
          maxGlucose: Math.max(...values),
        });
      }
    }

    return { data };
  }

  /**
   * Get insulin statistics for doctor's patients
   */
  async getInsulinStats(doctorId: string, days: number = 30): Promise<InsulinStatsDto> {
    await this.doctorUtils.verifyDoctor(doctorId);

    const patientIds = await this.doctorUtils.getDoctorPatientIds(doctorId);
    if (patientIds.length === 0) {
      return {
        averageDose: 0,
        unit: "unidades/día",
        days,
        description: `En los últimos ${days} días, sus pacientes no tienen registros de insulina.`,
      };
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Get all insulin doses from patients in the specified period
    const doses = await this.prisma.insulinDose.findMany({
      where: {
        userId: { in: patientIds },
        recordedAt: { gte: startDate },
      },
      select: {
        units: true,
      },
    });

    if (doses.length === 0) {
      return {
        averageDose: 0,
        unit: "unidades/día",
        days,
        description: `En los últimos ${days} días, sus pacientes no tienen registros de insulina.`,
      };
    }

    const totalUnits = doses.reduce((sum, dose) => sum + dose.units, 0);
    const averageDose = totalUnits / doses.length;

    return {
      averageDose: Math.round(averageDose * 10) / 10, // Round to 1 decimal
      unit: "unidades/día",
      days,
      description: `En los últimos ${days} días, sus pacientes promedian ${Math.round(averageDose * 10) / 10} unidades/día.`,
    };
  }

  /**
   * Get meal statistics for doctor's patients
   */
  async getMealStats(doctorId: string, days: number = 30): Promise<MealStatsDto> {
    await this.doctorUtils.verifyDoctor(doctorId);

    const patientIds = await this.doctorUtils.getDoctorPatientIds(doctorId);
    if (patientIds.length === 0) {
      return {
        totalMeals: 0,
        unit: "comidas",
        description: "Sus pacientes no tienen registros de comidas.",
      };
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const totalMeals = await this.prisma.meal.count({
      where: {
        userId: { in: patientIds },
        createdAt: { gte: startDate },
      },
    });

    const periodText = days === 30 ? "el mes pasado" : `en los últimos ${days} días`;

    return {
      totalMeals,
      unit: "comidas",
      description: `Sus pacientes registraron ${totalMeals} comidas ${periodText}.`,
    };
  }
}
