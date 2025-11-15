import { Module } from "@nestjs/common";
import { DoctorPatientController } from "./doctor-patient.controller";
import { DoctorPatientService } from "./doctor-patient.service";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * Module for doctor-patient relationships
 */
@Module({
  controllers: [DoctorPatientController],
  providers: [DoctorPatientService, PrismaService],
  exports: [DoctorPatientService],
})
export class DoctorPatientModule {}
