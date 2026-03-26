import { Module } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RealtimeNotificationsService } from "./realtime-notifications.service";
import { NotificationsService } from "./notifications.service";
import { NotificationsController } from "./notifications.controller";

@Module({
  controllers: [NotificationsController],
  providers: [PrismaService, RealtimeNotificationsService, NotificationsService],
  exports: [RealtimeNotificationsService, NotificationsService],
})
export class NotificationsModule {}
