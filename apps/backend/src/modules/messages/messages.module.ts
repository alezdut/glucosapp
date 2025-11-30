import { Module } from "@nestjs/common";
import { MessagesGateway } from "./messages.gateway";
import { MessagesService } from "./messages.service";
import { PrismaService } from "../../prisma/prisma.service";
import { DoctorUtilsService } from "../../common/services/doctor-utils.service";
import { AuthModule } from "../auth/auth.module";
import { JwtModule } from "@nestjs/jwt";

/**
 * Module for messages between doctors and patients
 */
@Module({
  imports: [AuthModule, JwtModule],
  providers: [MessagesGateway, MessagesService, PrismaService, DoctorUtilsService],
  exports: [MessagesService],
})
export class MessagesModule {}
