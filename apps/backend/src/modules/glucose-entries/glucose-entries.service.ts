import { Injectable, Inject, forwardRef } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { EncryptionService } from "../../common/services/encryption.service";
import { AlertsService } from "../alerts/alerts.service";
import { CreateGlucoseEntryDto } from "./dto/create-glucose-entry.dto";

/**
 * Service handling glucose entries
 */
@Injectable()
export class GlucoseEntriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
    @Inject(forwardRef(() => AlertsService))
    private readonly alertsService: AlertsService,
  ) {}

  /**
   * Create glucose entry and detect alerts
   */
  async create(userId: string, data: CreateGlucoseEntryDto) {
    // Encrypt glucose value
    const mgdlEncrypted = this.encryptionService.encryptGlucoseValue(data.mgdl);

    const glucoseEntry = await this.prisma.glucoseEntry.create({
      data: {
        userId,
        mgdlEncrypted,
        note: data.note,
        recordedAt: data.recordedAt ? new Date(data.recordedAt) : new Date(),
      },
    });

    // Detect and create alerts based on glucose value
    // Use non-blocking approach to avoid slowing down the response
    this.alertsService.detectAlert(userId, data.mgdl, undefined, glucoseEntry.id).catch((error) => {
      console.error("[GlucoseEntries] Failed to detect alert:", error);
    });

    return glucoseEntry;
  }
}
