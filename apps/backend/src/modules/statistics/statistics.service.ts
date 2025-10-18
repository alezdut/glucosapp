import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { StatisticsResponseDto } from "./dto/statistics-response.dto";

/**
 * Service handling statistics calculations
 */
@Injectable()
export class StatisticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get summary statistics for home screen
   */
  async getSummary(userId: string): Promise<StatisticsResponseDto> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Calculate average glucose (last 7 days)
    const glucoseEntries = await this.prisma.glucoseEntry.findMany({
      where: {
        userId,
        recordedAt: {
          gte: sevenDaysAgo,
        },
      },
      select: {
        mgdl: true,
      },
    });

    const averageGlucose =
      glucoseEntries.length > 0
        ? Math.round(
            glucoseEntries.reduce((sum, entry) => sum + entry.mgdl, 0) / glucoseEntries.length,
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

    // Count meals registered today
    const mealsRegistered = await this.prisma.meal.count({
      where: {
        userId,
        recordedAt: {
          gte: startOfToday,
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
