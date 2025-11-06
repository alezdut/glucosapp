import { makeApiClient } from "@glucosapp/api-client";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";
const { client } = makeApiClient(`${apiBaseUrl}/v1`);

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
  status: "Riesgo" | "Estable" | "Activo" | "Inactivo";
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
  status: "Riesgo" | "Estable" | "Activo" | "Inactivo";
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
