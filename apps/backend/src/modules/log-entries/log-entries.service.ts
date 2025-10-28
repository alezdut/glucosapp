import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateLogEntryDto } from "./dto/create-log-entry.dto";

/**
 * Service handling log entries
 */
@Injectable()
export class LogEntriesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find all log entries for a user with optional date range filtering
   */
  async findAll(userId: string, startDate?: string, endDate?: string) {
    const whereClause: Prisma.LogEntryWhereInput = {
      userId,
    };

    // Add date range filtering if provided
    if (startDate || endDate) {
      whereClause.recordedAt = {};
      if (startDate) {
        whereClause.recordedAt.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.recordedAt.lte = new Date(endDate);
      }
    }

    const results = await this.prisma.logEntry.findMany({
      where: whereClause,
      include: {
        glucoseEntry: true,
        insulinDose: true,
        mealTemplate: {
          include: {
            foodItems: true,
          },
        },
      },
      orderBy: {
        recordedAt: "desc",
      },
    });

    return results;
  }

  /**
   * Create log entry with related glucose, insulin, and optional meal
   */
  async create(userId: string, data: CreateLogEntryDto) {
    const recordedAt = data.recordedAt ? new Date(data.recordedAt) : new Date();

    return this.prisma.$transaction(async (tx) => {
      // Create glucose entry
      const glucoseEntry = await tx.glucoseEntry.create({
        data: {
          userId,
          mgdl: data.glucoseMgdl,
          recordedAt,
        },
      });

      // Create insulin dose only if user actually injected insulin
      let insulinDose = null;
      if (data.insulinUnits > 0) {
        insulinDose = await tx.insulinDose.create({
          data: {
            userId,
            units: data.insulinUnits,
            calculatedUnits: data.calculatedInsulinUnits || data.insulinUnits,
            wasManuallyEdited: data.wasManuallyEdited || false,
            type: data.insulinType,
            isCorrection: data.carbohydrates === undefined || data.carbohydrates === 0,
            recordedAt,
            // Calculation breakdown
            carbInsulin: data.carbInsulin,
            correctionInsulin: data.correctionInsulin,
            iobSubtracted: data.iobSubtracted,
          },
        });
      }

      // Create log entry linking everything together
      const logEntry = await tx.logEntry.create({
        data: {
          userId,
          recordedAt,
          mealType: data.mealType,
          carbohydrates: data.carbohydrates,
          glucoseEntryId: glucoseEntry.id,
          insulinDoseId: insulinDose?.id,
          mealTemplateId: null, // Future: support template selection
          // Context factors
          recentExercise: data.recentExercise || false,
          alcohol: data.alcohol || false,
          illness: data.illness || false,
          stress: data.stress || false,
          menstruation: data.menstruation || false,
          highFatMeal: data.highFatMeal || false,
        },
        include: {
          glucoseEntry: true,
          insulinDose: insulinDose ? true : false,
        },
      });

      return logEntry;
    });
  }
}
