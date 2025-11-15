import { ApiProperty } from "@nestjs/swagger";

/**
 * DTO for food item search result
 */
export class FoodItemDto {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  carbohydratesPer100g!: number;

  @ApiProperty({ required: false })
  brand?: string;
}
