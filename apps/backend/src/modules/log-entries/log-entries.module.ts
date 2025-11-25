import { Module, forwardRef } from "@nestjs/common";
import { LogEntriesController } from "./log-entries.controller";
import { LogEntriesService } from "./log-entries.service";
import { PrismaService } from "../../prisma/prisma.service";
import { EncryptionService } from "../../common/services/encryption.service";
import { AlertsModule } from "../alerts/alerts.module";

/**
 * Module for log entries
 */
@Module({
  imports: [forwardRef(() => AlertsModule)],
  controllers: [LogEntriesController],
  providers: [LogEntriesService, PrismaService, EncryptionService],
  exports: [LogEntriesService],
})
export class LogEntriesModule {}
