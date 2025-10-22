import { ApiProperty } from "@nestjs/swagger";
import {
  IsInt,
  IsNumber,
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsBoolean,
  Min,
  Max,
} from "class-validator";
import {
  InsulinType,
  MealCategory,
  MIN_GLUCOSE_READING,
  MAX_GLUCOSE_READING,
} from "@glucosapp/types";

/**
 * DTO for creating log entry with glucose, insulin, and optional meal
 */
export class CreateLogEntryDto {
  @ApiProperty({ minimum: MIN_GLUCOSE_READING, maximum: MAX_GLUCOSE_READING })
  @IsInt()
  @Min(20)
  @Max(600)
  glucoseMgdl!: number;

  @ApiProperty({
    minimum: 0,
    maximum: 100,
    description: "Insulin units actually applied",
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  insulinUnits!: number;

  @ApiProperty({
    required: false,
    minimum: 0,
    maximum: 100,
    description: "System calculated insulin units",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  calculatedInsulinUnits?: number;

  @ApiProperty({
    required: false,
    description: "Whether the user manually edited the calculated dose",
  })
  @IsOptional()
  @IsBoolean()
  wasManuallyEdited?: boolean;

  @ApiProperty({ enum: InsulinType })
  @IsEnum(InsulinType)
  insulinType!: InsulinType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  mealName?: string;

  @ApiProperty({ required: false, minimum: 0, maximum: 500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(500)
  carbohydrates?: number;

  @ApiProperty({
    required: false,
    enum: MealCategory,
    description: "Type of meal (breakfast, lunch, dinner, snack)",
  })
  @IsOptional()
  @IsEnum(["BREAKFAST", "LUNCH", "DINNER", "SNACK", "CORRECTION"], {
    message: "Meal type must be BREAKFAST, LUNCH, DINNER, SNACK, or CORRECTION",
  })
  mealType?: MealCategory;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  recordedAt?: string;
}
