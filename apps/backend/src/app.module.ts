import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaService } from "./prisma/prisma.service";
import { HealthModule } from "./modules/health/health.module";
import { AuthModule } from "./modules/auth/auth.module";
import { ProfileModule } from "./modules/profile/profile.module";
import { StatisticsModule } from "./modules/statistics/statistics.module";
import { GlucoseEntriesModule } from "./modules/glucose-entries/glucose-entries.module";
import { InsulinDosesModule } from "./modules/insulin-doses/insulin-doses.module";
import { MealsModule } from "./modules/meals/meals.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HealthModule,
    AuthModule,
    ProfileModule,
    StatisticsModule,
    GlucoseEntriesModule,
    InsulinDosesModule,
    MealsModule,
  ],
  providers: [PrismaService],
})
export class AppModule {}
