import { Global, Module } from "@nestjs/common";
import { EncryptionService } from "./services/encryption.service";
import { DoctorUtilsService } from "./services/doctor-utils.service";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Common Module
 *
 * Global module providing shared services like encryption and doctor utilities
 */
@Global()
@Module({
  providers: [EncryptionService, DoctorUtilsService, PrismaService],
  exports: [EncryptionService, DoctorUtilsService, PrismaService],
})
export class CommonModule {}
