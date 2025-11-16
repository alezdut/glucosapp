import { Test, TestingModule } from "@nestjs/testing";
import { FoodSearchService } from "./food-search.service";
import { createMockConfigService } from "../../common/test-helpers/config.mock";

// Mock fetch globally
global.fetch = jest.fn();

describe("FoodSearchService", () => {
  let service: FoodSearchService;

  beforeEach(async () => {
    const mockConfig = createMockConfigService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FoodSearchService,
        {
          provide: "ConfigService",
          useValue: mockConfig,
        },
      ],
    }).compile();

    service = module.get<FoodSearchService>(FoodSearchService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("search", () => {
    it("should return empty array for empty query", async () => {
      const result = await service.search("");

      expect(result).toEqual([]);
    });

    it("should return empty array for whitespace-only query", async () => {
      const result = await service.search("   ");

      expect(result).toEqual([]);
    });

    it("should return food items from API", async () => {
      const mockResponse = {
        products: [
          {
            product_name: "Bread",
            brands: "Test Brand",
            nutriments: {
              carbohydrates_100g: 50,
            },
          },
          {
            product_name: "Milk",
            nutriments: {
              carbohydrates_100g: 5,
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await service.search("bread");

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        name: "Bread",
        carbohydratesPer100g: 50,
        brand: "Test Brand",
      });
      expect(result[1]).toMatchObject({
        name: "Milk",
        carbohydratesPer100g: 5,
      });
    });

    it("should filter products without required fields", async () => {
      const mockResponse = {
        products: [
          {
            product_name: "Bread",
            nutriments: {
              carbohydrates_100g: 50,
            },
          },
          {
            product_name: "Invalid Product",
            // Missing nutriments
          },
          {
            // Missing product_name
            nutriments: {
              carbohydrates_100g: 30,
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await service.search("test");

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Bread");
    });

    it("should return empty array on API error", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });

      const result = await service.search("bread");

      expect(result).toEqual([]);
    });

    it("should return empty array on network error", async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

      const result = await service.search("bread");

      expect(result).toEqual([]);
    });

    it("should return empty array if API response is invalid", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({}),
      });

      const result = await service.search("bread");

      expect(result).toEqual([]);
    });
  });
});
