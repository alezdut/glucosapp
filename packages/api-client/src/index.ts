import createClient from "openapi-fetch";

export type ApiClient = ReturnType<typeof makeApiClient>;

/**
 * Creates an OpenAPI client for the given baseUrl.
 */
export function makeApiClient(baseUrl: string) {
  const client = createClient({ baseUrl });
  return { client };
}

/**
 * Analyze image response type
 */
export interface AnalyzeResponse {
  label: string;
  confidence: number;
  carbs_per_100g?: number;
  nutrition_source?: string;
  name?: string;
  brand?: string;
  barcode?: string;
  serving_quantity?: number;
  serving_unit?: string;
  serving_size?: string;
  fat_100g?: number;
  protein_100g?: number;
  fiber_100g?: number;
  energy_kcal_100g?: number;
}

/**
 * Analyze image function
 */
export async function analyzeImage(imageUri: string, baseUrl: string): Promise<AnalyzeResponse> {
  const formData = new FormData();
  formData.append("file", {
    uri: imageUri,
    type: "image/jpeg",
    name: "image.jpg",
  } as any);

  const response = await fetch(`${baseUrl}/analyze`, {
    method: "POST",
    body: formData,
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  if (!response.ok) {
    throw new Error(`Analysis failed: ${response.statusText}`);
  }

  return response.json();
}
