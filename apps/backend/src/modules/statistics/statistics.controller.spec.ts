import { Test, TestingModule } from "@nestjs/testing";
import { StatisticsController } from "./statistics.controller";
import { StatisticsService } from "./statistics.service";
import { createMockUserResponse } from "../../common/test-helpers/fixtures";

describe("StatisticsController", () => {
  let controller: StatisticsController;
  let service: StatisticsService;

  const mockUser = createMockUserResponse();

  beforeEach(async () => {
    const mockService = {
      getSummary: jest.fn(),
      getWeeklyGlucoseAverage: jest.fn(),
      getDailyInsulinAverage: jest.fn(),
      getGlucoseTrend: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StatisticsController],
      providers: [
        {
          provide: StatisticsService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<StatisticsController>(StatisticsController);
    service = module.get<StatisticsService>(StatisticsService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getSummary", () => {
    it("should return summary statistics", async () => {
      const expectedResult = {
        averageGlucose: 120,
        dailyInsulinDose: 25,
        mealsRegistered: 3,
      };

      (service.getSummary as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.getSummary(mockUser);

      expect(result).toEqual(expectedResult);
      expect(service.getSummary).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe("getWeeklyGlucoseAverage", () => {
    it("should return weekly glucose average", async () => {
      const expectedResult = {
        averageGlucose: 120,
      };

      (service.getWeeklyGlucoseAverage as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.getWeeklyGlucoseAverage(mockUser);

      expect(result).toEqual(expectedResult);
      expect(service.getWeeklyGlucoseAverage).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe("getDailyInsulinAverage", () => {
    it("should return daily insulin average", async () => {
      const expectedResult = {
        averageDose: 25.5,
      };

      (service.getDailyInsulinAverage as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.getDailyInsulinAverage(mockUser);

      expect(result).toEqual(expectedResult);
      expect(service.getDailyInsulinAverage).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe("getGlucoseTrend", () => {
    it("should return glucose trend", async () => {
      const expectedResult = {
        data: [],
      };

      (service.getGlucoseTrend as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.getGlucoseTrend(mockUser);

      expect(result).toEqual(expectedResult);
      expect(service.getGlucoseTrend).toHaveBeenCalledWith(mockUser.id);
    });
  });
});
