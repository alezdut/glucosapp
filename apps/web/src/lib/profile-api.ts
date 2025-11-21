import { makeApiClient } from "@glucosapp/api-client";
import type { GlucoseUnit, Language, UserProfile } from "@glucosapp/types";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";
const { client } = makeApiClient(`${apiBaseUrl}/v1`);

export type UpdateProfilePayload = {
  glucoseUnit?: GlucoseUnit;
  language?: Language;
  weight?: number;
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
