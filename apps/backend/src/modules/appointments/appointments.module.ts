import { Module } from "@nestjs/common";
import { AppointmentsController } from "./appointments.controller";
import { AppointmentsService } from "./appointments.service";
import { PrismaService } from "../../prisma/prisma.service";
import { MessagesModule } from "../messages/messages.module";

/**
 * Module for appointments
 */
@Module({
  imports: [MessagesModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, PrismaService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
