import { Module } from "@nestjs/common";
import { InsulinDosesController } from "./insulin-doses.controller";
import { InsulinDosesService } from "./insulin-doses.service";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * Insulin doses module
 */
@Module({
  controllers: [InsulinDosesController],
  providers: [InsulinDosesService, PrismaService],
  exports: [InsulinDosesService],
})
export class InsulinDosesModule {}
