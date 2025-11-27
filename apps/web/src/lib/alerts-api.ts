import { makeApiClient } from "@glucosapp/api-client";
import type { AlertSettings, UpdateAlertSettingsPayload } from "@glucosapp/types";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";
const { client } = makeApiClient(`${apiBaseUrl}/v1`);

/**
 * Get alert settings for doctor's patients (doctors only)
 */
export async function getAlertSettings(accessToken: string): Promise<AlertSettings> {
  const response = await client.GET<AlertSettings>("/alerts/settings", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.error) {
    throw new Error(response.error.message || "No se pudieron obtener la configuración de alertas");
  }

  if (!response.data) {
    throw new Error("La API no devolvió la configuración de alertas");
  }

  return response.data;
}

/**
 * Update alert settings for all doctor's patients (doctors only)
 */
export async function updateAlertSettings(
  accessToken: string,
  payload: UpdateAlertSettingsPayload,
): Promise<AlertSettings> {
  const response = await client.PATCH<AlertSettings>("/alerts/settings", payload, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.error) {
    throw new Error(response.error.message || "No se pudo actualizar la configuración de alertas");
  }

  if (!response.data) {
    throw new Error("La API no devolvió la configuración de alertas actualizada");
  }

  return response.data;
}
