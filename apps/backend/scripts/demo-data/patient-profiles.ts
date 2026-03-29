/**
 * Demo patient profile definitions
 */

export interface PatientProfile {
  // Personal Info
  email: string;
  password: string; // Will be hashed
  firstName: string;
  lastName: string;
  avatarPath: string;
  age: number;
  gender: "M" | "F";
  weight: number; // kg
  diabetesType: "TYPE_1" | "TYPE_2";

  // Target Ranges
  minTarget: number; // mg/dL
  maxTarget: number; // mg/dL

  // Glucose Profile
  meanGlucose: number; // mg/dL
  stdDev: number; // mg/dL
  coefficientOfVariation: number; // %
  targetInRangePercentage: number; // %
  hypoglycemiaPercentage: number; // % (<70 mg/dL)
  severeHypoglycemiaPercentage: number; // % (<54 mg/dL)
  hyperglycemiaPercentage: number; // % (>180 mg/dL)

  // Insulin Profile
  icRatioBreakfast: number;
  icRatioLunch: number;
  icRatioDinner: number;
  insulinSensitivityFactor: number;

  // Data Generation Settings
  readingSource: "MANUAL" | "LIBRE_NFC" | "DEXCOM";
  readingsPerDay: number;
  mealsPerDay: number;
  cgmDevice?: "LIBRE_NFC" | "DEXCOM"; // Only for CGM patients - determines if GlucoseReading records are created

  // Special Settings
  isInactive?: boolean; // For patient #10
  dataStartDaysAgo?: number; // Override for inactive patient
  dataEndDaysAgo?: number; // Override for inactive patient

  // Expected Status
  expectedStatus: "RIESGO" | "ESTABLE" | "INACTIVO";
}

