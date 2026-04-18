import { makeApiClient } from "@glucosapp/api-client";
import type { LogEntry } from "@glucosapp/types";
import { getWebApiBaseUrl } from "./env";

const apiBaseUrl = getWebApiBaseUrl();
const { client } = makeApiClient(apiBaseUrl);

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

export interface GetAlertsFilters {
  limit?: number;
  acknowledged?: boolean;
  severity?: string[];
  sinceHours?: number;
  patientId?: string;
}

/**
 * Get dashboard summary
 */
export async function getDashboardSummary(
  accessToken: string,
  days?: number,
): Promise<DashboardSummary> {
  const queryParams = days ? `?days=${days}` : "";
  const response = await client.GET<DashboardSummary>(`/dashboard/summary${queryParams}`, {
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
export async function getGlucoseEvolution(
  accessToken: string,
  days?: number,
): Promise<GlucoseEvolution> {
  const queryParams = days ? `?days=${days}` : "";
  const response = await client.GET<GlucoseEvolution>(
    `/dashboard/glucose-evolution${queryParams}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
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
 * Get alerts with optional filters (unified endpoint)
 */
export async function getAlerts(accessToken: string, filters?: GetAlertsFilters): Promise<Alert[]> {
  // Build query params from filters
  const queryParams = new URLSearchParams();
  if (filters?.limit) queryParams.append("limit", filters.limit.toString());
  if (filters?.acknowledged !== undefined)
    queryParams.append("acknowledged", filters.acknowledged.toString());
  if (filters?.severity?.length) queryParams.append("severity", filters.severity.join(","));
  if (filters?.sinceHours) queryParams.append("sinceHours", filters.sinceHours.toString());
  if (filters?.patientId) queryParams.append("patientId", filters.patientId);

  const queryString = queryParams.toString();
  const response = await client.GET<Alert[]>(`/alerts${queryString ? `?${queryString}` : ""}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (response.error) {
    throw new Error(response.error.message || "Failed to fetch alerts");
  }
  return response.data || [];
}

/**
 * Get recent alerts (most recent alerts, regardless of age)
 */
export async function getRecentAlerts(accessToken: string, limit?: number): Promise<Alert[]> {
  return getAlerts(accessToken, { limit });
}

/**
 * Get critical alerts (unacknowledged, severity CRITICAL or HIGH)
 */
export async function getCriticalAlerts(accessToken: string): Promise<Alert[]> {
  return getAlerts(accessToken, {
    acknowledged: false,
    severity: ["CRITICAL", "HIGH"],
  });
}

/**
 * Get unacknowledged alerts (respects user's alert settings configuration)
 */
export async function getUnacknowledgedAlerts(
  accessToken: string,
  limit?: number,
): Promise<Alert[]> {
  return getAlerts(accessToken, {
    acknowledged: false,
    limit,
  });
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

/**
 * Acknowledge multiple alerts at once
 */
export async function acknowledgeBatchAlerts(
  accessToken: string,
  options: { alertIds?: string[]; acknowledgeAll?: boolean },
): Promise<{ acknowledgedCount: number }> {
  const response = await client.POST<{ acknowledgedCount: number }>(
    "/alerts/acknowledge-batch",
    options,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    },
  );
  if (response.error) {
    throw new Error(response.error.message || "Failed to acknowledge alerts");
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
  clinicalStatus?: "Riesgo" | "Estable";
  activityStatus?: "Activo" | "Inactivo";
  ageRange?: string;
  weightRange?: string;
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

/**
 * Remove/unassign a patient from the doctor
 */
export async function removePatient(accessToken: string, patientId: string): Promise<void> {
  const response = await client.DELETE(`/doctor-patients/${patientId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (response.error) {
    throw new Error(response.error.message || "Failed to remove patient");
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

export interface GenerateReportOptions {
  startDate: string;
  endDate: string;
  reportTypes: string[];
  format: "pdf" | "csv";
  includeAISummary?: boolean;
}

export interface GenerateGroupReportOptions extends GenerateReportOptions {
  filters?: GetPatientsFilters;
}

/**
 * Generate individual patient report
 */
export async function generateIndividualReport(
  accessToken: string,
  patientId: string,
  options: GenerateReportOptions,
): Promise<Blob> {
  const response = await fetch(`${apiBaseUrl}/reports/individual`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      patientId,
      ...options,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Failed to generate report" }));
    throw new Error(error.message || "Failed to generate report");
  }

  return response.blob();
}

/**
 * Generate group report for multiple patients
 */
export async function generateGroupReport(
  accessToken: string,
  options: GenerateGroupReportOptions,
): Promise<Blob> {
  const response = await fetch(`${apiBaseUrl}/reports/group`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Failed to generate report" }));
    throw new Error(error.message || "Failed to generate report");
  }

  return response.blob();
}
