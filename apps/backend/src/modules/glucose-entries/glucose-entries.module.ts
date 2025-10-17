import { Module } from "@nestjs/common";
import { GlucoseEntriesController } from "./glucose-entries.controller";
import { GlucoseEntriesService } from "./glucose-entries.service";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * Glucose entries module
 */
@Module({
  controllers: [GlucoseEntriesController],
  providers: [GlucoseEntriesService, PrismaService],
  exports: [GlucoseEntriesService],
})
export class GlucoseEntriesModule {}
