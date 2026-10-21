import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  ValidationPipe,
  VersioningType,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { UserRole } from "@prisma/client";
import { GlucoseUnit, Language, Theme } from "@glucosapp/types";
import { EventEmitter } from "events";
import { createRequest, createResponse } from "node-mocks-http";
import { createMockPrismaService } from "../../common/test-helpers";
import { createMockUserResponse } from "../../common/test-helpers/fixtures";
import { PrismaService } from "../../prisma/prisma.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ProfileModule } from "./profile.module";

class AuthenticatedTestGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    request.user = createMockUserResponse({
      firstName: undefined,
      lastName: undefined,
      role: UserRole.PATIENT,
    });
    return true;
  }
}

describe("ProfileController integration", () => {
  let app: INestApplication;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let prismaUser: NonNullable<ReturnType<typeof createMockPrismaService>["user"]>;

  beforeAll(async () => {
    prisma = createMockPrismaService();
    prismaUser = prisma.user!;

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [ProfileModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideGuard(JwtAuthGuard)
      .useClass(AuthenticatedTestGuard)
      .compile();

    app = moduleRef.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it("updates firstName and lastName through PATCH /v1/profile", async () => {
    (prismaUser.update as jest.Mock).mockResolvedValue(
      createPersistedProfile({
        firstName: "Ana",
        lastName: "Paz",
        weight: 75,
      }),
    );

    const response = await sendJsonRequest(app, "PATCH", "/v1/profile", {
      firstName: " Ana ",
      lastName: " Paz ",
      weight: 75,
    });

    expect(response.statusCode).toBe(200);
    expect(prismaUser.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-123" },
        data: expect.objectContaining({
          firstName: "Ana",
          lastName: "Paz",
          weight: 75,
        }),
      }),
    );
    expect(response.body).toEqual(
      expect.objectContaining({
        id: "user-123",
        firstName: "Ana",
        lastName: "Paz",
        weight: 75,
      }),
    );
  });

  it("rejects invalid profile payloads before reaching the service", async () => {
    const response = await sendJsonRequest(app, "PATCH", "/v1/profile", {
      firstName: "   ",
    });

    expect(response.statusCode).toBe(400);
    expect(prismaUser.update).not.toHaveBeenCalled();
    expect(response.body.message).toContain(
      "firstName must be longer than or equal to 1 characters",
    );
  });
});

function createPersistedProfile(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "user-123",
    email: "test@example.com",
    role: UserRole.PATIENT,
    firstName: "Test",
    lastName: "User",
    avatarUrl: null,
    emailVerified: true,
    birthDate: null,
    weight: null,
    diabetesType: null,
    glucoseUnit: GlucoseUnit.MG_DL,
    theme: Theme.LIGHT,
    language: Language.ES,
    icRatioBreakfast: 12,
    icRatioLunch: 14,
    icRatioDinner: 16,
    insulinSensitivityFactor: 45,
    diaHours: 4,
    targetGlucose: 110,
    minTargetGlucose: 80,
    maxTargetGlucose: 140,
    mealTimeBreakfastStart: null,
    mealTimeBreakfastEnd: null,
    mealTimeLunchStart: null,
    mealTimeLunchEnd: null,
    mealTimeDinnerStart: null,
    mealTimeDinnerEnd: null,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

async function sendJsonRequest(
  app: INestApplication,
  method: "DELETE" | "GET" | "PATCH" | "POST" | "PUT",
  url: string,
  body?: Record<string, unknown>,
) {
  const expressApp = app.getHttpAdapter().getInstance();
  const request = createRequest({
    method,
    url,
    originalUrl: url,
    headers: {
      "content-type": "application/json",
    },
    body,
  });
  const response = createResponse({ eventEmitter: EventEmitter });

  await new Promise<void>((resolve, reject) => {
    response.on("end", () => resolve());
    response.on("finish", () => resolve());
    response.on("error", reject);

    try {
      expressApp.handle(request, response);
    } catch (error) {
      reject(error);
    }
  });

  return {
    statusCode: response.statusCode,
    body: response._isJSON() ? response._getJSONData() : response._getData(),
  };
}
