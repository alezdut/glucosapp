import { Injectable, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { DoctorUtilsService } from "../../common/services/doctor-utils.service";
import { EncryptionService } from "../../common/services/encryption.service";
import { DashboardSummaryDto } from "./dto/dashboard-summary.dto";
import { GlucoseEvolutionDto, GlucoseEvolutionPointDto } from "./dto/glucose-evolution.dto";
import { InsulinStatsDto } from "./dto/insulin-stats.dto";
import { MealStatsDto } from "./dto/meal-stats.dto";
import {
  PatientGlucoseEvolutionDto,
  PatientGlucoseEvolutionPointDto,
} from "./dto/patient-glucose-evolution.dto";
import {
  PatientInsulinStatsDto,
  PatientInsulinStatsPointDto,
} from "./dto/patient-insulin-stats.dto";

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
        mgdlEncrypted: true,
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

    // Decrypt glucose entries and readings
    const allReadings: { value: number; recordedAt: Date }[] = [
      // Decrypt glucose entries
      ...glucoseEntries
        .map((entry) => {
          try {
            const glucoseValue = this.encryptionService.decryptGlucoseValue(entry.mgdlEncrypted);
            return {
              value: glucoseValue,
              recordedAt: entry.recordedAt,
            };
          } catch (error) {
            return null;
          }
        })
        .filter((entry): entry is { value: number; recordedAt: Date } => entry !== null),
      // Decrypt sensor readings
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

    // First pass: Build all 15 days and calculate averages for days with data
    const data: (GlucoseEvolutionPointDto & { hasData: boolean })[] = Array.from(
      { length: 15 },
      (_, i) => {
        const daysAgo = 14 - i;
        const date = new Date(today);
        date.setDate(date.getDate() - daysAgo);
        const dateKey = date.toISOString().split("T")[0];

        const values = groupedByDate.get(dateKey) || [];
        if (values.length > 0) {
          // Day has data - calculate normally
          return {
            date: dateKey,
            averageGlucose: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
            minGlucose: Math.min(...values),
            maxGlucose: Math.max(...values),
            hasData: true,
          };
        }
        // Day has no data - will interpolate in second pass
        return {
          date: dateKey,
          averageGlucose: 0, // Placeholder, will be calculated
          minGlucose: 0, // Placeholder, will be calculated
          maxGlucose: 0, // Placeholder, will be calculated
          hasData: false,
        };
      },
    );

    // Second pass: Interpolate missing values for days without data
    // Find all indices with data
    const dataIndices = data
      .map((point, index) => (point.hasData ? index : null))
      .filter((index): index is number => index !== null);

    // If no data at all, return empty array so frontend can show informative message
    if (dataIndices.length === 0) {
      return { data: [] };
    }

    // If only one day has data, all days should equal that value
    if (dataIndices.length === 1) {
      const singleDataIndex = dataIndices[0];
      const singleDataPoint = data[singleDataIndex];
      return {
        data: data.map(({ hasData, ...point }, index) => {
          if (index === singleDataIndex) {
            // Preserve original values for the day with data
            return point;
          }
          // Interpolated days use averageGlucose for all values
          return {
            ...point,
            averageGlucose: singleDataPoint.averageGlucose,
            minGlucose: singleDataPoint.averageGlucose,
            maxGlucose: singleDataPoint.averageGlucose,
          };
        }),
      };
    }

    // Interpolate for days without data
    const interpolatedData = data.map((point, index) => {
      if (point.hasData) {
        return point;
      }

      let interpolatedValue: number;

      // Find the closest data points before and after this index
      const beforeIndex = dataIndices.filter((i) => i < index).pop();
      const afterIndex = dataIndices.find((i) => i > index);

      if (beforeIndex === undefined && afterIndex !== undefined) {
        // Before first data point: use first data point value
        interpolatedValue = data[afterIndex].averageGlucose;
      } else if (beforeIndex !== undefined && afterIndex === undefined) {
        // After last data point: use last data point value
        interpolatedValue = data[beforeIndex].averageGlucose;
      } else if (beforeIndex !== undefined && afterIndex !== undefined) {
        // Between two data points: linear interpolation
        const beforeValue = data[beforeIndex].averageGlucose;
        const afterValue = data[afterIndex].averageGlucose;
        const distance = afterIndex - beforeIndex;
        const position = index - beforeIndex;
        interpolatedValue = Math.round(
          beforeValue + ((afterValue - beforeValue) * position) / distance,
        );
      } else {
        // Should not happen, but fallback to 0
        interpolatedValue = 0;
      }

      return {
        ...point,
        averageGlucose: interpolatedValue,
        minGlucose: interpolatedValue,
        maxGlucose: interpolatedValue,
      };
    });

    // Remove hasData property before returning
    return { data: interpolatedData.map(({ hasData, ...point }) => point) };
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

    // Guard against zero days
    if (days === 0) {
      return {
        averageDose: 0,
        unit: "unidades/día",
        days: 0,
        description: "No se puede calcular el promedio para 0 días.",
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
    // Calculate average units per day
    const averageDose = totalUnits / days;

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

  /**
   * Get glucose evolution data for a specific patient (aggregated by month)
   * Shows monthly average, min, max for the last N months
   */
  async getPatientGlucoseEvolution(
    doctorId: string,
    patientId: string,
    months: number = 12,
  ): Promise<PatientGlucoseEvolutionDto> {
    await this.doctorUtils.verifyDoctor(doctorId);

    // Verify patient is assigned to doctor
    const assignedPatientIds = await this.doctorUtils.getDoctorPatientIds(doctorId);
    if (!assignedPatientIds.includes(patientId)) {
      throw new ForbiddenException("Patient is not assigned to this doctor");
    }

    // Calculate date range - get all available data, not limited to months parameter
    // This ensures we show all data even if patient has less than requested months
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    // Don't limit start date - get all available data
    // We'll limit to last N months only if there's too much data

    // Get all glucose entries from patient
    const glucoseEntries = await this.prisma.glucoseEntry.findMany({
      where: {
        userId: patientId,
        recordedAt: { lte: endDate },
      },
      select: {
        mgdlEncrypted: true,
        recordedAt: true,
      },
      orderBy: {
        recordedAt: "asc",
      },
    });

    // Get all glucose readings (encrypted) from patient
    const glucoseReadings = await this.prisma.glucoseReading.findMany({
      where: {
        userId: patientId,
        recordedAt: { lte: endDate },
      },
      select: {
        glucoseEncrypted: true,
        recordedAt: true,
      },
      orderBy: {
        recordedAt: "asc",
      },
    });

    // Decrypt glucose entries and readings
    const allReadings: { value: number; recordedAt: Date }[] = [
      // Decrypt glucose entries
      ...glucoseEntries
        .map((entry) => {
          try {
            const glucoseValue = this.encryptionService.decryptGlucoseValue(entry.mgdlEncrypted);
            return {
              value: glucoseValue,
              recordedAt: entry.recordedAt,
            };
          } catch (error) {
            return null;
          }
        })
        .filter((entry): entry is { value: number; recordedAt: Date } => entry !== null),
      // Decrypt sensor readings
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
            return null;
          }
        })
        .filter((reading): reading is { value: number; recordedAt: Date } => reading !== null),
    ];

    // Group by month (YYYY-MM format) using UTC to avoid timezone-dependent buckets
    const groupedByMonth = new Map<string, number[]>();

    allReadings.forEach((reading) => {
      // Ensure recordedAt is a Date object (convert from string if needed)
      const recordedAtDate =
        reading.recordedAt instanceof Date ? reading.recordedAt : new Date(reading.recordedAt);
      // Use UTC getters to avoid timezone-dependent buckets
      const monthKey = `${recordedAtDate.getUTCFullYear()}-${String(recordedAtDate.getUTCMonth() + 1).padStart(2, "0")}`;
      if (!groupedByMonth.has(monthKey)) {
        groupedByMonth.set(monthKey, []);
      }
      groupedByMonth.get(monthKey)!.push(reading.value);
    });

    // Generate data points for the last N months (always show all months, even if no data)
    const data: PatientGlucoseEvolutionPointDto[] = [];
    const today = new Date();

    // Generate all months from (today - months) to today using UTC
    for (let i = months - 1; i >= 0; i--) {
      // Calculate target month in UTC
      const targetYear = today.getUTCFullYear();
      const targetMonth = today.getUTCMonth() - i;
      // Handle year rollover
      const year = targetMonth < 0 ? targetYear - 1 : targetYear;
      const month = targetMonth < 0 ? 12 + targetMonth : targetMonth;
      const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
      const values = groupedByMonth.get(monthKey) || [];
      if (values.length > 0) {
        // Calculate average, min, max for the month (even if partial)
        data.push({
          month: monthKey,
          averageGlucose: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
          minGlucose: Math.min(...values),
          maxGlucose: Math.max(...values),
        });
      } else {
        // Include month even if no data (bar will be at 0)
        data.push({
          month: monthKey,
          averageGlucose: 0,
          minGlucose: 0,
          maxGlucose: 0,
        });
      }
    }

    return { data };
  }

  /**
   * Get insulin statistics for a specific patient (aggregated by month)
   * Shows monthly average of basal and bolus doses for the last N months
   */
  async getPatientInsulinStats(
    doctorId: string,
    patientId: string,
    months: number = 12,
  ): Promise<PatientInsulinStatsDto> {
    await this.doctorUtils.verifyDoctor(doctorId);

    // Verify patient is assigned to doctor
    const assignedPatientIds = await this.doctorUtils.getDoctorPatientIds(doctorId);
    if (!assignedPatientIds.includes(patientId)) {
      throw new ForbiddenException("Patient is not assigned to this doctor");
    }

    // Calculate date range - get all available data, not limited to months parameter
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    // Don't limit start date - get all available data

    // Get all insulin doses from patient
    const doses = await this.prisma.insulinDose.findMany({
      where: {
        userId: patientId,
        recordedAt: { lte: endDate },
      },
      select: {
        units: true,
        type: true,
        recordedAt: true,
      },
      orderBy: {
        recordedAt: "asc",
      },
    });

    // Group by month and type
    const groupedByMonth = new Map<string, { basal: number[]; bolus: number[] }>();

    doses.forEach((dose) => {
      // Ensure recordedAt is a Date object (convert from string if needed)
      const recordedAtDate =
        dose.recordedAt instanceof Date ? dose.recordedAt : new Date(dose.recordedAt);
      // Use UTC getters to avoid timezone-dependent buckets
      const monthKey = `${recordedAtDate.getUTCFullYear()}-${String(recordedAtDate.getUTCMonth() + 1).padStart(2, "0")}`;
      if (!groupedByMonth.has(monthKey)) {
        groupedByMonth.set(monthKey, { basal: [], bolus: [] });
      }
      const monthData = groupedByMonth.get(monthKey)!;
      if (dose.type === "BASAL") {
        monthData.basal.push(dose.units);
      } else if (dose.type === "BOLUS") {
        monthData.bolus.push(dose.units);
      }
    });

    // Generate data points for the last N months (always show all months, even if no data)
    const data: PatientInsulinStatsPointDto[] = [];
    const today = new Date();

    // Generate all months from (today - months) to today
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      const monthData = groupedByMonth.get(monthKey) || { basal: [], bolus: [] };

      if (monthData.basal.length > 0 || monthData.bolus.length > 0) {
        // Calculate averages for months with data
        const averageBasal =
          monthData.basal.length > 0
            ? Math.round(
                (monthData.basal.reduce((a, b) => a + b, 0) / monthData.basal.length) * 10,
              ) / 10
            : 0;

        const averageBolus =
          monthData.bolus.length > 0
            ? Math.round(
                (monthData.bolus.reduce((a, b) => a + b, 0) / monthData.bolus.length) * 10,
              ) / 10
            : 0;

        data.push({
          month: monthKey,
          averageBasal,
          averageBolus,
        });
      } else {
        // Include month even if no data (bars will be at 0)
        data.push({
          month: monthKey,
          averageBasal: 0,
          averageBolus: 0,
        });
      }
    }

    return { data };
  }
}
