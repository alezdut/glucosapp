import { UserRole, type User } from "@glucosapp/types";
import type {
  Alert,
  DashboardSummary,
  GlucoseEvolution,
  InsulinStats,
  MealStats,
} from "@/lib/dashboard-api";

export const createUser = (overrides: Partial<User> = {}): User => ({
  id: "doctor-1",
  email: "doctor@example.com",
  firstName: "Ada",
  lastName: "Lovelace",
  emailVerified: true,
  role: UserRole.DOCTOR,
  createdAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

export const createDashboardSummary = (
  overrides: Partial<DashboardSummary> = {},
): DashboardSummary => ({
  activePatients: 12,
  criticalAlerts: 3,
  upcomingAppointments: 4,
  ...overrides,
});

export const createGlucoseEvolution = (
  overrides: Partial<GlucoseEvolution> = {},
): GlucoseEvolution => ({
  data: [
    {
      date: "2026-04-01",
      averageGlucose: 130,
      minGlucose: 90,
      maxGlucose: 180,
    },
  ],
  ...overrides,
});

export const createInsulinStats = (overrides: Partial<InsulinStats> = {}): InsulinStats => ({
  averageDose: 18,
  unit: "U/dia",
  days: 7,
  description: "Promedio semanal",
  ...overrides,
});

export const createMealStats = (overrides: Partial<MealStats> = {}): MealStats => ({
  totalMeals: 21,
  unit: "comidas",
  description: "Promedio semanal",
  ...overrides,
});

export const createAlert = (overrides: Partial<Alert> = {}): Alert => ({
  id: "alert-1",
  userId: "patient-1",
  type: "HIGH_GLUCOSE",
  severity: "HIGH",
  message: "Glucosa alta",
  acknowledged: false,
  createdAt: "2026-04-01T10:00:00.000Z",
  patient: {
    id: "patient-1",
    email: "patient@example.com",
    firstName: "Jane",
    lastName: "Doe",
  },
  ...overrides,
});
