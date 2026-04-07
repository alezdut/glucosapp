export type ApiClient = ReturnType<typeof makeApiClient>;

const DEFAULT_REQUEST_TIMEOUT_MS = 10000;

function createTimeoutSignal(timeoutMs: number, signal?: AbortSignal | null) {
  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort(new Error(`Request timed out after ${timeoutMs}ms`));
  }, timeoutMs);

  const abortFromCaller = () => {
    controller.abort(signal?.reason);
  };

  if (signal) {
    if (signal.aborted) {
      abortFromCaller();
    } else {
      signal.addEventListener("abort", abortFromCaller, { once: true });
    }
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeoutId);
      if (signal) {
        signal.removeEventListener("abort", abortFromCaller);
      }
    },
  };
}

async function fetchWithTimeout(
  input: string,
  init?: RequestInit,
  timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
) {
  const { signal, cleanup } = createTimeoutSignal(timeoutMs, init?.signal);

  try {
    return await fetch(input, {
      ...init,
      signal,
    });
  } finally {
    cleanup();
  }
}

/**
 * Creates an API client for the given baseUrl.
 */
export function makeApiClient(baseUrl: string) {
  const client = {
    async GET<T = any>(path: string, init?: RequestInit): Promise<{ data?: T; error?: any }> {
      try {
        const response = await fetchWithTimeout(`${baseUrl}${path}`, { ...init, method: "GET" });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const message = errorData.message || response.statusText;
          return { error: { status: response.status, message, ...errorData } };
        }
        // Handle 204 No Content - no body to parse
        if (response.status === 204) {
          return { data: undefined as T };
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
        const response = await fetchWithTimeout(`${baseUrl}${path}`, {
          ...init,
          method: "POST",
          headers: { "Content-Type": "application/json", ...init?.headers },
          body: body ? JSON.stringify(body) : undefined,
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const message = errorData.message || response.statusText;
          return { error: { status: response.status, message, ...errorData } };
        }
        // Handle 204 No Content - no body to parse
        if (response.status === 204) {
          return { data: undefined as T };
        }
        const data = await response.json();
        return { data };
      } catch (error) {
        return { error };
      }
    },
    async PATCH<T = any>(
      path: string,
      body?: any,
      init?: RequestInit,
    ): Promise<{ data?: T; error?: any }> {
      try {
        const response = await fetchWithTimeout(`${baseUrl}${path}`, {
          ...init,
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...init?.headers },
          body: body ? JSON.stringify(body) : undefined,
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const message = errorData.message || response.statusText;
          return { error: { status: response.status, message, ...errorData } };
        }
        // Handle 204 No Content - no body to parse
        if (response.status === 204) {
          return { data: undefined as T };
        }
        const data = await response.json();
        return { data };
      } catch (error) {
        return { error };
      }
    },
    async PUT<T = any>(
      path: string,
      body?: any,
      init?: RequestInit,
    ): Promise<{ data?: T; error?: any }> {
      try {
        const response = await fetchWithTimeout(`${baseUrl}${path}`, {
          ...init,
          method: "PUT",
          headers: { "Content-Type": "application/json", ...init?.headers },
          body: body ? JSON.stringify(body) : undefined,
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const message = errorData.message || response.statusText;
          return { error: { status: response.status, message, ...errorData } };
        }
        // Handle 204 No Content - no body to parse
        if (response.status === 204) {
          return { data: undefined as T };
        }
        const data = await response.json();
        return { data };
      } catch (error) {
        return { error };
      }
    },
    async DELETE<T = any>(path: string, init?: RequestInit): Promise<{ data?: T; error?: any }> {
      try {
        const response = await fetchWithTimeout(`${baseUrl}${path}`, {
          ...init,
          method: "DELETE",
          headers: { ...init?.headers },
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const message = errorData.message || response.statusText;
          return { error: { status: response.status, message, ...errorData } };
        }
        // Handle 204 No Content - no body to parse
        if (response.status === 204) {
          return { data: undefined as T };
        }
        const data = await response.json().catch(() => undefined);
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
