import { Test, TestingModule } from "@nestjs/testing";
import { InsulinCalculationController } from "./insulin-calculation.controller";
import { InsulinCalculationService } from "./insulin-calculation.service";
import { createMockUserResponse } from "../../common/test-helpers/fixtures";
import { CalculateDoseDto } from "./dto/calculate-dose.dto";
import { PreSleepEvaluationDto } from "./dto/pre-sleep-evaluation.dto";

describe("InsulinCalculationController", () => {
  let controller: InsulinCalculationController;
  let service: InsulinCalculationService;

  const mockUser = createMockUserResponse();

  beforeEach(async () => {
    const mockService = {
      calculateMealDose: jest.fn(),
      calculateCorrection: jest.fn(),
      evaluateBeforeSleep: jest.fn(),
      getCurrentIOB: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InsulinCalculationController],
      providers: [
        {
          provide: InsulinCalculationService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<InsulinCalculationController>(InsulinCalculationController);
    service = module.get<InsulinCalculationService>(InsulinCalculationService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("calculateMealDose", () => {
    it("should calculate meal dose", async () => {
      const dto: CalculateDoseDto = {
        mealType: "BREAKFAST",
        glucose: 120,
        carbohydrates: 50,
      };
      const expectedResult = {
        units: 5,
        breakdown: {},
      };

      (service.calculateMealDose as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.calculateMealDose(mockUser, dto);

      expect(result).toEqual(expectedResult);
      expect(service.calculateMealDose).toHaveBeenCalledWith(mockUser.id, dto);
    });
  });

  describe("calculateCorrection", () => {
    it("should calculate correction dose", async () => {
      const dto: CalculateDoseDto = {
        glucose: 180,
        carbohydrates: 0,
      };
      const expectedResult = {
        units: 1.6,
        breakdown: {},
      };

      (service.calculateCorrection as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.calculateCorrection(mockUser, dto);

      expect(result).toEqual(expectedResult);
      expect(service.calculateCorrection).toHaveBeenCalledWith(mockUser.id, dto);
    });
  });

  describe("evaluatePreSleep", () => {
    it("should evaluate pre-sleep safety", async () => {
      const dto: PreSleepEvaluationDto = {
        glucose: 120,
      };
      const expectedResult = {
        safe: true,
        recommendation: "Safe to sleep",
      };

      (service.evaluateBeforeSleep as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.evaluatePreSleep(mockUser, dto);

      expect(result).toEqual(expectedResult);
      expect(service.evaluateBeforeSleep).toHaveBeenCalledWith(mockUser.id, dto.glucose);
    });
  });

  describe("getCurrentIOB", () => {
    it("should return current IOB", async () => {
      const expectedIOB = 2.5;

      (service.getCurrentIOB as jest.Mock).mockResolvedValue(expectedIOB);

      const result = await controller.getCurrentIOB(mockUser);

      expect(result).toEqual({ iob: expectedIOB });
      expect(service.getCurrentIOB).toHaveBeenCalledWith(mockUser.id);
    });
  });
});
