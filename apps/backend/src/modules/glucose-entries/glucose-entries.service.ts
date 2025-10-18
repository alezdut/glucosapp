import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateGlucoseEntryDto } from "./dto/create-glucose-entry.dto";

/**
 * Service handling glucose entries
 */
@Injectable()
export class GlucoseEntriesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create glucose entry
   */
  async create(userId: string, data: CreateGlucoseEntryDto) {
    return this.prisma.glucoseEntry.create({
      data: {
        userId,
        mgdl: data.mgdl,
        note: data.note,
        recordedAt: data.recordedAt ? new Date(data.recordedAt) : new Date(),
      },
    });
  }
}
