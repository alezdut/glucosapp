import { ConfigService } from "@nestjs/config";

/**
 * Creates a mock ConfigService for testing
 */
export const createMockConfigService = (
  config: Record<string, string | undefined> = {},
): Partial<ConfigService> => {
  const defaultConfig: Record<string, string> = {
    JWT_ACCESS_SECRET: "test-access-secret-at-least-32-characters-long",
    JWT_REFRESH_SECRET: "test-refresh-secret-at-least-32-characters-long",
    JWT_ACCESS_EXPIRATION: "15m",
    JWT_REFRESH_EXPIRATION: "7d",
    ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    FRONTEND_URL: "http://localhost:3001",
    SMTP_HOST: "smtp.test.com",
    SMTP_PORT: "587",
    SMTP_USER: "test@test.com",
    SMTP_PASS: "test-password",
    ...config,
  };

  return {
    get: jest.fn((key: string, defaultValue?: string) => {
      return defaultConfig[key] ?? defaultValue;
    }),
  } as unknown as ConfigService;
};
