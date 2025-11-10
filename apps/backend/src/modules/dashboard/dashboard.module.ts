import { Module } from "@nestjs/common";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AlertsModule } from "../alerts/alerts.module";

/**
 * Module for doctor dashboard
 */
@Module({
  imports: [AlertsModule],
  controllers: [DashboardController],
  providers: [DashboardService, PrismaService],
  exports: [DashboardService],
})
export class DashboardModule {}
