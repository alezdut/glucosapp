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
}
