import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { InsulinCalculationService } from "./insulin-calculation.service";
import { createMockPrismaService } from "../../common/test-helpers/prisma.mock";
import { createMockConfigService } from "../../common/test-helpers/config.mock";
import { createMockUser } from "../../common/test-helpers/fixtures";
import { CalculateDoseDto } from "./dto/calculate-dose.dto";

// Mock the mdi-insulin-algorithm package
jest.mock("@glucosapp/mdi-insulin-algorithm", () => ({
  calculateDose: jest.fn(),
  calculateBreakfastDose: jest.fn(),
  calculateLunchDose: jest.fn(),
  calculateDinnerDose: jest.fn(),
  calculateCorrectionDose: jest.fn(),
  evaluatePreSleep: jest.fn(),
  calculateBetweenMealCorrection: jest.fn(),
  calculateIOB: jest.fn(),
  configure: jest.fn(),
}));

import {
  calculateDose,
  calculateBreakfastDose,
  calculateLunchDose,
  calculateDinnerDose,
  evaluatePreSleep,
  calculateIOB,
  configure,
} from "@glucosapp/mdi-insulin-algorithm";

describe("InsulinCalculationService", () => {
  let service: InsulinCalculationService;
  let prismaService: PrismaService;

  const userId = "user-123";

  beforeEach(async () => {
    const mockPrisma = createMockPrismaService();
    const mockConfig = createMockConfigService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InsulinCalculationService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: "ConfigService",
          useValue: mockConfig,
        },
      ],
    }).compile();

    service = module.get<InsulinCalculationService>(InsulinCalculationService);
    prismaService = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getRecentInjections", () => {
    it("should return recent injections", async () => {
      const doses = [
        {
          id: "dose-1",
          userId,
          units: 5,
          type: "BOLUS",
          recordedAt: new Date(),
        },
        {
          id: "dose-2",
          userId,
          units: 3,
          type: "BOLUS",
          recordedAt: new Date(),
        },
      ];

      (prismaService.insulinDose.findMany as jest.Mock).mockResolvedValue(doses);

      const result = await service.getRecentInjections(userId, 6);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        units: 5,
        timestamp: expect.any(Number),
      });
    });
  });

  describe("calculateMealDose", () => {
    it("should calculate breakfast dose", async () => {
      const user = createMockUser({
        id: userId,
        insulinSensitivityFactor: 50,
        icRatioBreakfast: 10,
        icRatioLunch: 12,
        icRatioDinner: 15,
        diaHours: 4,
        targetGlucose: 100,
        language: "es",
      });
      const dto: CalculateDoseDto = {
        mealType: "BREAKFAST",
        glucose: 120,
        carbohydrates: 50,
      };
      const mockResult = {
        units: 5,
        breakdown: {},
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(user);
      (prismaService.insulinDose.findMany as jest.Mock).mockResolvedValue([]);
      (calculateBreakfastDose as jest.Mock).mockReturnValue(mockResult);

      const result = await service.calculateMealDose(userId, dto);

      expect(result).toEqual(mockResult);
      expect(configure).toHaveBeenCalled();
      expect(calculateBreakfastDose).toHaveBeenCalled();
    });

    it("should calculate lunch dose", async () => {
      const user = createMockUser({
        id: userId,
        insulinSensitivityFactor: 50,
        icRatioBreakfast: 10,
        icRatioLunch: 12,
        icRatioDinner: 15,
        diaHours: 4,
        targetGlucose: 100,
        language: "es",
      });
      const dto: CalculateDoseDto = {
        mealType: "LUNCH",
        glucose: 120,
        carbohydrates: 50,
      };
      const mockResult = {
        units: 4.2,
        breakdown: {},
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(user);
      (prismaService.insulinDose.findMany as jest.Mock).mockResolvedValue([]);
      (calculateLunchDose as jest.Mock).mockReturnValue(mockResult);

      const result = await service.calculateMealDose(userId, dto);

      expect(result).toEqual(mockResult);
      expect(calculateLunchDose).toHaveBeenCalled();
    });

    it("should calculate dinner dose", async () => {
      const user = createMockUser({
        id: userId,
        insulinSensitivityFactor: 50,
        icRatioBreakfast: 10,
        icRatioLunch: 12,
        icRatioDinner: 15,
        diaHours: 4,
        targetGlucose: 100,
        language: "es",
      });
      const dto: CalculateDoseDto = {
        mealType: "DINNER",
        glucose: 120,
        carbohydrates: 50,
      };
      const mockResult = {
        units: 3.3,
        breakdown: {},
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(user);
      (prismaService.insulinDose.findMany as jest.Mock).mockResolvedValue([]);
      (calculateDinnerDose as jest.Mock).mockReturnValue(mockResult);

      const result = await service.calculateMealDose(userId, dto);

      expect(result).toEqual(mockResult);
      expect(calculateDinnerDose).toHaveBeenCalled();
    });

    it("should throw NotFoundException if user not found", async () => {
      const dto: CalculateDoseDto = {
        mealType: "BREAKFAST",
        glucose: 120,
        carbohydrates: 50,
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.calculateMealDose(userId, dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe("calculateCorrection", () => {
    it("should calculate correction dose", async () => {
      const user = createMockUser({
        id: userId,
        insulinSensitivityFactor: 50,
        icRatioBreakfast: 10,
        icRatioLunch: 12,
        icRatioDinner: 15,
        diaHours: 4,
        targetGlucose: 100,
        language: "es",
      });
      const dto: CalculateDoseDto = {
        glucose: 180,
        carbohydrates: 0,
      };
      const mockResult = {
        units: 1.6,
        breakdown: {},
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(user);
      (prismaService.insulinDose.findMany as jest.Mock).mockResolvedValue([]);
      (calculateDose as jest.Mock).mockReturnValue(mockResult);

      const result = await service.calculateCorrection(userId, dto);

      expect(result).toEqual(mockResult);
      expect(calculateDose).toHaveBeenCalled();
    });
  });

  describe("evaluateBeforeSleep", () => {
    it("should evaluate pre-sleep safety", async () => {
      const user = createMockUser({
        id: userId,
        insulinSensitivityFactor: 50,
        icRatioBreakfast: 10,
        icRatioLunch: 12,
        icRatioDinner: 15,
        diaHours: 4,
        targetGlucose: 100,
        language: "es",
      });
      const glucose = 120;
      const mockResult = {
        safe: true,
        recommendation: "Safe to sleep",
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(user);
      (prismaService.insulinDose.findMany as jest.Mock).mockResolvedValue([]);
      (evaluatePreSleep as jest.Mock).mockReturnValue(mockResult);

      const result = await service.evaluateBeforeSleep(userId, glucose);

      expect(result).toEqual(mockResult);
      expect(evaluatePreSleep).toHaveBeenCalled();
    });
  });

  describe("getCurrentIOB", () => {
    it("should calculate current IOB", async () => {
      const user = createMockUser({
        id: userId,
        diaHours: 4,
      });
      const mockIOB = 2.5;

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(user);
      (prismaService.insulinDose.findMany as jest.Mock).mockResolvedValue([]);
      (calculateIOB as jest.Mock).mockReturnValue(mockIOB);

      const result = await service.getCurrentIOB(userId);

      expect(result).toBe(mockIOB);
      expect(calculateIOB).toHaveBeenCalled();
    });
  });
});
