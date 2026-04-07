export type ApiClient = ReturnType<typeof makeApiClient>;

export type ApiClientError = {
  status?: number;
  message?: string;
} & Record<string, unknown>;

type ApiResult<T> = {
  data?: T;
  error?: ApiClientError;
};

type RequestBody = BodyInit | object | null | undefined;

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

async function readErrorPayload(response: Response): Promise<ApiClientError> {
  const errorData = (await response.json().catch(() => ({}))) as ApiClientError;
  return {
    status: response.status,
    message: errorData.message ?? response.statusText,
    ...errorData,
  };
}

/**
 * Creates an API client for the given baseUrl.
 */
export function makeApiClient(baseUrl: string) {
  const client = {
    async GET<T = unknown>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
      try {
        const response = await fetchWithTimeout(`${baseUrl}${path}`, { ...init, method: "GET" });
        if (!response.ok) {
          return { error: await readErrorPayload(response) };
        }
        // Handle 204 No Content - no body to parse
        if (response.status === 204) {
          return { data: undefined as T };
        }
        const data = await response.json();
        return { data };
      } catch (error) {
        return { error: { message: error instanceof Error ? error.message : "Request failed" } };
      }
    },
    async POST<T = unknown>(
      path: string,
      body?: RequestBody,
      init?: RequestInit,
    ): Promise<ApiResult<T>> {
      try {
        const response = await fetchWithTimeout(`${baseUrl}${path}`, {
          ...init,
          method: "POST",
          headers: { "Content-Type": "application/json", ...init?.headers },
          body:
            body == null || typeof body === "string" || body instanceof FormData
              ? body
              : JSON.stringify(body),
        });
        if (!response.ok) {
          return { error: await readErrorPayload(response) };
        }
        // Handle 204 No Content - no body to parse
        if (response.status === 204) {
          return { data: undefined as T };
        }
        const data = await response.json();
        return { data };
      } catch (error) {
        return { error: { message: error instanceof Error ? error.message : "Request failed" } };
      }
    },
    async PATCH<T = unknown>(
      path: string,
      body?: RequestBody,
      init?: RequestInit,
    ): Promise<ApiResult<T>> {
      try {
        const response = await fetchWithTimeout(`${baseUrl}${path}`, {
          ...init,
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...init?.headers },
          body:
            body == null || typeof body === "string" || body instanceof FormData
              ? body
              : JSON.stringify(body),
        });
        if (!response.ok) {
          return { error: await readErrorPayload(response) };
        }
        // Handle 204 No Content - no body to parse
        if (response.status === 204) {
          return { data: undefined as T };
        }
        const data = await response.json();
        return { data };
      } catch (error) {
        return { error: { message: error instanceof Error ? error.message : "Request failed" } };
      }
    },
    async PUT<T = unknown>(
      path: string,
      body?: RequestBody,
      init?: RequestInit,
    ): Promise<ApiResult<T>> {
      try {
        const response = await fetchWithTimeout(`${baseUrl}${path}`, {
          ...init,
          method: "PUT",
          headers: { "Content-Type": "application/json", ...init?.headers },
          body:
            body == null || typeof body === "string" || body instanceof FormData
              ? body
              : JSON.stringify(body),
        });
        if (!response.ok) {
          return { error: await readErrorPayload(response) };
        }
        // Handle 204 No Content - no body to parse
        if (response.status === 204) {
          return { data: undefined as T };
        }
        const data = await response.json();
        return { data };
      } catch (error) {
        return { error: { message: error instanceof Error ? error.message : "Request failed" } };
      }
    },
    async DELETE<T = unknown>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
      try {
        const response = await fetchWithTimeout(`${baseUrl}${path}`, {
          ...init,
          method: "DELETE",
          headers: { ...init?.headers },
        });
        if (!response.ok) {
          return { error: await readErrorPayload(response) };
        }
        // Handle 204 No Content - no body to parse
        if (response.status === 204) {
          return { data: undefined as T };
        }
        const data = await response.json().catch(() => undefined);
        return { data };
      } catch (error) {
        return { error: { message: error instanceof Error ? error.message : "Request failed" } };
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
  } as unknown as Blob);

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

  return (await response.json()) as AnalyzeResponse;
}
