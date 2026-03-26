#!/usr/bin/env node
/**
 * Demo Data Population Script
 *
 * Populates the database with 10 diverse patient profiles with 6 months of historical data.
 * Safe to run multiple times (idempotent) - detects existing patients and adds incremental data.
 *
 * Usage:
 *   npm run demo:populate       # Create/update demo data
 *   npm run demo:reset          # Delete and recreate all demo data
 */

import { NestFactory } from "@nestjs/core";
import { PrismaService } from "../src/prisma/prisma.service";
import { EncryptionService } from "../src/common/services/encryption.service";
import { ConfigModule } from "@nestjs/config";
import { Module } from "@nestjs/common";
import * as bcrypt from "bcrypt";

import { DEMO_PATIENTS, PatientProfile } from "./demo-data/patient-profiles";
import { generateDailyMeals } from "./demo-data/meal-generator";
import { generateDailyReadings, verifyReadingStatistics } from "./demo-data/glucose-generator";
import { generateInsulinDosesForMeals, generateBasalDoses } from "./demo-data/insulin-generator";
import { addDays, generateDateRange, generateBirthDate } from "./demo-data/utils";

// Bootstrap module for standalone script
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
  ],
  providers: [PrismaService, EncryptionService],
})
class AppModule {}

interface Alert {
  type: "HYPOGLYCEMIA" | "SEVERE_HYPOGLYCEMIA" | "HYPERGLYCEMIA";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  message: string;
  glucoseValue: number;
  timestamp: Date;
  acknowledged: boolean;
}

class DemoDataPopulator {
  private prisma: PrismaService;
  private encryption: EncryptionService;
  private startTime: number;

  private getAvatarUrl(avatarPath: string): string {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3001";
    return new URL(avatarPath, frontendUrl).toString();
  }

