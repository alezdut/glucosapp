import { Module } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { SensorReadingsController } from "./sensor-readings.controller";
import { SensorReadingsService } from "./sensor-readings.service";

/**
 * Sensor Readings Module
 *
 * Handles CGM sensor data ingestion, storage, and export
 */
@Module({
  controllers: [SensorReadingsController],
  providers: [SensorReadingsService, PrismaService],
  exports: [SensorReadingsService],
})
export class SensorReadingsModule {}
