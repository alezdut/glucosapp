import { Module } from "@nestjs/common";
import { GlucoseEntriesController } from "./glucose-entries.controller";
import { GlucoseEntriesService } from "./glucose-entries.service";
import { PrismaService } from "../../prisma/prisma.service";
import { EncryptionService } from "../../common/services/encryption.service";

/**
 * Glucose entries module
 */
@Module({
  controllers: [GlucoseEntriesController],
  providers: [GlucoseEntriesService, PrismaService, EncryptionService],
  exports: [GlucoseEntriesService],
})
export class GlucoseEntriesModule {}
