import { Module } from "@nestjs/common";
import { LogEntriesController } from "./log-entries.controller";
import { LogEntriesService } from "./log-entries.service";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * Module for log entries
 */
@Module({
  controllers: [LogEntriesController],
  providers: [LogEntriesService, PrismaService],
  exports: [LogEntriesService],
})
export class LogEntriesModule {}
