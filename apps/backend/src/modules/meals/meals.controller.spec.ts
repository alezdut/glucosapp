import { Test, TestingModule } from "@nestjs/testing";
import { MealsController } from "./meals.controller";
import { MealsService } from "./meals.service";
import { createMockUserResponse } from "../../common/test-helpers/fixtures";
import { CreateMealDto } from "./dto/create-meal.dto";

describe("MealsController", () => {
  let controller: MealsController;
  let service: MealsService;

  const mockUser = createMockUserResponse();

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MealsController],
      providers: [
        {
          provide: MealsService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<MealsController>(MealsController);
    service = module.get<MealsService>(MealsService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("create", () => {
    it("should create meal template", async () => {
      const createDto: CreateMealDto = {
        name: "Breakfast",
        foodItems: [{ name: "Bread", carbs: 30 }],
      };
      const expectedResult = {
        id: "meal-1",
        name: "Breakfast",
      } as any;

      (service.create as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.create(mockUser, createDto);

      expect(result).toEqual(expectedResult);
      expect(service.create).toHaveBeenCalledWith(mockUser.id, createDto);
    });
  });

  describe("findAll", () => {
    it("should return all meal templates", async () => {
      const expectedResult = [];

      (service.findAll as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.findAll(mockUser);

      expect(result).toEqual(expectedResult);
      expect(service.findAll).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe("findOne", () => {
    it("should return specific meal template", async () => {
      const mealId = "meal-1";
      const expectedResult = {
        id: mealId,
        name: "Breakfast",
      } as any;

      (service.findOne as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.findOne(mockUser, mealId);

      expect(result).toEqual(expectedResult);
      expect(service.findOne).toHaveBeenCalledWith(mockUser.id, mealId);
    });
  });

  describe("delete", () => {
    it("should delete meal template", async () => {
      const mealId = "meal-1";
      const expectedResult = {
        id: mealId,
      } as any;

      (service.delete as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.delete(mockUser, mealId);

      expect(result).toEqual(expectedResult);
      expect(service.delete).toHaveBeenCalledWith(mockUser.id, mealId);
    });
  });
});
