export enum DiabetesType {
  TYPE_1 = "TYPE_1",
  TYPE_2 = "TYPE_2",
}

export enum GlucoseUnit {
  MG_DL = "MG_DL",
  MMOL_L = "MMOL_L",
}

export enum Theme {
  LIGHT = "LIGHT",
  DARK = "DARK",
}

export enum Language {
  ES = "ES",
  EN = "EN",
}

export enum InsulinType {
  BASAL = "BASAL",
  BOLUS = "BOLUS",
}

export enum MealCategory {
  BREAKFAST = "BREAKFAST",
  LUNCH = "LUNCH",
  DINNER = "DINNER",
  SNACK = "SNACK",
  CORRECTION = "CORRECTION",
}

export type User = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  emailVerified: boolean;
  createdAt: string;
};

export type UserProfile = User & {
  birthDate?: string;
  weight?: number;
  diabetesType?: DiabetesType;
  glucoseUnit: GlucoseUnit;
  theme: Theme;
  language: Language;
  // Insulin Profile - Time-of-day specific IC Ratios
  icRatioBreakfast: number;
  icRatioLunch: number;
  icRatioDinner: number;
  insulinSensitivityFactor: number;
  diaHours: number;
  targetGlucose?: number;
  minTargetGlucose: number;
  maxTargetGlucose: number;
  // Meal time ranges (in minutes from midnight, 0-1439)
  mealTimeBreakfastStart: number;
  mealTimeBreakfastEnd: number;
  mealTimeLunchStart: number;
  mealTimeLunchEnd: number;
  mealTimeDinnerStart: number;
  mealTimeDinnerEnd: number;
};

export type GlucoseEntry = {
  id: string;
  userId: string;
  mgdl: number;
  recordedAt: string;
};

export type InsulinDose = {
  id: string;
  userId: string;
  units: number;
  calculatedUnits?: number;
  wasManuallyEdited: boolean;
  recordedAt: string;
  type: InsulinType;
  mealType?: MealCategory;
  isCorrection?: boolean;
  carbInsulin?: number;
  correctionInsulin?: number;
  iobSubtracted?: number;
};

export type MealItem = {
  id: string;
  mealId: string;
  name: string;
  quantity: number;
  carbs: number;
};

export type Meal = {
  id: string;
  userId: string;
  name: string;
  carbohydrates: number;
  foodItems: MealItem[];
  createdAt: string;
  updatedAt: string;
};

export type Statistics = {
  averageGlucose: number;
  dailyInsulinDose: number;
  mealsRegistered: number;
};

export type LogEntry = {
  id: string;
  userId: string;
  recordedAt: string;
  mealType?: MealCategory;
  carbohydrates?: number;
  glucoseEntry?: GlucoseEntry;
  insulinDose?: InsulinDose;
  mealTemplate?: Meal;
  // Context factors
  recentExercise: boolean;
  alcohol: boolean;
  illness: boolean;
  stress: boolean;
  menstruation: boolean;
  highFatMeal: boolean;
};

export type FoodItem = {
  name: string;
  carbohydratesPer100g: number;
  brand?: string;
};

export type FoodListItem = {
  name: string;
  quantity: number;
  carbohydrates: number;
};

export enum AuthProvider {
  LOCAL = "local",
  GOOGLE = "google",
}

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: User;
};

// Export constants
export * from "./constants";

// Export insulin profile types (mdi-insulin-algorithm compatible)
// Re-export MealType from insulin-profile as MealTypeString to avoid collision
export type { MealType as MealTypeString } from "./insulin-profile";
export * from "./insulin-profile";

// Export insulin calculation utilities
export * from "./insulin-calculations";

// Export sensor readings types
export * from "./sensor-readings";