  private async syncDemoUserProfile(
    userId: string,
    profile: PatientProfile,
    birthDate: Date,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: profile.firstName,
        lastName: profile.lastName,
        avatarUrl: this.getAvatarUrl(profile.avatarPath),
        birthDate,
        weight: profile.weight,
        diabetesType: profile.diabetesType,
        icRatioBreakfast: profile.icRatioBreakfast,
        icRatioLunch: profile.icRatioLunch,
        icRatioDinner: profile.icRatioDinner,
        insulinSensitivityFactor: profile.insulinSensitivityFactor,
        minTargetGlucose: profile.minTarget,
        maxTargetGlucose: profile.maxTarget,
      },
    });
  }

  async initialize() {
    console.log("=================================================");
    console.log("Demo Data Population Script");
    console.log("=================================================\n");

    // Bootstrap NestJS application
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ["error", "warn"],
    });

    this.prisma = app.get(PrismaService);
    this.encryption = app.get(EncryptionService);
    this.startTime = Date.now();

    // Check for reset flag
    const shouldReset = process.argv.includes("--reset");

    if (shouldReset) {
      await this.resetDemoData();
    }

    return app;
  }

  async resetDemoData() {
    console.log("⚠️  Reset mode: Deleting all existing demo data...\n");

    // Delete all demo patients and their related data (cascade will handle relations)
    const deleted = await this.prisma.user.deleteMany({
      where: {
        email: {
          endsWith: "@glucosapp.demo",
        },
      },
    });

    console.log(`✓ Deleted ${deleted.count} demo patients and their data\n`);
  }

  async detectExistingPatients(): Promise<
    Map<string, { userId: string; lastDataDate: Date | null }>
  > {
    console.log("Detecting existing demo patients...");

    const existingPatients = await this.prisma.user.findMany({
      where: {
        email: {
          endsWith: "@glucosapp.demo",
        },
      },
      include: {
        logEntries: {
          orderBy: { recordedAt: "desc" },
          take: 1,
        },
      },
    });

    const patientMap = new Map<string, { userId: string; lastDataDate: Date | null }>();

    for (const patient of existingPatients) {
      const lastDataDate = patient.logEntries.length > 0 ? patient.logEntries[0].recordedAt : null;

      patientMap.set(patient.email, {
        userId: patient.id,
        lastDataDate,
      });
    }

    if (patientMap.size === 0) {
      console.log("✓ No existing patients found. Creating fresh data.\n");
    } else {
      console.log(`✓ Found ${patientMap.size} existing patients.\n`);
    }

    return patientMap;
  }

  async populateAllPatients() {
    const existingPatients = await this.detectExistingPatients();

    console.log(`Generating data for ${DEMO_PATIENTS.length} patients...\n`);

    let totalLogEntries = 0;
    let totalSensorReadings = 0;
    let totalAlerts = 0;

    for (let i = 0; i < DEMO_PATIENTS.length; i++) {
      const profile = DEMO_PATIENTS[i];
      const patientNum = i + 1;

      const stats = await this.populatePatient(
        profile,
        patientNum,
        existingPatients.get(profile.email),
      );

      totalLogEntries += stats.logEntriesCreated;
      totalSensorReadings += stats.sensorReadingsCreated;
      totalAlerts += stats.alertsCreated;
    }

    this.printSummary(totalLogEntries, totalSensorReadings, totalAlerts);
  }

  async populatePatient(
    profile: PatientProfile,
    patientNum: number,
    existing?: { userId: string; lastDataDate: Date | null },
  ): Promise<{
    logEntriesCreated: number;
    sensorReadingsCreated: number;
    alertsCreated: number;
  }> {
    const startTime = Date.now();

    console.log(`[${patientNum}/10] ${profile.firstName} ${profile.lastName} (${profile.email})`);

    const dataType = profile.cgmDevice
      ? `${profile.diabetesType}, CGM (${profile.cgmDevice}) + Manual entries`
      : `${profile.diabetesType}, Manual entries only`;
    console.log(`  Type: ${dataType}`);

    // Determine date range for data generation
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let startDate: Date;
    let endDate: Date;

    if (profile.isInactive) {
      // Special case for inactive patient
      startDate = addDays(today, -(profile.dataStartDaysAgo || 180));
      endDate = addDays(today, -(profile.dataEndDaysAgo || 90));
    } else if (existing && existing.lastDataDate) {
      // Incremental update: add data from last date to today
      startDate = addDays(existing.lastDataDate, 1);
      endDate = today;

      if (startDate > endDate) {
        const birthDate = generateBirthDate(profile.age);
        await this.syncDemoUserProfile(existing.userId, profile, birthDate);
        console.log("  ✓ Patient data is up to date. Skipping.\n");
        return {
          logEntriesCreated: 0,
          sensorReadingsCreated: 0,
          alertsCreated: 0,
        };
      }
    } else {
      // Fresh data: 6 months history
      startDate = addDays(today, -180);
      endDate = today;
    }

    // Generate data in transaction
    const stats = await this.generatePatientData(profile, startDate, endDate, existing?.userId);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`  ✓ Created user profile`);
    console.log(`  ✓ Generated ${stats.logEntriesCreated} log entries (manual app records)`);
    if (stats.sensorReadingsCreated > 0) {
      console.log(
        `  ✓ Generated ${stats.sensorReadingsCreated.toLocaleString()} sensor readings (CGM data)`,
      );
    }
    console.log(`  ✓ Generated ${stats.alertsCreated} alerts`);
    console.log(`  Duration: ${duration}s\n`);

    return stats;
  }

  async generatePatientData(
    profile: PatientProfile,
    startDate: Date,
    endDate: Date,
    existingUserId?: string,
  ): Promise<{
    logEntriesCreated: number;
    sensorReadingsCreated: number;
    alertsCreated: number;
  }> {
    let logEntriesCreated = 0;
    let sensorReadingsCreated = 0;
    let alertsCreated = 0;

    await this.prisma.$transaction(
      async (tx) => {
        // 1. Upsert user
        const hashedPassword = await bcrypt.hash(profile.password, 10);
        const birthDate = generateBirthDate(profile.age);
        const avatarUrl = this.getAvatarUrl(profile.avatarPath);

        const user = await tx.user.upsert({
          where: { email: profile.email },
          create: {
            email: profile.email,
            password: hashedPassword,
            firstName: profile.firstName,
            lastName: profile.lastName,
            avatarUrl,
            emailVerified: true,
            birthDate,
            weight: profile.weight,
            diabetesType: profile.diabetesType,
            icRatioBreakfast: profile.icRatioBreakfast,
            icRatioLunch: profile.icRatioLunch,
            icRatioDinner: profile.icRatioDinner,
            insulinSensitivityFactor: profile.insulinSensitivityFactor,
            minTargetGlucose: profile.minTarget,
            maxTargetGlucose: profile.maxTarget,
            role: "PATIENT",
          },
          update: existingUserId
            ? {
                avatarUrl,
              }
            : {
                // Update profile if not incremental
                firstName: profile.firstName,
                lastName: profile.lastName,
                avatarUrl,
                birthDate,
                weight: profile.weight,
                diabetesType: profile.diabetesType,
                icRatioBreakfast: profile.icRatioBreakfast,
                icRatioLunch: profile.icRatioLunch,
                icRatioDinner: profile.icRatioDinner,
                insulinSensitivityFactor: profile.insulinSensitivityFactor,
                minTargetGlucose: profile.minTarget,
                maxTargetGlucose: profile.maxTarget,
              },
        });

        // 2. Create alert settings (if new user)
        if (!existingUserId) {
          await tx.alertSettings.upsert({
            where: { userId: user.id },
            create: {
              userId: user.id,
              alertsEnabled: true,
              hypoglycemiaEnabled: true,
              hypoglycemiaThreshold: 70,
              severeHypoglycemiaEnabled: true,
              severeHypoglycemiaThreshold: 54,
              hyperglycemiaEnabled: true,
              hyperglycemiaThreshold: 250,
              persistentHyperglycemiaEnabled: true,
              persistentHyperglycemiaThreshold: 250,
              persistentHyperglycemiaWindowHours: 4,
              persistentHyperglycemiaMinReadings: 2,
            },
            update: {},
          });
        }

        // 3. Generate data for each day
        const dates = generateDateRange(startDate, endDate);

        for (const date of dates) {
          // Generate meals for the day
          const dailyMeals = generateDailyMeals(date, profile.mealsPerDay);

          // Generate glucose readings for the day (used for both LogEntry and GlucoseReading)
          const dailyReadings = generateDailyReadings(date, profile, dailyMeals);

          // Generate insulin doses based on meals and glucose
          const mealInsulinDoses = generateInsulinDosesForMeals(dailyMeals, dailyReadings, profile);

          // 4. FOR ALL PATIENTS: Create LogEntry records (manual app entries)
          // These are what show in the "registros" tab
          for (let i = 0; i < dailyMeals.length; i++) {
            const meal = dailyMeals[i];
            const insulinDose = mealInsulinDoses[i];

            // Find the closest glucose reading to this meal time
            const preMealReading = dailyReadings.reduce((closest, reading) => {
              const mealTime = meal.timestamp.getTime();
              const closestDiff = Math.abs(mealTime - closest.timestamp.getTime());
              const currentDiff = Math.abs(mealTime - reading.timestamp.getTime());
              return currentDiff < closestDiff ? reading : closest;
            });

            // Create GlucoseEntry with encryption
            const mgdlEncrypted = this.encryption.encryptGlucoseValue(preMealReading.glucose);
            const glucoseEntry = await tx.glucoseEntry.create({
              data: {
                userId: user.id,
                mgdlEncrypted,
                recordedAt: meal.timestamp,
              },
            });

            // Create InsulinDose (only if units > 0)
            let insulinDoseRecord = null;
            if (insulinDose && insulinDose.units > 0) {
              insulinDoseRecord = await tx.insulinDose.create({
                data: {
                  userId: user.id,
                  units: insulinDose.units,
                  calculatedUnits: insulinDose.calculatedUnits,
                  wasManuallyEdited: insulinDose.wasManuallyEdited,
                  type: "BOLUS",
                  isCorrection: meal.carbs === 0,
                  recordedAt: meal.timestamp,
                  carbInsulin: insulinDose.carbInsulin,
                  correctionInsulin: insulinDose.correctionInsulin,
                  iobSubtracted: 0,
                },
              });
            }

            // Create LogEntry linking everything
            await tx.logEntry.create({
              data: {
                userId: user.id,
                recordedAt: meal.timestamp,
                glucoseEntryId: glucoseEntry.id,
                insulinDoseId: insulinDoseRecord?.id,
                mealTemplateId: null,
                mealType: meal.type,
                carbohydrates: meal.carbs,
                // Context factors (all default to false for demo data)
                recentExercise: false,
                alcohol: false,
                illness: false,
                stress: false,
                menstruation: false,
                highFatMeal: false,
              },
            });

            logEntriesCreated++;

            // Create alerts for glucose values in log entries
            const alert = this.detectAlertForGlucose(preMealReading.glucose, meal.timestamp);
            if (alert) {
              await tx.alert.create({
                data: {
                  userId: user.id,
                  type: alert.type,
                  severity: alert.severity,
                  message: alert.message,
                  glucoseEntryId: glucoseEntry.id,
                  acknowledged: alert.acknowledged,
                  acknowledgedAt: alert.acknowledged ? meal.timestamp : null,
                  createdAt: meal.timestamp,
                },
              });
              alertsCreated++;
            }
          }

          // 5. FOR CGM PATIENTS ONLY: Create GlucoseReading records (continuous sensor data)
          // These are the 288 readings per day (every 5 minutes)
          if (profile.cgmDevice) {
            const BATCH_SIZE = 100;
            for (let i = 0; i < dailyReadings.length; i += BATCH_SIZE) {
              const batch = dailyReadings.slice(i, i + BATCH_SIZE);

              await tx.glucoseReading.createMany({
                data: batch.map((reading) => ({
                  userId: user.id,
                  glucoseEncrypted: this.encryption.encryptGlucoseValue(reading.glucose),
                  recordedAt: reading.timestamp,
                  source: profile.cgmDevice,
                  isHistorical: true,
                })),
              });

              sensorReadingsCreated += batch.length;
            }

            // Create alerts for CGM readings
            for (const reading of dailyReadings) {
              const alert = this.detectAlertForGlucose(reading.glucose, reading.timestamp);
              if (alert) {
                await tx.alert.create({
                  data: {
                    userId: user.id,
                    type: alert.type,
                    severity: alert.severity,
                    message: alert.message,
                    acknowledged: alert.acknowledged,
                    acknowledgedAt: alert.acknowledged ? reading.timestamp : null,
                    createdAt: reading.timestamp,
                  },
                });
                alertsCreated++;
              }
            }
          }
        }
      },
      {
        timeout: 300000, // 5 minutes
      },
    );

    return { logEntriesCreated, sensorReadingsCreated, alertsCreated };
  }

  detectAlertForGlucose(glucose: number, timestamp: Date): Alert | null {
    // Severe hypoglycemia (<54 mg/dL)
    if (glucose < 54) {
      return {
        type: "SEVERE_HYPOGLYCEMIA",
        severity: "CRITICAL",
        message: `Hipoglucemia severa detectada: ${glucose} mg/dL. ¡Acción inmediata requerida!`,
        glucoseValue: glucose,
        timestamp,
        acknowledged: Math.random() < 0.7, // 70% acknowledged
      };
    }
    // Hypoglycemia (<70 mg/dL)
    else if (glucose < 70) {
      return {
        type: "HYPOGLYCEMIA",
        severity: "HIGH",
        message: `Hipoglucemia detectada: ${glucose} mg/dL. Consumir carbohidratos de acción rápida.`,
        glucoseValue: glucose,
        timestamp,
        acknowledged: Math.random() < 0.7,
      };
    }
    // Hyperglycemia (>250 mg/dL)
    else if (glucose > 250) {
      return {
        type: "HYPERGLYCEMIA",
        severity: "MEDIUM",
        message: `Hiperglucemia detectada: ${glucose} mg/dL. Considerar dosis de corrección.`,
        glucoseValue: glucose,
        timestamp,
        acknowledged: Math.random() < 0.7,
      };
    }

    return null;
  }

  printSummary(totalLogEntries: number, totalSensorReadings: number, totalAlerts: number) {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(0);
    const minutes = Math.floor(Number(duration) / 60);
    const seconds = Number(duration) % 60;

    console.log("=================================================");
    console.log("Summary");
    console.log("=================================================");
    console.log(`Total patients: ${DEMO_PATIENTS.length}`);
    console.log(`Total log entries (manual app records): ${totalLogEntries.toLocaleString()}`);
    console.log(`Total sensor readings (CGM data): ${totalSensorReadings.toLocaleString()}`);
    console.log(`Total alerts: ${totalAlerts.toLocaleString()}`);
    console.log("");
    console.log(`Total execution time: ${minutes}m ${seconds}s`);
    console.log("");
    console.log("Demo credentials:");
    console.log("  Email: demo-patient-1@glucosapp.demo to demo-patient-10@glucosapp.demo");
    console.log("  Password: Demo123!");
    console.log("");
  }

  async close(app: any) {
    await this.prisma.$disconnect();
    await app.close();
  }
}

// Main execution
async function main() {
  const populator = new DemoDataPopulator();

  let app;
  try {
    app = await populator.initialize();
    await populator.populateAllPatients();
  } catch (error) {
    console.error("\n❌ Error during demo data population:");
    console.error(error);
    process.exit(1);
  } finally {
    if (app) {
      await populator.close(app);
    }
  }
}

main();
