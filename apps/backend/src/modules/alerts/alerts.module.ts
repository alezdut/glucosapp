import { Module } from "@nestjs/common";
import { AlertsController } from "./alerts.controller";
import { AlertsService } from "./alerts.service";
import { PrismaService } from "../../prisma/prisma.service";
import { EncryptionService } from "../../common/services/encryption.service";
import { DoctorUtilsService } from "../../common/services/doctor-utils.service";

/**
 * Module for alerts
 */
@Module({
  controllers: [AlertsController],
  providers: [AlertsService, PrismaService, EncryptionService, DoctorUtilsService],
  exports: [AlertsService],
})
export class AlertsModule {}
