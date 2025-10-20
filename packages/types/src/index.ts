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
  carbRatio: number;
  insulinSensitivityFactor: number;
  targetGlucose?: number;
  minTargetGlucose: number;
  maxTargetGlucose: number;
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
};

export type Meal = {
  id: string;
  userId: string;
  name: string;
  carbohydrates?: number;
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

// Export insulin calculation utilities
export * from "./insulin-calculations";
