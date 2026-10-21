import {
  hasStatus,
  hasMessage,
  isApiError,
  isHttpError,
  isAuthError,
  isNotFoundError,
  isValidationError,
  isServerError,
  getErrorMessage,
  getErrorStatus,
  parseApiError,
  getUserFriendlyMessage,
  throwApiError,
  type ApiError,
} from "./error-utils";

describe("error-utils", () => {
  describe("type guards", () => {
    describe("hasStatus", () => {
      it("should return true for object with numeric status", () => {
        expect(hasStatus({ status: 404 })).toBe(true);
        expect(hasStatus({ status: 200, message: "OK" })).toBe(true);
      });

      it("should return false for non-objects or missing status", () => {
        expect(hasStatus(null)).toBe(false);
        expect(hasStatus(undefined)).toBe(false);
        expect(hasStatus("error")).toBe(false);
        expect(hasStatus({ message: "error" })).toBe(false);
        expect(hasStatus({ status: "error" })).toBe(false);
      });
    });

    describe("hasMessage", () => {
      it("should return true for object with string message", () => {
        expect(hasMessage({ message: "Error occurred" })).toBe(true);
        expect(hasMessage({ message: "", status: 400 })).toBe(true);
      });

      it("should return false for non-objects or missing message", () => {
        expect(hasMessage(null)).toBe(false);
        expect(hasMessage(undefined)).toBe(false);
        expect(hasMessage("error")).toBe(false);
        expect(hasMessage({ status: 404 })).toBe(false);
        expect(hasMessage({ message: 123 })).toBe(false);
      });
    });

    describe("isApiError", () => {
      it("should return true for objects with message", () => {
        expect(isApiError({ message: "Error" })).toBe(true);
        expect(isApiError({ message: "Error", status: 400 })).toBe(true);
      });

      it("should return false for invalid errors", () => {
        expect(isApiError(null)).toBe(false);
        expect(isApiError({ status: 404 })).toBe(false);
      });
    });
  });

  describe("HTTP error checks", () => {
    describe("isHttpError", () => {
      it("should match specific status codes", () => {
        expect(isHttpError({ status: 404 }, 404)).toBe(true);
        expect(isHttpError({ status: 401 }, 401)).toBe(true);
        expect(isHttpError({ status: 500 }, 500)).toBe(true);
      });

      it("should return false for non-matching status", () => {
        expect(isHttpError({ status: 404 }, 401)).toBe(false);
        expect(isHttpError({ message: "error" }, 404)).toBe(false);
        expect(isHttpError(null, 404)).toBe(false);
      });
    });

    describe("isAuthError", () => {
      it("should return true for 401 and 403", () => {
        expect(isAuthError({ status: 401 })).toBe(true);
        expect(isAuthError({ status: 403 })).toBe(true);
      });

      it("should return false for other errors", () => {
        expect(isAuthError({ status: 404 })).toBe(false);
        expect(isAuthError({ status: 500 })).toBe(false);
        expect(isAuthError({ message: "error" })).toBe(false);
      });
    });

    describe("isNotFoundError", () => {
      it("should return true for 404", () => {
        expect(isNotFoundError({ status: 404 })).toBe(true);
      });

      it("should return false for other status codes", () => {
        expect(isNotFoundError({ status: 401 })).toBe(false);
        expect(isNotFoundError({ status: 500 })).toBe(false);
      });
    });

    describe("isValidationError", () => {
      it("should return true for 400", () => {
        expect(isValidationError({ status: 400 })).toBe(true);
      });

      it("should return false for other status codes", () => {
        expect(isValidationError({ status: 404 })).toBe(false);
        expect(isValidationError({ status: 422 })).toBe(false);
      });
    });

    describe("isServerError", () => {
      it("should return true for 5xx status codes", () => {
        expect(isServerError({ status: 500 })).toBe(true);
        expect(isServerError({ status: 502 })).toBe(true);
        expect(isServerError({ status: 503 })).toBe(true);
        expect(isServerError({ status: 599 })).toBe(true);
      });

      it("should return false for non-5xx codes", () => {
        expect(isServerError({ status: 400 })).toBe(false);
        expect(isServerError({ status: 404 })).toBe(false);
        expect(isServerError({ status: 600 })).toBe(false);
      });
    });
  });

  describe("getErrorMessage", () => {
    it("should extract message from ApiError", () => {
      expect(getErrorMessage({ message: "API error", status: 400 })).toBe("API error");
    });

    it("should extract message from Error instance", () => {
      expect(getErrorMessage(new Error("Error instance"))).toBe("Error instance");
    });

    it("should handle string errors", () => {
      expect(getErrorMessage("String error")).toBe("String error");
    });

    it("should use default message for unknown errors", () => {
      expect(getErrorMessage(null)).toBe("An error occurred");
      expect(getErrorMessage(undefined)).toBe("An error occurred");
      expect(getErrorMessage({})).toBe("An error occurred");
      expect(getErrorMessage(123)).toBe("An error occurred");
    });

    it("should use custom default message", () => {
      expect(getErrorMessage(null, "Custom default")).toBe("Custom default");
      expect(getErrorMessage(undefined, "Failed")).toBe("Failed");
    });
  });

  describe("getErrorStatus", () => {
    it("should extract status from error", () => {
      expect(getErrorStatus({ status: 404 })).toBe(404);
      expect(getErrorStatus({ status: 500, message: "Server error" })).toBe(500);
    });

    it("should return undefined for errors without status", () => {
      expect(getErrorStatus({ message: "Error" })).toBeUndefined();
      expect(getErrorStatus(new Error("Error"))).toBeUndefined();
      expect(getErrorStatus(null)).toBeUndefined();
    });
  });

  describe("parseApiError", () => {
    it("should normalize ApiError with all fields", () => {
      const error = { message: "Not found", status: 404 };
      const result = parseApiError(error);

      expect(result).toEqual({
        message: "Not found",
        status: 404,
      });
    });

    it("should normalize Error instance", () => {
      const error = new Error("Something went wrong");
      const result = parseApiError(error);

      expect(result.message).toBe("Something went wrong");
      expect(result.status).toBeUndefined();
    });

    it("should normalize string errors", () => {
      const result = parseApiError("String error");

      expect(result.message).toBe("String error");
      expect(result.status).toBeUndefined();
    });

    it("should use default message for unknown errors", () => {
      expect(parseApiError(null).message).toBe("Request failed");
      expect(parseApiError(undefined, "Custom").message).toBe("Custom");
    });

    it("should preserve additional error details", () => {
      const error = {
        message: "Validation failed",
        status: 400,
        code: "VALIDATION_ERROR",
        fields: ["email", "password"],
      };

      const result = parseApiError(error);

      expect(result.message).toBe("Validation failed");
      expect(result.status).toBe(400);
      expect(result.details).toEqual({
        code: "VALIDATION_ERROR",
        fields: ["email", "password"],
      });
    });

    it("should handle errors with only status", () => {
      const error = { status: 500 };
      const result = parseApiError(error, "Server error");

      expect(result.message).toBe("Server error");
      expect(result.status).toBe(500);
    });
  });

  describe("getUserFriendlyMessage", () => {
    it("should provide friendly message for common status codes", () => {
      expect(getUserFriendlyMessage({ status: 400 })).toContain("Invalid request");
      expect(getUserFriendlyMessage({ status: 401 })).toContain("log in");
      expect(getUserFriendlyMessage({ status: 403 })).toContain("permission");
      expect(getUserFriendlyMessage({ status: 404 })).toContain("not found");
      expect(getUserFriendlyMessage({ status: 409 })).toContain("conflicts");
      expect(getUserFriendlyMessage({ status: 429 })).toContain("Too many requests");
      expect(getUserFriendlyMessage({ status: 500 })).toContain("Server error");
    });

    it("should include context in message", () => {
      expect(getUserFriendlyMessage({ status: 401 }, "login")).toContain("Unable to login");
      expect(getUserFriendlyMessage({ status: 404 }, "fetch user")).toContain(
        "Unable to fetch user",
      );
    });

    it("should use API message if available", () => {
      const error = { status: 400, message: "Email already exists" };
      expect(getUserFriendlyMessage(error)).toContain("Email already exists");
    });

    it("should handle errors without status", () => {
      const message = getUserFriendlyMessage(new Error("Network error"));
      expect(message).toContain("Network error");
    });

    it("should provide fallback for unknown errors", () => {
      const message = getUserFriendlyMessage({});
      expect(message).toContain("unexpected error");
    });
  });

  describe("throwApiError", () => {
    it("should throw error with message from ApiError", () => {
      const error: ApiError = { message: "Login failed", status: 401 };

      expect(() => throwApiError(error)).toThrow("Login failed");
    });

    it("should throw error with default message", () => {
      expect(() => throwApiError(null, "Default error")).toThrow("Default error");
    });

    it("should throw error with extracted message from Error instance", () => {
      expect(() => throwApiError(new Error("Network error"))).toThrow("Network error");
    });

    it('should use "Request failed" as ultimate fallback', () => {
      expect(() => throwApiError({})).toThrow("Request failed");
    });
  });

  describe("integration scenarios", () => {
    it("should handle typical API 401 error", () => {
      const error = { status: 401, message: "Invalid token" };

      expect(isAuthError(error)).toBe(true);
      expect(isHttpError(error, 401)).toBe(true);
      expect(getErrorMessage(error)).toBe("Invalid token");
      expect(getUserFriendlyMessage(error, "access resource")).toContain(
        "Unable to access resource",
      );
    });

    it("should handle network Error instance", () => {
      const error = new Error("Network request failed");

      expect(isAuthError(error)).toBe(false);
      expect(getErrorMessage(error)).toBe("Network request failed");

      const parsed = parseApiError(error, "Request failed");
      expect(parsed.message).toBe("Network request failed");
      expect(parsed.status).toBeUndefined();
    });

    it("should handle validation error with details", () => {
      const error = {
        status: 400,
        message: "Validation failed",
        errors: [{ field: "email", message: "Invalid email" }],
      };

      expect(isValidationError(error)).toBe(true);
      expect(getErrorStatus(error)).toBe(400);

      const parsed = parseApiError(error);
      expect(parsed.message).toBe("Validation failed");
      expect(parsed.details).toHaveProperty("errors");
    });

    it("should handle server error", () => {
      const error = { status: 503, message: "Service unavailable" };

      expect(isServerError(error)).toBe(true);
      expect(getUserFriendlyMessage(error)).toContain("Server error");
    });
  });
});
