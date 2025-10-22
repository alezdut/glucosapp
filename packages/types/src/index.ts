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

export enum MealType {
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
  valueMgDl: number;
  measuredAt: string;
};

export type InsulinDose = {
  id: string;
  userId: string;
  units: number;
  calculatedUnits?: number;
  wasManuallyEdited: boolean;
  recordedAt: string;
  type: InsulinType;
  mealType?: MealType;
  isCorrection?: boolean;
  carbInsulin?: number;
  correctionInsulin?: number;
  iobSubtracted?: number;
};

export type Meal = {
  id: string;
  userId: string;
  name: string;
  carbohydrates?: number;
  mealType?: MealType;
  recordedAt: string;
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
  glucoseEntry?: GlucoseEntry;
  insulinDose?: InsulinDose;
  meal?: Meal;
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
export * from "./insulin-profile";

// Export insulin calculation utilities
export * from "./insulin-calculations";
