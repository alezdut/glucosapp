import { ApiProperty } from "@nestjs/swagger";
import {
  IsNumber,
  IsEnum,
  IsOptional,
  Min,
  Max,
  IsBoolean,
  IsObject,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

/**
 * Dose context for special circumstances
 */
export class DoseContextDto {
  @ApiProperty({ required: false, description: "Exercise in the last 4-6 hours" })
  @IsOptional()
  @IsBoolean()
  recentExercise?: boolean;

  @ApiProperty({ required: false, description: "Alcohol consumption" })
  @IsOptional()
  @IsBoolean()
  alcohol?: boolean;

  @ApiProperty({ required: false, description: "Current illness" })
  @IsOptional()
  @IsBoolean()
  illness?: boolean;

  @ApiProperty({ required: false, description: "High stress levels" })
  @IsOptional()
  @IsBoolean()
  stress?: boolean;

  @ApiProperty({ required: false, description: "Menstruation" })
  @IsOptional()
  @IsBoolean()
  menstruation?: boolean;

  @ApiProperty({ required: false, description: "High-fat meal" })
  @IsOptional()
  @IsBoolean()
  highFatMeal?: boolean;

  @ApiProperty({ required: false, description: "Hour of day (0-23)", minimum: 0, maximum: 23 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(23)
  hourOfDay?: number;
}

/**
 * DTO for calculating insulin dose
 */
export class CalculateDoseDto {
  @ApiProperty({ description: "Current glucose level in mg/dL", minimum: 40, maximum: 600 })
  @IsNumber()
  @Min(40, { message: "Glucose must be at least 40 mg/dL" })
  @Max(600, { message: "Glucose must not exceed 600 mg/dL" })
  glucose!: number;

  @ApiProperty({ description: "Carbohydrates in grams", minimum: 0, maximum: 300 })
  @IsNumber()
  @Min(0, { message: "Carbohydrates cannot be negative" })
  @Max(300, { message: "Carbohydrates seem too high (max 300g)" })
  carbohydrates!: number;

  @ApiProperty({
    enum: ["BREAKFAST", "LUNCH", "DINNER", "CORRECTION"],
    description: "Time of day for the meal",
  })
  @IsEnum(["BREAKFAST", "LUNCH", "DINNER", "CORRECTION"], {
    message: "Meal type must be BREAKFAST, LUNCH, DINNER, or CORRECTION",
  })
  mealType!: "BREAKFAST" | "LUNCH" | "DINNER" | "CORRECTION";

  @ApiProperty({
    required: false,
    description: "Target glucose level in mg/dL",
    minimum: 70,
    maximum: 200,
  })
  @IsOptional()
  @IsNumber()
  @Min(70, { message: "Target glucose must be at least 70 mg/dL" })
  @Max(200, { message: "Target glucose must not exceed 200 mg/dL" })
  targetGlucose?: number;

  @ApiProperty({
    required: false,
    type: DoseContextDto,
    description: "Additional context for dose calculation",
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => DoseContextDto)
  context?: DoseContextDto;
}
