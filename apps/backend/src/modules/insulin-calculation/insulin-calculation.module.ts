import { Module } from "@nestjs/common";
import { InsulinCalculationController } from "./insulin-calculation.controller";
import { InsulinCalculationService } from "./insulin-calculation.service";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * Module for insulin dose calculations using mdi-insulin-algorithm
 */
@Module({
  controllers: [InsulinCalculationController],
  providers: [InsulinCalculationService, PrismaService],
  exports: [InsulinCalculationService],
})
export class InsulinCalculationModule {}
