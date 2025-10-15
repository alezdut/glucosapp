import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaService } from "./prisma/prisma.service";
import { HealthModule } from "./modules/health/health.module";
import { AuthModule } from "./modules/auth/auth.module";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), HealthModule, AuthModule],
  providers: [PrismaService],
})
export class AppModule {}
