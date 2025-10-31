import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { EncryptionService } from "../../common/services/encryption.service";
import { CreateSensorReadingDto, ReadingSource } from "./dto/create-sensor-reading.dto";
import { BatchCreateSensorReadingsDto } from "./dto/batch-create-sensor-readings.dto";
import { ExportReadingsQueryDto, ExportFormat } from "./dto/export-readings-query.dto";

/**
 * Service for managing sensor readings
 * Handles encryption, storage, retrieval, and export of CGM data
 */
@Injectable()
export class SensorReadingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
  ) {}

  /**
   * Create a single sensor reading
   *
   * @param userId - User ID
   * @param data - Reading data
   * @returns Created reading
   */
  async createReading(userId: string, data: CreateSensorReadingDto) {
    // Validate glucose value
    if (!data.glucose || typeof data.glucose !== "number") {
      throw new BadRequestException("Invalid glucose value");
    }

    // Encrypt glucose value with server-side key
    const glucoseEncrypted = this.encryptionService.encryptGlucoseValue(data.glucose);

    // Validate timestamp
    const recordedAt = new Date(data.recordedAt);
    const now = new Date();

    if (recordedAt > now) {
      throw new BadRequestException("Recorded time cannot be in the future");
    }

    // Check if reading already exists (prevent duplicates)
    const existing = await this.prisma.glucoseReading.findFirst({
      where: {
        userId,
        recordedAt,
        source: data.source || ReadingSource.MANUAL,
      },
    });

    if (existing) {
      return existing; // Return existing reading instead of creating duplicate
    }

    return this.prisma.glucoseReading.create({
      data: {
        userId,
        glucoseEncrypted,
        recordedAt,
        source: data.source || ReadingSource.MANUAL,
        isHistorical: data.isHistorical || false,
      },
    });
  }

  /**
   * Batch create sensor readings
   * Optimized for importing historical data from sensors
   *
   * @param userId - User ID
   * @param data - Batch data
   * @returns Created readings count
   */
  async batchCreateReadings(userId: string, data: BatchCreateSensorReadingsDto) {
    if (!data.readings || data.readings.length === 0) {
      throw new BadRequestException("No readings provided");
    }

    if (data.readings.length > 100) {
      throw new BadRequestException("Maximum 100 readings per batch");
    }

    // Validate all timestamps
    const now = new Date();
    for (const reading of data.readings) {
      const recordedAt = new Date(reading.recordedAt);
      if (recordedAt > now) {
        throw new BadRequestException("Recorded time cannot be in the future");
      }
    }

    // Use transaction for atomicity
    const result = await this.prisma.$transaction(async (tx) => {
      const created = [];

      for (const reading of data.readings) {
        const recordedAt = new Date(reading.recordedAt);

        // Check for duplicates
        const existing = await tx.glucoseReading.findFirst({
          where: {
            userId,
            recordedAt,
            source: reading.source || ReadingSource.MANUAL,
          },
        });

        if (!existing) {
          // Encrypt glucose value with server-side key
          const glucoseEncrypted = this.encryptionService.encryptGlucoseValue(reading.glucose);

          const newReading = await tx.glucoseReading.create({
            data: {
              userId,
              glucoseEncrypted,
              recordedAt,
              source: reading.source || ReadingSource.MANUAL,
              isHistorical: reading.isHistorical || false,
            },
          });
          created.push(newReading);
        }
      }

      return created;
    });

    return {
      created: result.length,
      skipped: data.readings.length - result.length,
      total: data.readings.length,
      readings: result,
    };
  }

  /**
   * Get readings by date range
   *
   * @param userId - User ID
   * @param startDate - Start date (optional)
   * @param endDate - End date (optional)
   * @returns Array of readings
   */
  async getReadingsByDateRange(userId: string, startDate?: Date, endDate?: Date) {
    const where: any = { userId };

    if (startDate || endDate) {
      where.recordedAt = {};
      if (startDate) {
        where.recordedAt.gte = startDate;
      }
      if (endDate) {
        where.recordedAt.lte = endDate;
      }
    }

    const results = await this.prisma.glucoseReading.findMany({
      where,
      orderBy: {
        recordedAt: "asc",
      },
    });

    return results;
  }

  /**
   * Export readings as JSON or CSV
   *
   * @param userId - User ID
   * @param query - Export query parameters
   * @returns Export data
   */
  async exportReadings(userId: string, query: ExportReadingsQueryDto) {
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;

    const readings = await this.getReadingsByDateRange(userId, startDate, endDate);

    // Decrypt glucose values for export - return array of DecryptedSensorReading
    const decryptedReadings = readings
      .map((reading) => {
        try {
          const glucose = this.encryptionService.decryptGlucoseValue(reading.glucoseEncrypted);
          return {
            id: reading.id,
            userId: reading.userId,
            glucose: glucose,
            recordedAt: reading.recordedAt.toISOString(),
            source: reading.source,
            isHistorical: reading.isHistorical,
            createdAt: reading.createdAt.toISOString(),
          };
        } catch (error) {
          console.error("[SensorReadings] Failed to decrypt reading:", reading.id, error);
          return null;
        }
      })
      .filter((r) => r !== null);

    const format = query.format || ExportFormat.JSON;

    if (format === ExportFormat.CSV) {
      return this.generateCsv(decryptedReadings);
    }

    // For JSON format, just return the array of decrypted readings
    // This matches the DecryptedSensorReading[] type expected by the frontend
    return decryptedReadings;
  }

  /**
   * Generate CSV export
   *
   * @param readings - Decrypted readings
   * @returns CSV string
   */
  private generateCsv(readings: any[]): string {
    const headers = ["recordedAt", "glucose_mgdl", "source", "isHistorical"];
    const rows = readings.map((r) => [r.recordedAt, r.glucose, r.source, r.isHistorical]);

    const csvRows = [headers.join(","), ...rows.map((row) => row.join(","))];

    return csvRows.join("\n");
  }

  /**
   * Get the most recent sensor reading for a user
   *
   * @param userId - User ID
   * @returns Latest reading or null if none exist
   */
  async getLatestReading(userId: string) {
    const latestReading = await this.prisma.glucoseReading.findFirst({
      where: { userId },
      orderBy: { recordedAt: "desc" },
      select: {
        id: true,
        recordedAt: true,
        source: true,
      },
    });

    return latestReading;
  }

  /**
   * Get statistics for sensor readings
   *
   * @param userId - User ID
   * @param days - Number of days to include (default: 30)
   * @returns Statistics
   */
  async getStatistics(userId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const readings = await this.getReadingsByDateRange(userId, startDate);

    if (readings.length === 0) {
      return {
        totalReadings: 0,
        averageGlucose: null,
        minGlucose: null,
        maxGlucose: null,
      };
    }

    // Decrypt and calculate statistics
    const glucoseValues = readings
      .map((r) => {
        try {
          return this.encryptionService.decryptGlucoseValue(r.glucoseEncrypted);
        } catch {
          return null;
        }
      })
      .filter((v): v is number => v !== null);

    if (glucoseValues.length === 0) {
      return {
        totalReadings: readings.length,
        averageGlucose: null,
        minGlucose: null,
        maxGlucose: null,
      };
    }

    const sum = glucoseValues.reduce((a, b) => a + b, 0);
    const avg = sum / glucoseValues.length;

    return {
      totalReadings: readings.length,
      averageGlucose: Math.round(avg),
      minGlucose: Math.min(...glucoseValues),
      maxGlucose: Math.max(...glucoseValues),
    };
  }
}
