import { DiabetesType } from "@prisma/client";

/**
 * Patient information for individual reports
 */
export interface PatientInfo {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  diabetesType: DiabetesType | null;
  birthDate: Date | null;
  weight: number | null;
  minTargetGlucose: number | null;
  maxTargetGlucose: number | null;
}

/**
 * Glucose data for reports
 */
export interface GlucoseData {
  entries: Array<{
    id: string;
    mgdl: number;
    recordedAt: Date;
    note?: string | null;
  }>;
  readings: Array<{
    id: string;
    glucose: number;
    recordedAt: Date;
  }>;
  average: number;
  min: number;
  max: number;
  count: number;
}

/**
 * Insulin data for reports
 */
export interface InsulinData {
  doses: Array<{
    id: string;
    units: number;
    recordedAt: Date;
    insulinType: string | null;
  }>;
  totalUnits: number;
  averageUnits: number;
  count: number;
}

/**
 * Meals data for reports
 */
export interface MealsData {
  meals: Array<{
    id: string;
    name: string;
    carbs: number;
    createdAt: Date;
  }>;
  totalCarbs: number;
  averageCarbs: number;
  count: number;
}

/**
 * Individual patient report data
 */
export interface IndividualReportData {
  patient: PatientInfo;
  startDate: string;
  endDate: string;
  glucose?: GlucoseData;
  insulin?: InsulinData;
  meals?: MealsData;
  aiSummary?: string;
}

/**
 * Patient demographics for group reports
 */
export interface PatientDemographics {
  diabetesType: DiabetesType | null;
  birthDate: Date | null;
  weight: number | null;
  minTargetGlucose: number | null;
  maxTargetGlucose: number | null;
}

/**
 * Diabetes type distribution statistics
 */
export interface DiabetesTypeDistribution {
  type1: number;
  type2: number;
  gestational: number;
  other: number;
}

/**
 * Age distribution statistics
 */
export interface AgeDistribution {
  "18-30": number;
  "31-50": number;
  "51-70": number;
  "70+": number;
  unknown: number;
}

/**
 * Weight distribution statistics
 */
export interface WeightDistribution {
  "<60": number;
  "60-80": number;
  "80-100": number;
  "100+": number;
  unknown: number;
}

/**
 * Group report data
 */
export interface GroupReportData {
  startDate: string;
  endDate: string;
  totalPatients: number;
  filters: Record<string, unknown>;
  demographics?: {
    diabetesTypeDistribution: Record<string, number>;
    ageStats?: {
      average: number;
      min: number;
      max: number;
      median: number;
    } | null;
    weightStats?: {
      average: number;
      min: number;
      max: number;
      median: number;
    } | null;
    targetGlucoseRange?: {
      averageMin: number;
      averageMax: number;
    } | null;
  };
  glucose?: {
    totalReadings: number;
    average: number;
    min: number;
    max: number;
    count: number;
  };
  insulin?: {
    totalDoses: number;
    totalUnits: number;
    averageDose: number;
    averageDailyUnits: number;
  };
  meals?: {
    totalMeals: number;
    totalCarbohydrates: number;
    averageCarbs: number;
    averageCarbsPerMeal: number;
  };
  aiSummary?: string;
}
