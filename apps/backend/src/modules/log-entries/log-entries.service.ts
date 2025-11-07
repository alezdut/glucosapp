import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { EncryptionService } from "../../common/services/encryption.service";
import { CreateLogEntryDto } from "./dto/create-log-entry.dto";

/**
 * Service handling log entries
 */
@Injectable()
export class LogEntriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
  ) {}

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

    // Decrypt glucose values in the results
    const decryptedResults = results.map((entry) => {
      if (entry.glucoseEntry) {
        try {
          const decryptedMgdl = this.encryptionService.decryptGlucoseValue(
            entry.glucoseEntry.mgdlEncrypted,
          );
          return {
            ...entry,
            glucoseEntry: {
              ...entry.glucoseEntry,
              mgdl: decryptedMgdl, // Add decrypted value for client compatibility
            } as any,
          };
        } catch (error) {
          console.error(
            `[LogEntries] Failed to decrypt glucose entry ${entry.glucoseEntry.id}:`,
            error,
          );
          // Return entry without decrypted value if decryption fails
          return entry;
        }
      }
      return entry;
    });

    return decryptedResults;
  }

  /**
   * Create log entry with related glucose, insulin, and optional meal
   */
  async create(userId: string, data: CreateLogEntryDto) {
    const recordedAt = data.recordedAt ? new Date(data.recordedAt) : new Date();

    return this.prisma.$transaction(async (tx) => {
      // Create glucose entry with encryption
      const mgdlEncrypted = this.encryptionService.encryptGlucoseValue(data.glucoseMgdl);
      const glucoseEntry = await tx.glucoseEntry.create({
        data: {
          userId,
          mgdlEncrypted,
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
