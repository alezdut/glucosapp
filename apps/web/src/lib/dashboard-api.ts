import { makeApiClient } from "@glucosapp/api-client";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";
const { client } = makeApiClient(`${apiBaseUrl}/v1`);
import type { LogEntry } from "@glucosapp/types";

export interface DashboardSummary {
  activePatients: number;
  criticalAlerts: number;
  upcomingAppointments: number;
}

export interface GlucoseEvolutionPoint {
  date: string;
  averageGlucose: number;
  minGlucose: number;
  maxGlucose: number;
}

export interface GlucoseEvolution {
  data: GlucoseEvolutionPoint[];
}

export interface InsulinStats {
  averageDose: number;
  unit: string;
  days: number;
  description: string;
}

export interface MealStats {
  totalMeals: number;
  unit: string;
  description: string;
}

export interface Alert {
  id: string;
  userId: string;
  type: string;
  severity: string;
  message: string;
  glucoseReadingId?: string;
  acknowledged: boolean;
  acknowledgedAt?: string;
  createdAt: string;
  patient?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

/**
 * Get dashboard summary
 */
export async function getDashboardSummary(accessToken: string): Promise<DashboardSummary> {
  const response = await client.GET<DashboardSummary>("/dashboard/summary", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (response.error) {
    throw new Error(response.error.message || "Failed to fetch dashboard summary");
  }
  return response.data!;
}

/**
 * Get glucose evolution data
 */
export async function getGlucoseEvolution(accessToken: string): Promise<GlucoseEvolution> {
  const response = await client.GET<GlucoseEvolution>("/dashboard/glucose-evolution", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (response.error) {
    throw new Error(response.error.message || "Failed to fetch glucose evolution");
  }
  return response.data!;
}

/**
 * Get insulin statistics
 */
export async function getInsulinStats(accessToken: string, days?: number): Promise<InsulinStats> {
  const queryParams = days ? `?days=${days}` : "";
  const response = await client.GET<InsulinStats>(`/dashboard/insulin-stats${queryParams}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (response.error) {
    throw new Error(response.error.message || "Failed to fetch insulin stats");
  }
  return response.data!;
}

/**
 * Get meal statistics
 */
export async function getMealStats(accessToken: string, days?: number): Promise<MealStats> {
  const queryParams = days ? `?days=${days}` : "";
  const response = await client.GET<MealStats>(`/dashboard/meal-stats${queryParams}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (response.error) {
    throw new Error(response.error.message || "Failed to fetch meal stats");
  }
  return response.data!;
}

/**
 * Get recent alerts
 */
export async function getRecentAlerts(accessToken: string, limit?: number): Promise<Alert[]> {
  const queryParams = limit ? `?limit=${limit}` : "";
  const response = await client.GET<Alert[]>(`/dashboard/recent-alerts${queryParams}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (response.error) {
    throw new Error(response.error.message || "Failed to fetch recent alerts");
  }
  return response.data!;
}

/**
 * Get critical alerts (unacknowledged, severity CRITICAL or HIGH)
 */
export async function getCriticalAlerts(accessToken: string): Promise<Alert[]> {
  const response = await client.GET<Alert[]>(`/alerts/critical`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (response.error) {
    throw new Error(response.error.message || "Failed to fetch critical alerts");
  }
  return response.data!;
}

/**
 * Get unacknowledged alerts
 */
export async function getUnacknowledgedAlerts(
  accessToken: string,
  limit?: number,
): Promise<Alert[]> {
  const queryParams = limit ? `?limit=${limit}` : "";
  const response = await client.GET<Alert[]>(`/alerts${queryParams}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (response.error) {
    throw new Error(response.error.message || "Failed to fetch alerts");
  }
  // Filter to only return unacknowledged alerts
  return (response.data || []).filter((alert) => !alert.acknowledged);
}

/**
 * Acknowledge an alert
 */
export async function acknowledgeAlert(accessToken: string, alertId: string): Promise<Alert> {
  const response = await client.POST<Alert>(`/alerts/${alertId}/acknowledge`, undefined, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (response.error) {
    throw new Error(response.error.message || "Failed to acknowledge alert");
  }
  return response.data!;
}

export interface PatientListItem {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  diabetesType?: "TYPE_1" | "TYPE_2";
  lastGlucoseReading?: {
    value: number;
    recordedAt: string;
  };
  status: "Riesgo" | "Estable";
  activityStatus: "Activo" | "Inactivo";
  registrationDate: string;
}

export interface GetPatientsFilters {
  search?: string;
  diabetesType?: "TYPE_1" | "TYPE_2";
  activeOnly?: boolean;
  registrationDate?: string;
}

/**
 * Get patients with filters (local search - only assigned patients)
 */
export async function getPatientsWithFilters(
  accessToken: string,
  filters?: GetPatientsFilters,
): Promise<PatientListItem[]> {
  const queryParams = new URLSearchParams();
  if (filters?.search) queryParams.append("search", filters.search);
  if (filters?.diabetesType) queryParams.append("diabetesType", filters.diabetesType);
  if (filters?.activeOnly) queryParams.append("activeOnly", "true");
  if (filters?.registrationDate) queryParams.append("registrationDate", filters.registrationDate);

  const queryString = queryParams.toString();
  const url = `/doctor-patients${queryString ? `?${queryString}` : ""}`;

  const response = await client.GET<PatientListItem[]>(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (response.error) {
    throw new Error(response.error.message || "Failed to fetch patients");
  }
  return response.data!;
}

/**
 * Search for patients globally (all patients, not just assigned)
 */
export async function searchGlobalPatients(
  accessToken: string,
  query: string,
): Promise<PatientListItem[]> {
  const queryParams = new URLSearchParams({ q: query });
  const response = await client.GET<PatientListItem[]>(`/doctor-patients/search?${queryParams}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (response.error) {
    throw new Error(response.error.message || "Failed to search patients");
  }
  return response.data!;
}

/**
 * Assign a patient to the doctor
 */
export async function assignPatient(accessToken: string, patientId: string): Promise<void> {
  const response = await client.POST(
    "/doctor-patients",
    { patientId },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  if (response.error) {
    throw new Error(response.error.message || "Failed to assign patient");
  }
}

export interface PatientDetails {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  diabetesType?: "TYPE_1" | "TYPE_2";
  birthDate?: string;
  weight?: number;
  lastGlucoseReading?: {
    value: number;
    recordedAt: string;
  };
  status: "Riesgo" | "Estable";
  activityStatus: "Activo" | "Inactivo";
  registrationDate: string;
  totalGlucoseReadings: number;
  totalInsulinDoses: number;
  totalMeals: number;
  totalAlerts: number;
  unacknowledgedAlerts: number;
}

/**
 * Get detailed information about a specific patient
 */
export async function getPatientDetails(
  accessToken: string,
  patientId: string,
): Promise<PatientDetails> {
  const response = await client.GET<PatientDetails>(`/doctor-patients/${patientId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (response.error) {
    throw new Error(response.error.message || "Failed to fetch patient details");
  }
  return response.data!;
}

export interface PatientGlucoseEvolutionPoint {
  month: string;
  averageGlucose: number;
  minGlucose: number;
  maxGlucose: number;
}

export interface PatientGlucoseEvolution {
  data: PatientGlucoseEvolutionPoint[];
}

export interface PatientInsulinStatsPoint {
  month: string;
  averageBasal: number;
  averageBolus: number;
}

export interface PatientInsulinStats {
  data: PatientInsulinStatsPoint[];
}

export interface PatientMeal {
  id: string;
  recordedAt: string;
  mealType?: string;
  carbohydrates?: number;
  mealTemplate?: {
    id: string;
    name: string;
    carbohydrates: number;
    foodItems: Array<{
      id: string;
      name: string;
      quantity: number;
      carbs: number;
    }>;
  };
}

export interface PatientProfile {
  id: string;
  email: string;
  icRatioBreakfast: number;
  icRatioLunch: number;
  icRatioDinner: number;
  insulinSensitivityFactor: number;
  diaHours: number;
  targetGlucose?: number;
  minTargetGlucose: number;
  maxTargetGlucose: number;
  mealTimeBreakfastStart?: number;
  mealTimeBreakfastEnd?: number;
  mealTimeLunchStart?: number;
  mealTimeLunchEnd?: number;
  mealTimeDinnerStart?: number;
  mealTimeDinnerEnd?: number;
}

/**
 * Get patient glucose evolution data for last N months
 */
export async function getPatientGlucoseEvolution(
  accessToken: string,
  patientId: string,
  months?: number,
): Promise<PatientGlucoseEvolution> {
  const queryParams = months ? `?months=${months}` : "";
  const response = await client.GET<PatientGlucoseEvolution>(
    `/dashboard/patients/${patientId}/glucose-evolution${queryParams}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  if (response.error) {
    throw new Error(response.error.message || "Failed to fetch patient glucose evolution");
  }
  if (!response.data) {
    throw new Error("No data returned from patient glucose evolution endpoint");
  }
  return response.data;
}

/**
 * Get patient insulin statistics for last N months
 */
export async function getPatientInsulinStats(
  accessToken: string,
  patientId: string,
  months?: number,
): Promise<PatientInsulinStats> {
  const queryParams = months ? `?months=${months}` : "";
  const response = await client.GET<PatientInsulinStats>(
    `/dashboard/patients/${patientId}/insulin-stats${queryParams}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  if (response.error) {
    throw new Error(response.error.message || "Failed to fetch patient insulin stats");
  }
  if (!response.data) {
    throw new Error("No data returned from patient insulin stats endpoint");
  }
  return response.data;
}

/**
 * Get patient meals with optional date range
 */
export async function getPatientMeals(
  accessToken: string,
  patientId: string,
  startDate?: string,
  endDate?: string,
): Promise<PatientMeal[]> {
  const queryParams = new URLSearchParams();
  if (startDate) queryParams.append("startDate", startDate);
  if (endDate) queryParams.append("endDate", endDate);
  const queryString = queryParams.toString();
  const url = `/doctor-patients/${patientId}/meals${queryString ? `?${queryString}` : ""}`;

  const response = await client.GET<PatientMeal[]>(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (response.error) {
    throw new Error(response.error.message || "Failed to fetch patient meals");
  }
  return response.data!;
}

/**
 * Get patient profile/parameters
 */
export async function getPatientProfile(
  accessToken: string,
  patientId: string,
): Promise<PatientProfile> {
  const response = await client.GET<PatientProfile>(`/doctor-patients/${patientId}/profile`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (response.error) {
    throw new Error(response.error.message || "Failed to fetch patient profile");
  }
  return response.data!;
}

/**
 * Get patient unified log entries (historial) with optional date range
 */
export async function getPatientLogEntries(
  accessToken: string,
  patientId: string,
  startDate?: string,
  endDate?: string,
): Promise<LogEntry[]> {
  const queryParams = new URLSearchParams();
  if (startDate) queryParams.append("startDate", startDate);
  if (endDate) queryParams.append("endDate", endDate);
  const queryString = queryParams.toString();
  const url = `/doctor-patients/${patientId}/log-entries${queryString ? `?${queryString}` : ""}`;

  const response = await client.GET<LogEntry[]>(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (response.error) {
    throw new Error(response.error.message || "Failed to fetch patient log entries");
  }
  return response.data || [];
}

/**
 * Update patient profile/parameters
 */
export async function updatePatientProfile(
  accessToken: string,
  patientId: string,
  data: Partial<PatientProfile>,
): Promise<PatientProfile> {
  const response = await client.PATCH<PatientProfile>(
    `/doctor-patients/${patientId}/profile`,
    data,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  if (response.error) {
    throw new Error(response.error.message || "Failed to update patient profile");
  }
  if (!response.data) {
    throw new Error("No data returned from update patient profile endpoint");
  }
  return response.data;
}
