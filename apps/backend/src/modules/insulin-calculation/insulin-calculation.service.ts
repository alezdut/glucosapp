import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  calculateDose,
  calculateBreakfastDose,
  calculateLunchDose,
  calculateDinnerDose,
  calculateCorrectionDose,
  evaluatePreSleep,
  calculateBetweenMealCorrection,
  calculateIOB,
  configure,
  type InsulinProfile,
  type DoseCalculationInput,
  type DoseResult,
  type Injection,
  type PreSleepEvaluation,
  SupportedLanguage,
} from "@glucosapp/mdi-insulin-algorithm";
import type { CalculateDoseDto } from "./dto/calculate-dose.dto";
import type { User } from "@prisma/client";

/**
 * Service for insulin dose calculations using mdi-insulin-algorithm
 */
@Injectable()
export class InsulinCalculationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Configure language based on user settings
   */
  private configureUserLanguage(user: User): void {
    configure(user.language.toLowerCase() as SupportedLanguage, "en");
  }

  /**
   * Build InsulinProfile from User model
   */
  private buildInsulinProfile(user: User): InsulinProfile {
    return {
      isf: user.insulinSensitivityFactor,
      icRatio: {
        breakfast: user.icRatioBreakfast,
        lunch: user.icRatioLunch,
        dinner: user.icRatioDinner,
      },
      diaHours: user.diaHours,
      target: user.targetGlucose || 100,
    };
  }

  /**
   * Get recent injections for IOB calculation
   */
  async getRecentInjections(userId: string, hoursBack: number = 6): Promise<Injection[]> {
    const cutoff = new Date(Date.now() - hoursBack * 3600000);

    const doses = await this.prisma.insulinDose.findMany({
      where: {
        userId,
        type: "BOLUS",
        recordedAt: { gte: cutoff },
      },
      orderBy: { recordedAt: "desc" },
    });

    return doses.map((d) => ({
      timestamp: d.recordedAt.getTime(),
      units: d.units,
    }));
  }

  /**
   * Calculate dose for a meal
   */
  async calculateMealDose(userId: string, dto: CalculateDoseDto): Promise<DoseResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException("User not found");

    // Configure language based on user settings
    this.configureUserLanguage(user);

    // Use targetGlucose from DTO if provided, otherwise use user's default
    const targetGlucose = dto.targetGlucose || user.targetGlucose || 100;
    user.targetGlucose = targetGlucose;

    const profile = this.buildInsulinProfile(user);
    const previousInjections = await this.getRecentInjections(userId);

    const input: DoseCalculationInput = {
      timeOfDay: dto.mealType as any,
      glucose: dto.glucose,
      carbohydrates: dto.carbohydrates,
      previousInjections,
      context: dto.context,
    };

    // Use specific meal function based on type
    let result: DoseResult;
    switch (dto.mealType) {
      case "BREAKFAST":
        result = calculateBreakfastDose(profile, input);
        break;
      case "LUNCH":
        result = calculateLunchDose(profile, input);
        break;
      case "DINNER":
        result = calculateDinnerDose(profile, input);
        break;
      default:
        result = calculateDose(profile, input);
    }

    return result;
  }

  /**
   * Calculate correction dose between meals
   */
  async calculateCorrection(userId: string, dto: CalculateDoseDto): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException("User not found");

    // Configure language based on user settings
    this.configureUserLanguage(user);

    const profile = this.buildInsulinProfile(user);
    const previousInjections = await this.getRecentInjections(userId);

    // Use targetGlucose from parameter or user's default
    const targetGlucoseValue = dto.targetGlucose || user.targetGlucose || 100;
    user.targetGlucose = targetGlucoseValue;

    const input: DoseCalculationInput = {
      timeOfDay: "correction" as any,
      glucose: dto.glucose,
      carbohydrates: 0,
      previousInjections,
      context: dto.context,
    };
    const result = calculateDose(profile, input);
    return result;
  }

  /**
   * Evaluate safety before sleep
   */
  async evaluateBeforeSleep(userId: string, glucose: number): Promise<PreSleepEvaluation> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException("User not found");

    // Configure language based on user settings
    this.configureUserLanguage(user);

    const profile = this.buildInsulinProfile(user);
    const previousInjections = await this.getRecentInjections(userId);

    const result = evaluatePreSleep(glucose, previousInjections, profile.diaHours, profile.isf);

    return result;
  }

  /**
   * Get current IOB
   */
  async getCurrentIOB(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException("User not found");

    const previousInjections = await this.getRecentInjections(userId);

    return calculateIOB(previousInjections, Date.now(), user.diaHours);
  }
}
