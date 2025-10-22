import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateLogEntryDto } from "./dto/create-log-entry.dto";

/**
 * Service handling log entries
 */
@Injectable()
export class LogEntriesService {
  constructor(private readonly prisma: PrismaService) {}

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
            mealType: data.mealType,
            isCorrection: data.carbohydrates === undefined || data.carbohydrates === 0,
            recordedAt,
          },
        });
      }

      // Create meal if provided
      let meal = null;
      if (data.mealName && data.carbohydrates !== undefined) {
        meal = await tx.meal.create({
          data: {
            userId,
            name: data.mealName,
            carbohydrates: data.carbohydrates,
            mealType: data.mealType,
            recordedAt,
          },
        });
      }

      // Create log entry linking everything together
      const logEntry = await tx.logEntry.create({
        data: {
          userId,
          recordedAt,
          glucoseEntryId: glucoseEntry.id,
          insulinDoseId: insulinDose?.id,
          mealId: meal?.id,
        },
        include: {
          glucoseEntry: true,
          insulinDose: insulinDose ? true : false,
          meal: true,
        },
      });

      return logEntry;
    });
  }
}
