import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { MessagesGateway } from "./messages.gateway";
import { MessagesController } from "./messages.controller";
import { MessagesService } from "./messages.service";
import { MessagesRealtimeService } from "./messages-realtime.service";
import { PrismaService } from "../../prisma/prisma.service";
import { DoctorUtilsService } from "../../common/services/doctor-utils.service";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";

/**
 * Module for messages between doctors and patients
 */
@Module({
  imports: [
    AuthModule,
    NotificationsModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        signOptions: {
          expiresIn: configService.get<string>("JWT_ACCESS_EXPIRATION", "15m"),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [MessagesController],
  providers: [
    MessagesGateway,
    MessagesService,
    MessagesRealtimeService,
    PrismaService,
    DoctorUtilsService,
  ],
  exports: [MessagesService, MessagesGateway],
})
export class MessagesModule {}
