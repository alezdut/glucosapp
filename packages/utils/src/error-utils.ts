/**
 * Error Handling Utilities
 * Shared utilities for consistent error handling across web and mobile apps
 */

/**
 * Standard API error structure
 */
export interface ApiError {
  status?: number;
  message: string;
  code?: string;
  details?: unknown;
}

/**
 * Type guard to check if error is an object
 */
function isObject(error: unknown): error is Record<string, unknown> {
  return typeof error === "object" && error !== null;
}

/**
 * Type guard to check if error has a status property
 */
export function hasStatus(error: unknown): error is { status: number } {
  return isObject(error) && typeof error.status === "number";
}

/**
 * Type guard to check if error has a message property
 */
export function hasMessage(error: unknown): error is { message: string } {
  return isObject(error) && typeof error.message === "string";
}

/**
 * Type guard to check if error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return hasMessage(error);
}

/**
 * Check if error is an HTTP error with specific status code
 *
 * @param error - Error to check
 * @param status - HTTP status code to match
 * @returns true if error has matching status code
 *
 * @example
 * if (isHttpError(error, 401)) {
 *   console.log('Unauthorized error');
 * }
 */
export function isHttpError(error: unknown, status: number): boolean {
  return hasStatus(error) && error.status === status;
}

/**
 * Check if error is an authentication error (401 or 403)
 *
 * @param error - Error to check
 * @returns true if error is 401 or 403
 *
 * @example
 * if (isAuthError(error)) {
 *   await refreshToken();
 * }
 */
export function isAuthError(error: unknown): boolean {
  return isHttpError(error, 401) || isHttpError(error, 403);
}

/**
 * Check if error is a not found error (404)
 */
export function isNotFoundError(error: unknown): boolean {
  return isHttpError(error, 404);
}

/**
 * Check if error is a validation error (400)
 */
export function isValidationError(error: unknown): boolean {
  return isHttpError(error, 400);
}

/**
 * Check if error is a server error (5xx)
 */
export function isServerError(error: unknown): boolean {
  return hasStatus(error) && error.status >= 500 && error.status < 600;
}

/**
 * Extract error message from various error types
 *
 * @param error - Error object (can be ApiError, Error, string, or unknown)
 * @param defaultMessage - Default message if no message can be extracted
 * @returns Error message string
 *
 * @example
 * const message = getErrorMessage(error, 'Something went wrong');
 * console.error(message);
 */
export function getErrorMessage(
  error: unknown,
  defaultMessage: string = "An error occurred",
): string {
  // Check for message property first (covers ApiError and Error)
  if (hasMessage(error)) {
    return error.message;
  }

  // Handle string errors
  if (typeof error === "string") {
    return error;
  }

  // Check if it's a standard Error object
  if (error instanceof Error) {
    return error.message;
  }

  // Return default message for unknown errors
  return defaultMessage;
}

/**
 * Get HTTP status code from error
 *
 * @param error - Error object
 * @returns Status code or undefined if not available
 *
 * @example
 * const status = getErrorStatus(error);
 * if (status === 429) {
 *   console.log('Rate limited');
 * }
 */
export function getErrorStatus(error: unknown): number | undefined {
  if (hasStatus(error)) {
    return error.status;
  }
  return undefined;
}

/**
 * Parse API response error and normalize to ApiError format
 *
 * @param error - Raw error from API response
 * @param defaultMessage - Default message if parsing fails
 * @returns Normalized ApiError object
 *
 * @example
 * const apiError = parseApiError(response.error, 'Failed to fetch data');
 * console.error(apiError.message);
 * if (apiError.status === 401) {
 *   // Handle unauthorized
 * }
 */
export function parseApiError(error: unknown, defaultMessage: string = "Request failed"): ApiError {
  // If already an ApiError with all required fields, return as-is
  if (isApiError(error) && hasStatus(error)) {
    return error as ApiError;
  }

  // Extract what we can from the error
  const message = getErrorMessage(error, defaultMessage);
  const status = getErrorStatus(error);

  // Build normalized error object
  const apiError: ApiError = {
    message,
    ...(status !== undefined && { status }),
  };

  // Preserve any additional error details
  if (isObject(error)) {
    const { message: _, status: __, ...rest } = error as Record<string, unknown>;
    if (Object.keys(rest).length > 0) {
      apiError.details = rest;
    }
  }

  return apiError;
}

/**
 * Create a user-friendly error message from API error
 * Provides better messages for common HTTP status codes
 *
 * @param error - Error object
 * @param context - Context description (e.g., "login", "fetch user")
 * @returns User-friendly error message
 *
 * @example
 * const message = getUserFriendlyMessage(error, 'login');
 * alert(message); // "Unable to login. Please check your credentials."
 */
export function getUserFriendlyMessage(error: unknown, context?: string): string {
  const apiError = parseApiError(error);
  const status = apiError.status;

  // Map common status codes to user-friendly messages
  const contextPrefix = context ? `Unable to ${context}. ` : "";

  if (status === 400) {
    return `${contextPrefix}Invalid request. Please check your input.`;
  }
  if (status === 401) {
    return `${contextPrefix}Please log in to continue.`;
  }
  if (status === 403) {
    return `${contextPrefix}You don't have permission to perform this action.`;
  }
  if (status === 404) {
    return `${contextPrefix}The requested resource was not found.`;
  }
  if (status === 409) {
    return `${contextPrefix}This action conflicts with existing data.`;
  }
  if (status === 429) {
    return `${contextPrefix}Too many requests. Please try again later.`;
  }
  if (status && status >= 500) {
    return `${contextPrefix}Server error. Please try again later.`;
  }

  // If we have a message from the API, use it
  if (
    apiError.message &&
    apiError.message !== "Request failed" &&
    apiError.message !== "An error occurred"
  ) {
    return contextPrefix + apiError.message;
  }

  // Fallback
  return context
    ? `${contextPrefix}Please try again.`
    : "An unexpected error occurred. Please try again.";
}

/**
 * Throw an error with normalized message
 * Useful for API functions that need to throw on error responses
 *
 * @param error - Error from API response
 * @param defaultMessage - Default message if parsing fails
 * @throws Error with normalized message
 *
 * @example
 * if (response.error) {
 *   throwApiError(response.error, 'Failed to login');
 * }
 */
export function throwApiError(error: unknown, defaultMessage: string = "Request failed"): never {
  const apiError = parseApiError(error, defaultMessage);
  throw new Error(apiError.message);
}
