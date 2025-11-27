import { Module, forwardRef } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { SensorReadingsController } from "./sensor-readings.controller";
import { SensorReadingsService } from "./sensor-readings.service";
import { AlertsModule } from "../alerts/alerts.module";

/**
 * Sensor Readings Module
 *
 * Handles CGM sensor data ingestion, storage, and export
 */
@Module({
  imports: [forwardRef(() => AlertsModule)],
  controllers: [SensorReadingsController],
  providers: [SensorReadingsService, PrismaService],
  exports: [SensorReadingsService],
})
export class SensorReadingsModule {}
