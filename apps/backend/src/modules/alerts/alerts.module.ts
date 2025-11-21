import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AlertsController } from "./alerts.controller";
import { AlertsService } from "./alerts.service";
import { PrismaService } from "../../prisma/prisma.service";
import { EncryptionService } from "../../common/services/encryption.service";
import { DoctorUtilsService } from "../../common/services/doctor-utils.service";
import { PatientUtilsService } from "../../common/services/patient-utils.service";
import { AuthModule } from "../auth/auth.module";

/**
 * Module for alerts
 */
@Module({
  imports: [ConfigModule, AuthModule],
  controllers: [AlertsController],
  providers: [
    AlertsService,
    PrismaService,
    EncryptionService,
    DoctorUtilsService,
    PatientUtilsService,
  ],
  exports: [AlertsService],
})
export class AlertsModule {}
