import { Module } from "@nestjs/common";
import { AppointmentsController } from "./appointments.controller";
import { AppointmentsService } from "./appointments.service";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * Module for appointments
 */
@Module({
  controllers: [AppointmentsController],
  providers: [AppointmentsService, PrismaService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
