import { makeApiClient } from "@glucosapp/api-client";
import type { DiabetesType, GlucoseUnit, Language, Theme, UserProfile } from "@glucosapp/types";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";
const { client } = makeApiClient(`${apiBaseUrl}/v1`);

export type UpdateProfilePayload = {
  birthDate?: string; // ISO date string
  weight?: number;
  diabetesType?: DiabetesType;
  glucoseUnit?: GlucoseUnit;
  theme?: Theme;
  language?: Language;
  icRatioBreakfast?: number;
  icRatioLunch?: number;
  icRatioDinner?: number;
  insulinSensitivityFactor?: number;
  diaHours?: number;
  targetGlucose?: number;
  minTargetGlucose?: number;
  maxTargetGlucose?: number;
  mealTimeBreakfastStart?: number; // minutes from midnight (0-1439)
  mealTimeBreakfastEnd?: number; // minutes from midnight (0-1439)
  mealTimeLunchStart?: number; // minutes from midnight (0-1439)
  mealTimeLunchEnd?: number; // minutes from midnight (0-1439)
  mealTimeDinnerStart?: number; // minutes from midnight (0-1439)
  mealTimeDinnerEnd?: number; // minutes from midnight (0-1439)
};

export async function updateProfile(
  accessToken: string,
  payload: UpdateProfilePayload,
): Promise<UserProfile> {
  const response = await client.PATCH<UserProfile>("/profile", payload, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.error) {
    throw new Error(response.error.message || "No se pudo actualizar el perfil");
  }

  if (!response.data) {
    throw new Error("La API no devolvió información del perfil actualizada");
  }

  return response.data;
}
