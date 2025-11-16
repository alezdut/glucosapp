import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { MealsService } from "./meals.service";
import { createMockPrismaService } from "../../common/test-helpers/prisma.mock";
import { createMockConfigService } from "../../common/test-helpers/config.mock";
import { CreateMealDto } from "./dto/create-meal.dto";

describe("MealsService", () => {
  let service: MealsService;
  let prismaService: PrismaService;

  const userId = "user-123";

  beforeEach(async () => {
    const mockPrisma = createMockPrismaService();
    const mockConfig = createMockConfigService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MealsService,
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

    service = module.get<MealsService>(MealsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create meal with food items", async () => {
      const data: CreateMealDto = {
        name: "Breakfast",
        foodItems: [
          { name: "Bread", quantity: 100, carbs: 30 },
          { name: "Milk", quantity: 200, carbs: 12 },
        ],
      };
      const createdMeal = {
        id: "meal-1",
        userId,
        name: data.name,
        carbohydrates: 42,
        foodItems: data.foodItems,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prismaService.meal.create as jest.Mock).mockResolvedValue(createdMeal);

      const result = await service.create(userId, data);

      expect(result).toMatchObject({
        id: "meal-1",
        name: "Breakfast",
        carbohydrates: 42,
      });
      expect(prismaService.meal.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            carbohydrates: 42,
          }),
        }),
      );
    });
  });

  describe("findAll", () => {
    it("should return all meals for user", async () => {
      const meals = [
        {
          id: "meal-1",
          userId,
          name: "Breakfast",
          carbohydrates: 42,
          foodItems: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (prismaService.meal.findMany as jest.Mock).mockResolvedValue(meals);

      const result = await service.findAll(userId);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "meal-1",
        name: "Breakfast",
      });
    });
  });

  describe("findOne", () => {
    it("should return specific meal", async () => {
      const mealId = "meal-1";
      const meal = {
        id: mealId,
        userId,
        name: "Breakfast",
        carbohydrates: 42,
        foodItems: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prismaService.meal.findFirst as jest.Mock).mockResolvedValue(meal);

      const result = await service.findOne(userId, mealId);

      expect(result).toEqual(meal);
    });
  });

  describe("delete", () => {
    it("should delete meal successfully", async () => {
      const mealId = "meal-1";
      const meal = {
        id: mealId,
        userId,
        name: "Breakfast",
        carbohydrates: 42,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prismaService.meal.findFirst as jest.Mock).mockResolvedValue(meal);
      (prismaService.meal.delete as jest.Mock).mockResolvedValue(meal);

      await service.delete(userId, mealId);

      expect(prismaService.meal.delete).toHaveBeenCalledWith({
        where: { id: mealId },
      });
    });

    it("should throw NotFoundException if meal not found", async () => {
      const mealId = "meal-1";

      (prismaService.meal.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.delete(userId, mealId)).rejects.toThrow(NotFoundException);
    });
  });
});
