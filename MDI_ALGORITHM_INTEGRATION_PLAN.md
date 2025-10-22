# MDI Insulin Algorithm Integration Plan

## Overview

This document outlines the integration of the `mdi-insulin-algorithm` library into the Glucosapp backend, replacing the current basic insulin calculation system with a more sophisticated, medically-accurate algorithm.

## Current State Analysis

### Existing System

- **Location**: `packages/types/src/insulin-calculations.ts`
- **Features**:
  - Basic insulin calculation (carb insulin + correction insulin)
  - Simple linear IOB calculation
  - Single carb ratio (not time-of-day specific)
  - Basic projected glucose calculation

### Database Schema (Current)

```prisma
model User {
  carbRatio                Float @default(10)
  insulinSensitivityFactor Float @default(50)
  targetGlucose            Int?
  minTargetGlucose         Int  @default(80)
  maxTargetGlucose         Int  @default(140)
}

model InsulinDose {
  units             Float
  calculatedUnits   Float?
  wasManuallyEdited Boolean
  type              InsulinType (BASAL/BOLUS)
  recordedAt        DateTime
}

model Meal {
  name          String
  carbohydrates Float?
  recordedAt    DateTime
}
```

## Required Changes

### 1. Database Schema Updates

#### User Model - Insulin Profile

```prisma
model User {
  // Remove single carbRatio, add time-specific ratios
  - carbRatio: Float @default(10)

  // Add new fields
  + icRatioBreakfast       Float @default(15)
  + icRatioLunch           Float @default(12)
  + icRatioDinner          Float @default(10)
  + diaHours               Float @default(4)

  // Keep existing
  insulinSensitivityFactor Float @default(50)  // This is ISF
  targetGlucose            Int?
}
```

#### Meal Model - Add Time of Day

```prisma
enum MealType {
  BREAKFAST
  LUNCH
  DINNER
  SNACK
}

model Meal {
  // Add meal type
  + mealType MealType?
}
```

#### InsulinDose Model - Add Context

```prisma
model InsulinDose {
  // Add meal type for bolus doses
  + mealType    MealType?
  + isCorrection Boolean @default(false)

  // Add breakdown fields (optional, for transparency)
  + carbInsulin       Float?
  + correctionInsulin Float?
  + iobSubtracted     Float?
}
```

### 2. Package Installation

```bash
cd apps/backend
pnpm add mdi-insulin-algorithm
```

### 3. Type System Updates

#### packages/types/src/insulin-profile.ts (NEW)

```typescript
/**
 * Insulin profile types matching mdi-insulin-algorithm
 */

export interface ICRatio {
  breakfast: number;
  lunch: number;
  dinner: number;
}

export interface InsulinProfile {
  isf: number;
  icRatio: ICRatio;
  diaHours: number;
  target: number;
}

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type TimeOfDay = "breakfast" | "lunch" | "dinner" | "correction";
```

#### packages/types/src/insulin-calculations.ts (UPDATED)

```typescript
/**
 * Updated to use mdi-insulin-algorithm
 */
import type { DoseResult, DoseContext } from "mdi-insulin-algorithm";

export interface CalculateDoseParams {
  glucose: number;
  carbohydrates: number;
  mealType: MealType;
  userId: string;
  context?: DoseContext;
}

export interface CalculateDoseResult extends DoseResult {
  // Extends the library's result
}

export interface PreSleepEvaluation {
  action: "eat_snack" | "small_correction" | "sleep";
  remainingIOB: number;
  reason: string;
  carbohydrates?: number;
  correctionDose?: number;
}

export interface BetweenMealCorrectionResult {
  dose: number;
  reason: string;
  warnings: string[];
}
```

### 4. Backend Service Architecture

#### New Module: insulin-calculation/

```
apps/backend/src/modules/insulin-calculation/
├── insulin-calculation.module.ts
├── insulin-calculation.controller.ts
├── insulin-calculation.service.ts
├── dto/
│   ├── calculate-dose.dto.ts
│   ├── calculate-dose-response.dto.ts
│   ├── pre-sleep-evaluation.dto.ts
│   └── correction-dose.dto.ts
└── helpers/
    ├── profile-adapter.ts
    └── injection-fetcher.ts
```

