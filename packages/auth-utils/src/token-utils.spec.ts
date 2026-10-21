import {
  getTokenExpiration,
  isTokenExpiringSoon,
  isTokenExpired,
  getTimeUntilExpiration,
} from "./token-utils";

describe("token-utils", () => {
  // Helper to create a JWT token with specific expiration
  const createToken = (expirationSeconds: number): string => {
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const payload = btoa(
      JSON.stringify({
        sub: "user-123",
        iat: Math.floor(Date.now() / 1000),
        exp: expirationSeconds,
      }),
    );
    const signature = "fake-signature";
    return `${header}.${payload}.${signature}`;
  };

  describe("getTokenExpiration", () => {
    it("should return expiration timestamp in milliseconds", () => {
      const expSeconds = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const token = createToken(expSeconds);

      const result = getTokenExpiration(token);

      expect(result).toBe(expSeconds * 1000);
    });

    it("should return null for invalid token format", () => {
      expect(getTokenExpiration("invalid-token")).toBeNull();
      expect(getTokenExpiration("invalid.token")).toBeNull();
      expect(getTokenExpiration("")).toBeNull();
    });

    it("should return null for malformed base64", () => {
      expect(getTokenExpiration("header.!!!invalid-base64!!!.signature")).toBeNull();
    });

    it("should return null for token without exp claim", () => {
      const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
      const payload = btoa(JSON.stringify({ sub: "user-123", iat: 1234567890 }));
      const token = `${header}.${payload}.signature`;

      expect(getTokenExpiration(token)).toBeNull();
    });

    it("should handle tokens with extra claims", () => {
      const expSeconds = Math.floor(Date.now() / 1000) + 3600;
      const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
      const payload = btoa(
        JSON.stringify({
          sub: "user-123",
          exp: expSeconds,
          role: "admin",
          email: "test@example.com",
        }),
      );
      const token = `${header}.${payload}.signature`;

      const result = getTokenExpiration(token);
      expect(result).toBe(expSeconds * 1000);
    });
  });

  describe("isTokenExpiringSoon", () => {
    it("should return true if token expires in less than 1 minute (default)", () => {
      const expSeconds = Math.floor(Date.now() / 1000) + 30; // 30 seconds from now
      const token = createToken(expSeconds);

      expect(isTokenExpiringSoon(token)).toBe(true);
    });

    it("should return false if token expires in more than 1 minute (default)", () => {
      const expSeconds = Math.floor(Date.now() / 1000) + 120; // 2 minutes from now
      const token = createToken(expSeconds);

      expect(isTokenExpiringSoon(token)).toBe(false);
    });

    it("should return true if token is already expired", () => {
      const expSeconds = Math.floor(Date.now() / 1000) - 60; // 1 minute ago
      const token = createToken(expSeconds);

      expect(isTokenExpiringSoon(token)).toBe(true);
    });

    it("should respect custom threshold in minutes", () => {
      const expSeconds = Math.floor(Date.now() / 1000) + 180; // 3 minutes from now
      const token = createToken(expSeconds);

      expect(isTokenExpiringSoon(token, 5)).toBe(true); // Within 5 minutes
      expect(isTokenExpiringSoon(token, 2)).toBe(false); // Not within 2 minutes
    });

    it("should return true for invalid tokens", () => {
      expect(isTokenExpiringSoon("invalid-token")).toBe(true);
      expect(isTokenExpiringSoon("")).toBe(true);
    });

    it("should handle edge case: exactly at threshold", () => {
      const expSeconds = Math.floor(Date.now() / 1000) + 61; // Just over 1 minute from now
      const token = createToken(expSeconds);

      // Should return false because timeUntilExpiry >= threshold
      // 61 seconds is greater than 60 seconds (1 minute threshold)
      expect(isTokenExpiringSoon(token, 1)).toBe(false);
    });
  });

  describe("isTokenExpired", () => {
    it("should return false if token is still valid", () => {
      const expSeconds = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const token = createToken(expSeconds);

      expect(isTokenExpired(token)).toBe(false);
    });

    it("should return true if token is expired", () => {
      const expSeconds = Math.floor(Date.now() / 1000) - 60; // 1 minute ago
      const token = createToken(expSeconds);

      expect(isTokenExpired(token)).toBe(true);
    });

    it("should return true for invalid tokens", () => {
      expect(isTokenExpired("invalid-token")).toBe(true);
    });

    it("should handle edge case: exactly at expiration", () => {
      const expSeconds = Math.floor(Date.now() / 1000); // Right now
      const token = createToken(expSeconds);

      // Should return true because Date.now() >= expiration
      expect(isTokenExpired(token)).toBe(true);
    });
  });

  describe("getTimeUntilExpiration", () => {
    it("should return milliseconds until expiration", () => {
      const expSeconds = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const token = createToken(expSeconds);

      const result = getTimeUntilExpiration(token);

      expect(result).not.toBeNull();
      expect(result).toBeGreaterThan(3590 * 1000); // ~59.8 minutes
      expect(result).toBeLessThanOrEqual(3600 * 1000); // 60 minutes
    });

    it("should return 0 for expired tokens", () => {
      const expSeconds = Math.floor(Date.now() / 1000) - 60; // 1 minute ago
      const token = createToken(expSeconds);

      expect(getTimeUntilExpiration(token)).toBe(0);
    });

    it("should return null for invalid tokens", () => {
      expect(getTimeUntilExpiration("invalid-token")).toBeNull();
      expect(getTimeUntilExpiration("")).toBeNull();
    });

    it("should handle tokens expiring very soon", () => {
      const expSeconds = Math.floor(Date.now() / 1000) + 5; // 5 seconds from now
      const token = createToken(expSeconds);

      const result = getTimeUntilExpiration(token);

      expect(result).not.toBeNull();
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(5000);
    });
  });

  describe("integration scenarios", () => {
    it("should work together for token refresh flow", () => {
      // Scenario: Token expires in 45 seconds
      const expSeconds = Math.floor(Date.now() / 1000) + 45;
      const token = createToken(expSeconds);

      // Token is not expired yet
      expect(isTokenExpired(token)).toBe(false);

      // But it's expiring soon (within 1 minute)
      expect(isTokenExpiringSoon(token)).toBe(true);

      // Time remaining is approximately 45 seconds
      const remaining = getTimeUntilExpiration(token);
      expect(remaining).not.toBeNull();
      expect(remaining).toBeGreaterThan(40 * 1000);
      expect(remaining).toBeLessThanOrEqual(45 * 1000);
    });

    it("should handle fully expired token", () => {
      const expSeconds = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const token = createToken(expSeconds);

      expect(isTokenExpired(token)).toBe(true);
      expect(isTokenExpiringSoon(token)).toBe(true);
      expect(getTimeUntilExpiration(token)).toBe(0);
      expect(getTokenExpiration(token)).toBeLessThan(Date.now());
    });

    it("should handle fresh token", () => {
      const expSeconds = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now
      const token = createToken(expSeconds);

      expect(isTokenExpired(token)).toBe(false);
      expect(isTokenExpiringSoon(token)).toBe(false);
      expect(isTokenExpiringSoon(token, 60)).toBe(false); // Even with 60 minute threshold

      const remaining = getTimeUntilExpiration(token);
      expect(remaining).not.toBeNull();
      expect(remaining).toBeGreaterThan(86390 * 1000); // ~23.99 hours
    });
  });
});
