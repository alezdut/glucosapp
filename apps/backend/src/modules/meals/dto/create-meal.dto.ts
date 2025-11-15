import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNumber, Min, Max, ValidateNested, ArrayMinSize } from "class-validator";
import { Type } from "class-transformer";

/**
 * DTO for individual food item in a meal
 */
export class MealItemDto {
  @ApiProperty({ description: "Name of the food item", example: "Huevo" })
  @IsString()
  name!: string;

  @ApiProperty({
    minimum: 0,
    maximum: 1000,
    description: "Quantity in grams",
    example: 150,
  })
  @IsNumber()
  @Min(0)
  @Max(1000)
  quantity!: number;

  @ApiProperty({
    minimum: 0,
    maximum: 500,
    description: "Carbohydrates in this item",
    example: 1.2,
  })
  @IsNumber()
  @Min(0)
  @Max(500)
  carbs!: number;
}

/**
 * DTO for creating meal template
 */
export class CreateMealDto {
  @ApiProperty({
    description: "Name of the meal template",
    example: "Desayuno completo",
  })
  @IsString()
  name!: string;

  @ApiProperty({
    type: [MealItemDto],
    description: "List of food items in this meal",
  })
  @ValidateNested({ each: true })
  @Type(() => MealItemDto)
  @ArrayMinSize(1, { message: "At least one food item is required" })
  foodItems!: MealItemDto[];
}
