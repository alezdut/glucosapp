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
  diabetesType?: string;
  glucoseUnit: string;
  theme: string;
  language: string;
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
  recordedAt: string;
  type: string;
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

export enum AuthProvider {
  LOCAL = "local",
  GOOGLE = "google",
}

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: User;
};