export const DEMO_PATIENTS: PatientProfile[] = [
  // Patient 1: Ana - Young Adult, Excellent Control (MANUAL)
  {
    email: "demo-patient-1@glucosapp.demo",
    password: "Demo123!",
    firstName: "Ana",
    lastName: "Martínez",
    avatarPath: "/demo-avatars/ana-martinez.svg",
    age: 25,
    gender: "F",
    weight: 62,
    diabetesType: "TYPE_1",
    minTarget: 70,
    maxTarget: 140,
    meanGlucose: 110,
    stdDev: 18,
    coefficientOfVariation: 16,
    targetInRangePercentage: 85,
    hypoglycemiaPercentage: 2,
    severeHypoglycemiaPercentage: 0,
    hyperglycemiaPercentage: 13,
    icRatioBreakfast: 15,
    icRatioLunch: 12,
    icRatioDinner: 10,
    insulinSensitivityFactor: 50,
    readingSource: "MANUAL",
    readingsPerDay: 6,
    mealsPerDay: 3,
    expectedStatus: "ESTABLE",
  },

  // Patient 2: Carlos - Young Adult, Poor Control (CGM)
  {
    email: "demo-patient-2@glucosapp.demo",
    password: "Demo123!",
    firstName: "Carlos",
    lastName: "González",
    avatarPath: "/demo-avatars/carlos-gonzalez.svg",
    age: 26,
    gender: "M",
    weight: 78,
    diabetesType: "TYPE_1",
    minTarget: 70,
    maxTarget: 180,
    meanGlucose: 185,
    stdDev: 75,
    coefficientOfVariation: 40,
    targetInRangePercentage: 35,
    hypoglycemiaPercentage: 8,
    severeHypoglycemiaPercentage: 2,
    hyperglycemiaPercentage: 57,
    icRatioBreakfast: 12,
    icRatioLunch: 10,
    icRatioDinner: 8,
    insulinSensitivityFactor: 40,
    readingSource: "LIBRE_NFC",
    readingsPerDay: 288, // Every 5 minutes
    mealsPerDay: 3,
    cgmDevice: "LIBRE_NFC", // CGM patient - creates continuous GlucoseReading records
    expectedStatus: "RIESGO", // CV 40%, 35% in range, severe hypos
  },

  // Patient 3: María - Middle-Aged, Excellent Control (MANUAL)
  {
    email: "demo-patient-3@glucosapp.demo",
    password: "Demo123!",
    firstName: "María",
    lastName: "López",
    avatarPath: "/demo-avatars/maria-lopez.svg",
    age: 45,
    gender: "F",
    weight: 68,
    diabetesType: "TYPE_2",
    minTarget: 80,
    maxTarget: 140,
    meanGlucose: 105,
    stdDev: 15,
    coefficientOfVariation: 14,
    targetInRangePercentage: 92,
    hypoglycemiaPercentage: 1,
    severeHypoglycemiaPercentage: 0,
    hyperglycemiaPercentage: 7,
    icRatioBreakfast: 18,
    icRatioLunch: 15,
    icRatioDinner: 12,
    insulinSensitivityFactor: 60,
    readingSource: "MANUAL",
    readingsPerDay: 5,
    mealsPerDay: 3,
    expectedStatus: "ESTABLE",
  },

  // Patient 4: Roberto - Middle-Aged, Borderline with Hypos (CGM)
  {
    email: "demo-patient-4@glucosapp.demo",
    password: "Demo123!",
    firstName: "Roberto",
    lastName: "Fernández",
    avatarPath: "/demo-avatars/roberto-fernandez.svg",
    age: 40,
    gender: "M",
    weight: 82,
    diabetesType: "TYPE_1",
    minTarget: 70,
    maxTarget: 160,
    meanGlucose: 145,
    stdDev: 48,
    coefficientOfVariation: 33,
    targetInRangePercentage: 55,
    hypoglycemiaPercentage: 5,
    severeHypoglycemiaPercentage: 0.5,
    hyperglycemiaPercentage: 40,
    icRatioBreakfast: 14,
    icRatioLunch: 11,
    icRatioDinner: 9,
    insulinSensitivityFactor: 45,
    readingSource: "LIBRE_NFC",
    readingsPerDay: 288,
    mealsPerDay: 3,
    cgmDevice: "LIBRE_NFC", // CGM patient - creates continuous GlucoseReading records
    expectedStatus: "RIESGO", // ≥4% hypos
  },

  // Patient 5: Elena - Older Adult, Persistent Hyperglycemia (MANUAL)
  {
    email: "demo-patient-5@glucosapp.demo",
    password: "Demo123!",
    firstName: "Elena",
    lastName: "Rodríguez",
    avatarPath: "/demo-avatars/elena-rodriguez.svg",
    age: 60,
    gender: "F",
    weight: 75,
    diabetesType: "TYPE_2",
    minTarget: 80,
    maxTarget: 160,
    meanGlucose: 220,
    stdDev: 50,
    coefficientOfVariation: 23,
    targetInRangePercentage: 25,
    hypoglycemiaPercentage: 0,
    severeHypoglycemiaPercentage: 0,
    hyperglycemiaPercentage: 75,
    icRatioBreakfast: 20,
    icRatioLunch: 18,
    icRatioDinner: 15,
    insulinSensitivityFactor: 55,
    readingSource: "MANUAL",
    readingsPerDay: 4,
    mealsPerDay: 3,
    expectedStatus: "RIESGO", // <50% in range
  },

  // Patient 6: Jorge - Older Adult, Good Control (CGM)
  {
    email: "demo-patient-6@glucosapp.demo",
    password: "Demo123!",
    firstName: "Jorge",
    lastName: "Sánchez",
    avatarPath: "/demo-avatars/jorge-sanchez.svg",
    age: 58,
    gender: "M",
    weight: 71,
    diabetesType: "TYPE_2",
    minTarget: 80,
    maxTarget: 150,
    meanGlucose: 115,
    stdDev: 22,
    coefficientOfVariation: 19,
    targetInRangePercentage: 78,
    hypoglycemiaPercentage: 2,
    severeHypoglycemiaPercentage: 0,
    hyperglycemiaPercentage: 20,
    icRatioBreakfast: 17,
    icRatioLunch: 14,
    icRatioDinner: 12,
    insulinSensitivityFactor: 58,
    readingSource: "DEXCOM",
    readingsPerDay: 288,
    mealsPerDay: 3,
    cgmDevice: "DEXCOM", // CGM patient - creates continuous GlucoseReading records
    expectedStatus: "ESTABLE",
  },

  // Patient 7: Isabel - Senior, Hypoglycemia Issues (CGM)
  {
    email: "demo-patient-7@glucosapp.demo",
    password: "Demo123!",
    firstName: "Isabel",
    lastName: "Torres",
    avatarPath: "/demo-avatars/isabel-torres.svg",
    age: 77,
    gender: "F",
    weight: 58,
    diabetesType: "TYPE_1",
    minTarget: 80,
    maxTarget: 160,
    meanGlucose: 125,
    stdDev: 55,
    coefficientOfVariation: 44,
    targetInRangePercentage: 48,
    hypoglycemiaPercentage: 12,
    severeHypoglycemiaPercentage: 3,
    hyperglycemiaPercentage: 40,
    icRatioBreakfast: 16,
    icRatioLunch: 13,
    icRatioDinner: 11,
    insulinSensitivityFactor: 52,
    readingSource: "LIBRE_NFC",
    readingsPerDay: 288,
    mealsPerDay: 3,
    cgmDevice: "LIBRE_NFC", // CGM patient - creates continuous GlucoseReading records
    expectedStatus: "RIESGO", // CV 44%, ≥4% hypos, ≥1% severe
  },

  // Patient 8: Pedro - Senior, Stable Control (MANUAL)
  {
    email: "demo-patient-8@glucosapp.demo",
    password: "Demo123!",
    firstName: "Pedro",
    lastName: "Ramírez",
    avatarPath: "/demo-avatars/pedro-ramirez.svg",
    age: 73,
    gender: "M",
    weight: 70,
    diabetesType: "TYPE_2",
    minTarget: 80,
    maxTarget: 160,
    meanGlucose: 120,
    stdDev: 25,
    coefficientOfVariation: 21,
    targetInRangePercentage: 75,
    hypoglycemiaPercentage: 3,
    severeHypoglycemiaPercentage: 0,
    hyperglycemiaPercentage: 22,
    icRatioBreakfast: 19,
    icRatioLunch: 16,
    icRatioDinner: 14,
    insulinSensitivityFactor: 56,
    readingSource: "MANUAL",
    readingsPerDay: 5,
    mealsPerDay: 3,
    expectedStatus: "ESTABLE",
  },

  // Patient 9: Laura - Adult, Moderate Control, High Variability (CGM)
  {
    email: "demo-patient-9@glucosapp.demo",
    password: "Demo123!",
    firstName: "Laura",
    lastName: "Díaz",
    avatarPath: "/demo-avatars/laura-diaz.svg",
    age: 33,
    gender: "F",
    weight: 65,
    diabetesType: "TYPE_1",
    minTarget: 70,
    maxTarget: 160,
    meanGlucose: 150,
    stdDev: 60,
    coefficientOfVariation: 40,
    targetInRangePercentage: 52,
    hypoglycemiaPercentage: 6,
    severeHypoglycemiaPercentage: 1,
    hyperglycemiaPercentage: 42,
    icRatioBreakfast: 13,
    icRatioLunch: 10,
    icRatioDinner: 8,
    insulinSensitivityFactor: 48,
    readingSource: "DEXCOM",
    readingsPerDay: 288,
    mealsPerDay: 3,
    cgmDevice: "DEXCOM", // CGM patient - creates continuous GlucoseReading records
    expectedStatus: "RIESGO", // CV 40%, borderline range
  },

  // Patient 10: Miguel - Inactive Patient (MANUAL)
  {
    email: "demo-patient-10@glucosapp.demo",
    password: "Demo123!",
    firstName: "Miguel",
    lastName: "Morales",
    avatarPath: "/demo-avatars/miguel-morales.svg",
    age: 51,
    gender: "M",
    weight: 88,
    diabetesType: "TYPE_2",
    minTarget: 80,
    maxTarget: 160,
    meanGlucose: 140,
    stdDev: 35,
    coefficientOfVariation: 25,
    targetInRangePercentage: 60,
    hypoglycemiaPercentage: 4,
    severeHypoglycemiaPercentage: 0,
    hyperglycemiaPercentage: 36,
    icRatioBreakfast: 18,
    icRatioLunch: 15,
    icRatioDinner: 12,
    insulinSensitivityFactor: 50,
    readingSource: "MANUAL",
    readingsPerDay: 5,
    mealsPerDay: 3,
    isInactive: true,
    dataStartDaysAgo: 180, // 6 months ago
    dataEndDaysAgo: 90, // Stopped 90 days ago
    expectedStatus: "INACTIVO", // No activity in last 24 hours
  },
];
