import { Test, TestingModule } from "@nestjs/testing";
import { FoodSearchController } from "./food-search.controller";
import { FoodSearchService } from "./food-search.service";

describe("FoodSearchController", () => {
  let controller: FoodSearchController;
  let service: FoodSearchService;

  beforeEach(async () => {
    const mockService = {
      search: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FoodSearchController],
      providers: [
        {
          provide: FoodSearchService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<FoodSearchController>(FoodSearchController);
    service = module.get<FoodSearchService>(FoodSearchService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("search", () => {
    it("should return search results", async () => {
      const query = "bread";
      const expectedResult = [
        {
          name: "Bread",
          carbohydratesPer100g: 50,
        },
      ];

      (service.search as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.search(query);

      expect(result).toEqual(expectedResult);
      expect(service.search).toHaveBeenCalledWith(query);
    });
  });
});
