import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { FoodSearchService } from "./food-search.service";
import { FoodItemDto } from "./dto/food-item.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

/**
 * Controller handling food search endpoints
 */
@ApiTags("food-search")
@Controller({ path: "food-search", version: "1" })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FoodSearchController {
  constructor(private readonly foodSearchService: FoodSearchService) {}

  /**
   * Search for food items
   */
  @Get()
  @ApiOperation({ summary: "Search for food items" })
  @ApiQuery({ name: "q", description: "Search query" })
  @ApiResponse({ status: 200, description: "Search results", type: [FoodItemDto] })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async search(@Query("q") query: string): Promise<FoodItemDto[]> {
    return this.foodSearchService.search(query);
  }
}