#### insulin-calculation.service.ts

```typescript
import {
  calculateDose,
  calculateBreakfastDose,
  calculateLunchDose,
  calculateDinnerDose,
  calculateCorrectionDose,
  evaluatePreSleep,
  calculateBetweenMealCorrection,
  calculateIOB,
  type InsulinProfile,
  type DoseCalculationInput,
  type Injection,
} from "mdi-insulin-algorithm";

@Injectable()
export class InsulinCalculationService {
  constructor(private prisma: PrismaService) {}

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
  private async getRecentInjections(userId: string, hoursBack: number = 6): Promise<Injection[]> {
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

    const profile = this.buildInsulinProfile(user);
    const previousInjections = await this.getRecentInjections(userId);

    const input: DoseCalculationInput = {
      timeOfDay: dto.mealType as TimeOfDay,
      glucose: dto.glucose,
      carbohydrates: dto.carbohydrates,
      previousInjections,
      context: dto.context,
    };

    // Use specific meal function based on type
    switch (dto.mealType) {
      case "breakfast":
        return calculateBreakfastDose(profile, input);
      case "lunch":
        return calculateLunchDose(profile, input);
      case "dinner":
        return calculateDinnerDose(profile, input);
      default:
        return calculateDose(profile, input);
    }
  }

  /**
   * Calculate correction dose between meals
   */
  async calculateCorrection(userId: string, glucose: number): Promise<BetweenMealCorrectionResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException("User not found");

    const profile = this.buildInsulinProfile(user);
    const previousInjections = await this.getRecentInjections(userId);

    return calculateBetweenMealCorrection(
      glucose,
      previousInjections,
      profile.diaHours,
      profile.isf,
    );
  }

  /**
   * Evaluate safety before sleep
   */
  async evaluateBeforeSleep(userId: string, glucose: number): Promise<PreSleepEvaluation> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException("User not found");

    const profile = this.buildInsulinProfile(user);
    const previousInjections = await this.getRecentInjections(userId);

    return evaluatePreSleep(glucose, previousInjections, profile.diaHours, profile.isf);
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
```

### 5. API Endpoints

```typescript
// insulin-calculation.controller.ts

@Controller("v1/insulin-calculation")
@UseGuards(JwtAuthGuard)
export class InsulinCalculationController {
  @Post("calculate-meal-dose")
  async calculateMealDose(@AuthUser() user: { id: string }, @Body() dto: CalculateDoseDto) {
    return this.service.calculateMealDose(user.id, dto);
  }

  @Post("calculate-correction")
  async calculateCorrection(@AuthUser() user: { id: string }, @Body() dto: CalculateCorrectionDto) {
    return this.service.calculateCorrection(user.id, dto.glucose);
  }

  @Post("evaluate-pre-sleep")
  async evaluatePreSleep(@AuthUser() user: { id: string }, @Body() dto: PreSleepEvaluationDto) {
    return this.service.evaluateBeforeSleep(user.id, dto.glucose);
  }

  @Get("current-iob")
  async getCurrentIOB(@AuthUser() user: { id: string }) {
    const iob = await this.service.getCurrentIOB(user.id);
    return { iob };
  }
}
```

### 6. DTOs

```typescript
// dto/calculate-dose.dto.ts
export class CalculateDoseDto {
  @IsNumber()
  @Min(40)
  @Max(600)
  glucose: number;

  @IsNumber()
  @Min(0)
  @Max(300)
  carbohydrates: number;

  @IsEnum(["breakfast", "lunch", "dinner"])
  mealType: "breakfast" | "lunch" | "dinner";

  @IsOptional()
  @IsObject()
  context?: {
    recentExercise?: boolean;
    alcohol?: boolean;
    illness?: boolean;
    stress?: boolean;
    menstruation?: boolean;
    highFatMeal?: boolean;
  };
}

// dto/pre-sleep-evaluation.dto.ts
export class PreSleepEvaluationDto {
  @IsNumber()
  @Min(40)
  @Max(600)
  glucose: number;
}

// dto/calculate-correction.dto.ts
export class CalculateCorrectionDto {
  @IsNumber()
  @Min(40)
  @Max(600)
  glucose: number;
}
```

