import { UserRole } from "@prisma/client";
import { UserResponseDto } from "../../modules/auth/dto/auth-response.dto";

/**
 * Test fixtures for creating mock data
 */

export const createMockUser = (overrides?: Partial<any>): any => {
  return {
    id: "user-123",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
    password: "$2b$10$hashedpassword",
    role: UserRole.PATIENT,
    emailVerified: true,
    avatarUrl: null,
    verificationToken: null,
    verificationTokenExpiry: null,
    resetPasswordToken: null,
    resetPasswordExpiry: null,
    createdAt: new Date("2024-01-01"),
    ...overrides,
  };
};

export const createMockUserResponse = (overrides?: Partial<UserResponseDto>): UserResponseDto => {
  return {
    id: "user-123",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
    emailVerified: true,
    createdAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
};

export const createMockRefreshToken = (overrides?: Partial<any>): any => {
  return {
    id: "token-123",
    userId: "user-123",
    token: "$2b$10$hashedtoken",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    createdAt: new Date("2024-01-01"),
    ...overrides,
  };
};

export const createMockGlucoseEntry = (overrides?: Partial<any>): any => {
  return {
    id: "glucose-123",
    userId: "user-123",
    mgdlEncrypted: "encrypted-value",
    note: "Test note",
    recordedAt: new Date("2024-01-01T12:00:00.000Z"),
    createdAt: new Date("2024-01-01T12:00:00.000Z"),
    ...overrides,
  };
};

export const createMockAccount = (overrides?: Partial<any>): any => {
  return {
    id: "account-123",
    provider: "google",
    providerId: "google-123",
    userId: "user-123",
    createdAt: new Date("2024-01-01"),
    user: createMockUser(),
    ...overrides,
  };
};
