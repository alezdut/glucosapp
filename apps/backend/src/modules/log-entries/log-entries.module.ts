import { Module } from "@nestjs/common";
import { LogEntriesController } from "./log-entries.controller";
import { LogEntriesService } from "./log-entries.service";
import { PrismaService } from "../../prisma/prisma.service";
import { EncryptionService } from "../../common/services/encryption.service";

/**
 * Module for log entries
 */
@Module({
  controllers: [LogEntriesController],
  providers: [LogEntriesService, PrismaService, EncryptionService],
  exports: [LogEntriesService],
})
export class LogEntriesModule {}