### 7. Profile Updates

Update `profile.service.ts` and `update-profile.dto.ts` to handle:

- `icRatioBreakfast`, `icRatioLunch`, `icRatioDinner`
- `diaHours`

Remove:

- `carbRatio` (replaced by time-specific ratios)

### 8. Log Entries Integration

Update `log-entries.service.ts` to:

1. Accept meal type in DTO
2. Store calculation breakdown (carbInsulin, correctionInsulin, iob)
3. Automatically calculate dose using the new service

```typescript
// In log-entries.service.ts
async create(userId: string, data: CreateLogEntryDto) {
  // If carbs and glucose provided, calculate dose
  let calculatedDose: DoseResult | null = null;

  if (data.carbohydrates && data.glucoseMgdl && data.mealType) {
    calculatedDose = await this.calculationService.calculateMealDose(userId, {
      glucose: data.glucoseMgdl,
      carbohydrates: data.carbohydrates,
      mealType: data.mealType,
    });
  }

  // Create insulin dose with breakdown
  const insulinDose = await tx.insulinDose.create({
    data: {
      userId,
      units: data.insulinUnits || calculatedDose?.dose || 0,
      calculatedUnits: calculatedDose?.dose,
      carbInsulin: calculatedDose?.breakdown.carbDose,
      correctionInsulin: calculatedDose?.breakdown.correctionDose,
      iobSubtracted: calculatedDose?.breakdown.iob,
      mealType: data.mealType,
      // ...
    },
  });
}
```

## Migration Strategy

### Phase 1: Database Migration

1. Create migration with new fields
2. Set default values for existing users:
   - `icRatioBreakfast = carbRatio * 1.5`
   - `icRatioLunch = carbRatio * 1.2`
   - `icRatioDinner = carbRatio`
   - `diaHours = 4`

### Phase 2: Backend Updates

1. Install library
2. Create insulin-calculation module
3. Update profile service
4. Update log-entries service

### Phase 3: Type Updates

1. Update packages/types
2. Rebuild packages

### Phase 4: Frontend Updates (Mobile/Web)

1. Update forms to collect meal type
2. Update profile screens for IC ratios
3. Show calculation breakdown
4. Add pre-sleep check feature

## Testing Checklist

- [ ] Unit tests for calculation service
- [ ] Integration tests for endpoints
- [ ] Test with real user data migration
- [ ] Validate calculations match expected results
- [ ] Test edge cases (low glucose, high IOB, etc.)
- [ ] Test pre-sleep evaluation
- [ ] Test between-meal corrections

## Rollout Plan

1. **Development**: Implement and test in dev environment
2. **Staging**: Deploy to staging, test with sample data
3. **Migration Script**: Create script to migrate existing user profiles
4. **Production**: Deploy with migration, monitor for issues
5. **User Communication**: Notify users of enhanced calculations

## Benefits

✅ **Medical Accuracy**: Uses clinically-validated oref0 algorithm
✅ **Time-of-Day Ratios**: Different IC ratios for breakfast/lunch/dinner
✅ **Advanced IOB**: More accurate insulin-on-board calculation
✅ **Safety Features**: Built-in warnings and safety checks
✅ **Pre-Sleep Safety**: Special evaluation before bedtime
✅ **Between-Meal Corrections**: 50% rule for safety
✅ **Context Awareness**: Adjustments for exercise, illness, etc.
✅ **Validation**: Weekly pattern analysis and recommendations

## References

- mdi-insulin-algorithm: `/Users/alejandrozdut/Documents/mdi-insulin-algorithm`
- AI Agents Guide: `/Users/alejandrozdut/Documents/mdi-insulin-algorithm/AI_AGENTS_GUIDE.md`
- Algorithm Documentation: `/Users/alejandrozdut/Documents/mdi-insulin-algorithm/README.md`
