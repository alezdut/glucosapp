import { Module } from "@nestjs/common";
import { FoodSearchController } from "./food-search.controller";
import { FoodSearchService } from "./food-search.service";

/**
 * Module for food search functionality
 */
@Module({
  controllers: [FoodSearchController],
  providers: [FoodSearchService],
  exports: [FoodSearchService],
})
export class FoodSearchModule {}
