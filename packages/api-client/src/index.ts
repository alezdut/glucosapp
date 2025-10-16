export type ApiClient = ReturnType<typeof makeApiClient>;

/**
 * Creates an API client for the given baseUrl.
 */
export function makeApiClient(baseUrl: string) {
  const client = {
    async GET<T = any>(path: string, init?: RequestInit): Promise<{ data?: T; error?: any }> {
      try {
        const response = await fetch(`${baseUrl}${path}`, { ...init, method: "GET" });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const message = errorData.message || response.statusText;
          return { error: { status: response.status, message } };
        }
        const data = await response.json();
        return { data };
      } catch (error) {
        return { error };
      }
    },
    async POST<T = any>(
      path: string,
      body?: any,
      init?: RequestInit,
    ): Promise<{ data?: T; error?: any }> {
      try {
        const response = await fetch(`${baseUrl}${path}`, {
          ...init,
          method: "POST",
          headers: { "Content-Type": "application/json", ...init?.headers },
          body: body ? JSON.stringify(body) : undefined,
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const message = errorData.message || response.statusText;
          return { error: { status: response.status, message } };
        }
        const data = await response.json();
        return { data };
      } catch (error) {
        return { error };
      }
    },
  };
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
