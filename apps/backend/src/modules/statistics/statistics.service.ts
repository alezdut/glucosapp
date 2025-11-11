import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { EncryptionService } from "../../common/services/encryption.service";
import { StatisticsResponseDto } from "./dto/statistics-response.dto";

/**
 * Service handling statistics calculations
 */
@Injectable()
export class StatisticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
  ) {}

  /**
   * Get summary statistics for home screen
   */
  async getSummary(userId: string): Promise<StatisticsResponseDto> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Calculate average glucose (last 7 days) - combine manual entries and sensor readings
    const glucoseEntries = await this.prisma.glucoseEntry.findMany({
      where: {
        userId,
        recordedAt: {
          gte: sevenDaysAgo,
        },
      },
      select: {
        mgdlEncrypted: true,
      },
    });

    // Get sensor readings from last 7 days
    const sensorReadings = await this.prisma.glucoseReading.findMany({
      where: {
        userId,
        recordedAt: {
          gte: sevenDaysAgo,
        },
      },
      select: {
        glucoseEncrypted: true,
      },
    });

    // Decrypt glucose entries and sensor readings to collect all glucose values
    const allGlucoseValues: number[] = [
      // Decrypt glucose entries
      ...glucoseEntries
        .map((entry) => {
          try {
            return this.encryptionService.decryptGlucoseValue(entry.mgdlEncrypted);
          } catch (error) {
            console.error("[Statistics] Failed to decrypt glucose entry:", error);
            return null;
          }
        })
        .filter((value): value is number => value !== null),
      // Decrypt sensor readings
      ...sensorReadings
        .map((reading) => {
          try {
            return this.encryptionService.decryptGlucoseValue(reading.glucoseEncrypted);
          } catch (error) {
            console.error("[Statistics] Failed to decrypt sensor reading:", error);
            return null;
          }
        })
        .filter((value): value is number => value !== null),
    ];

    const averageGlucose =
      allGlucoseValues.length > 0
        ? Math.round(
            allGlucoseValues.reduce((sum, value) => sum + value, 0) / allGlucoseValues.length,
          )
        : 0;

    // Calculate total daily insulin dose (today)
    const insulinDoses = await this.prisma.insulinDose.findMany({
      where: {
        userId,
        recordedAt: {
          gte: startOfToday,
        },
      },
      select: {
        units: true,
      },
    });

    const dailyInsulinDose =
      insulinDoses.length > 0
        ? Math.round(insulinDoses.reduce((sum, dose) => sum + dose.units, 0))
        : 0;

    // Count meals registered today (from log entries with carbohydrates)
    const mealsRegistered = await this.prisma.logEntry.count({
      where: {
        userId,
        recordedAt: {
          gte: startOfToday,
        },
        carbohydrates: {
          gt: 0,
        },
      },
    });

    return {
      averageGlucose,
      dailyInsulinDose,
      mealsRegistered,
    };
  }

  /**
   * Get weekly glucose average (last 7 days)
   */
  async getWeeklyGlucoseAverage(userId: string): Promise<{ averageGlucose: number }> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const glucoseEntries = await this.prisma.glucoseEntry.findMany({
      where: {
        userId,
        recordedAt: {
          gte: sevenDaysAgo,
        },
      },
      select: {
        mgdlEncrypted: true,
      },
    });

    const sensorReadings = await this.prisma.glucoseReading.findMany({
      where: {
        userId,
        recordedAt: {
          gte: sevenDaysAgo,
        },
      },
      select: {
        glucoseEncrypted: true,
      },
    });

    const allGlucoseValues: number[] = [
      ...glucoseEntries
        .map((entry) => {
          try {
            return this.encryptionService.decryptGlucoseValue(entry.mgdlEncrypted);
          } catch (error) {
            console.error("[Statistics] Failed to decrypt glucose entry:", error);
            return null;
          }
        })
        .filter((value): value is number => value !== null),
      ...sensorReadings
        .map((reading) => {
          try {
            return this.encryptionService.decryptGlucoseValue(reading.glucoseEncrypted);
          } catch (error) {
            console.error("[Statistics] Failed to decrypt sensor reading:", error);
            return null;
          }
        })
        .filter((value): value is number => value !== null),
    ];

    const averageGlucose =
      allGlucoseValues.length > 0
        ? Math.round(
            allGlucoseValues.reduce((sum, value) => sum + value, 0) / allGlucoseValues.length,
          )
        : 0;

    return { averageGlucose };
  }

  /**
   * Get daily insulin average (last 7 days)
   */
  async getDailyInsulinAverage(userId: string): Promise<{ averageDose: number }> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const insulinDoses = await this.prisma.insulinDose.findMany({
      where: {
        userId,
        recordedAt: {
          gte: sevenDaysAgo,
        },
      },
      select: {
        units: true,
      },
    });

    const totalUnits = insulinDoses.reduce((sum, dose) => sum + dose.units, 0);
    const days = 7;
    const averageDose = days > 0 ? Math.round((totalUnits / days) * 10) / 10 : 0;

    return { averageDose };
  }

  /**
   * Get glucose trend for the last 7 days (daily averages)
   */
  async getGlucoseTrend(userId: string): Promise<{
    data: Array<{
      date: string;
      averageGlucose: number;
    }>;
  }> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const glucoseEntries = await this.prisma.glucoseEntry.findMany({
      where: {
        userId,
        recordedAt: {
          gte: sevenDaysAgo,
        },
      },
      select: {
        mgdlEncrypted: true,
        recordedAt: true,
      },
    });

    const sensorReadings = await this.prisma.glucoseReading.findMany({
      where: {
        userId,
        recordedAt: {
          gte: sevenDaysAgo,
        },
      },
      select: {
        glucoseEncrypted: true,
        recordedAt: true,
      },
    });

    // Combine and decrypt all readings
    const allReadings: Array<{ value: number; date: Date }> = [
      ...glucoseEntries
        .map((entry) => {
          try {
            const value = this.encryptionService.decryptGlucoseValue(entry.mgdlEncrypted);
            return {
              value,
              date: new Date(entry.recordedAt),
            };
          } catch (error) {
            console.error("[Statistics] Failed to decrypt glucose entry:", error);
            return null;
          }
        })
        .filter((r): r is { value: number; date: Date } => r !== null),
      ...sensorReadings
        .map((reading) => {
          try {
            const value = this.encryptionService.decryptGlucoseValue(reading.glucoseEncrypted);
            return {
              value,
              date: new Date(reading.recordedAt),
            };
          } catch (error) {
            console.error("[Statistics] Failed to decrypt sensor reading:", error);
            return null;
          }
        })
        .filter((r): r is { value: number; date: Date } => r !== null),
    ];

    // Group by day (YYYY-MM-DD format) using local date to avoid timezone issues
    const groupedByDay = new Map<string, number[]>();

    allReadings.forEach((reading) => {
      // Use local date components to avoid timezone shifts
      const date = new Date(reading.date);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;

      if (!groupedByDay.has(dateStr)) {
        groupedByDay.set(dateStr, []);
      }
      groupedByDay.get(dateStr)!.push(reading.value);
    });

    // First pass: Calculate actual averages for days with data
    const rawData: Array<{ date: string; averageGlucose: number; hasData: boolean }> = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(12, 0, 0, 0); // Set to noon for consistent positioning

      // Use local date components
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;

      const dayReadings = groupedByDay.get(dateStr) || [];
      let averageGlucose = 0;
      const hasData = dayReadings.length > 0;

      if (hasData) {
        averageGlucose = Math.round(
          dayReadings.reduce((sum, val) => sum + val, 0) / dayReadings.length,
        );
      }

      rawData.push({
        date: dateStr,
        averageGlucose,
        hasData,
      });
    }

    // Second pass: Interpolate missing days using previous and next day averages
    const data: Array<{ date: string; averageGlucose: number }> = rawData.map((day, index) => {
      if (day.hasData) {
        // Day has data, use actual average
        return {
          date: day.date,
          averageGlucose: day.averageGlucose,
        };
      }

      // Day has no data - interpolate from adjacent days
      let prevAverage: number | null = null;
      let nextAverage: number | null = null;

      // Find previous day with data
      for (let j = index - 1; j >= 0; j--) {
        if (rawData[j].hasData) {
          prevAverage = rawData[j].averageGlucose;
          break;
        }
      }

      // Find next day with data
      for (let j = index + 1; j < rawData.length; j++) {
        if (rawData[j].hasData) {
          nextAverage = rawData[j].averageGlucose;
          break;
        }
      }

      // Calculate interpolated average
      if (prevAverage !== null && nextAverage !== null) {
        // Average of previous and next day
        return {
          date: day.date,
          averageGlucose: Math.round((prevAverage + nextAverage) / 2),
        };
      } else if (prevAverage !== null) {
        // Only previous day available - use its value
        return {
          date: day.date,
          averageGlucose: prevAverage,
        };
      } else if (nextAverage !== null) {
        // Only next day available - use its value
        return {
          date: day.date,
          averageGlucose: nextAverage,
        };
      }

      // No adjacent days with data - return 0
      return {
        date: day.date,
        averageGlucose: 0,
      };
    });

    return { data };
  }
}
