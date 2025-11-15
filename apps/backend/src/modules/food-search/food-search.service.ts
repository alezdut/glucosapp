import { Injectable, Logger } from "@nestjs/common";
import { FoodItemDto } from "./dto/food-item.dto";

/**
 * Service for searching food items via OpenFoodFacts API
 */
@Injectable()
export class FoodSearchService {
  private readonly logger = new Logger(FoodSearchService.name);
  private readonly openFoodFactsUrl = "https://world.openfoodfacts.org/cgi/search.pl";

  /**
   * Search for food items by query
   */
  async search(query: string): Promise<FoodItemDto[]> {
    if (!query || query.trim().length === 0) {
      console.log("No query");
      return [];
    }

    try {
      const params = new URLSearchParams({
        search_terms: query,
        search_simple: "1",
        action: "process",
        json: "1",
        page_size: "20",
        fields: "product_name,brands,nutriments",
      });

      const response = await fetch(`${this.openFoodFactsUrl}?${params.toString()}`);

      if (!response.ok) {
        this.logger.error(`OpenFoodFacts API error: ${response.status}`);
        return [];
      }

      const data = await response.json();

      if (!data.products || !Array.isArray(data.products)) {
        return [];
      }

      const foodItems: FoodItemDto[] = data.products
        .filter((product: any) => {
          return (
            product.product_name &&
            product.nutriments &&
            typeof product.nutriments.carbohydrates_100g === "number"
          );
        })
        .map((product: any) => ({
          name: product.product_name,
          carbohydratesPer100g: product.nutriments.carbohydrates_100g,
          brand: product.brands || undefined,
        }));

      return foodItems;
    } catch (error) {
      this.logger.error(`Error searching OpenFoodFacts: ${error}`);
      return [];
    }
  }
}
