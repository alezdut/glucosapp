import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { EncryptionService } from "../../common/services/encryption.service";
import { CreateGlucoseEntryDto } from "./dto/create-glucose-entry.dto";

/**
 * Service handling glucose entries
 */
@Injectable()
export class GlucoseEntriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
  ) {}

  /**
   * Create glucose entry
   */
  async create(userId: string, data: CreateGlucoseEntryDto) {
    // Encrypt glucose value
    const mgdlEncrypted = this.encryptionService.encryptGlucoseValue(data.mgdl);

    return this.prisma.glucoseEntry.create({
      data: {
        userId,
        mgdlEncrypted,
        note: data.note,
        recordedAt: data.recordedAt ? new Date(data.recordedAt) : new Date(),
      },
    });
  }
}
