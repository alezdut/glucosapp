import { Module } from "@nestjs/common";
import { StatisticsController } from "./statistics.controller";
import { StatisticsService } from "./statistics.service";
import { PrismaService } from "../../prisma/prisma.service";
import { EncryptionService } from "../../common/services/encryption.service";

/**
 * Statistics module
 */
@Module({
  controllers: [StatisticsController],
  providers: [StatisticsService, PrismaService, EncryptionService],
  exports: [StatisticsService],
})
export class StatisticsModule {}
