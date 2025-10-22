import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsEnum, IsOptional, IsInt, Min, Max, IsDateString } from "class-validator";
import { DiabetesType, GlucoseUnit, Theme, Language } from "@glucosapp/types";

/**
 * DTO for updating user profile
 */
export class UpdateProfileDto {
  @ApiProperty({ required: false, type: String, format: "date-time" })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiProperty({ required: false, minimum: 20, maximum: 300 })
  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(300)
  weight?: number;

  @ApiProperty({ required: false, enum: DiabetesType })
  @IsOptional()
  @IsEnum(DiabetesType)
  diabetesType?: DiabetesType;

  @ApiProperty({ required: false, enum: GlucoseUnit })
  @IsOptional()
  @IsEnum(GlucoseUnit)
  glucoseUnit?: GlucoseUnit;

  @ApiProperty({ required: false, enum: Theme })
  @IsOptional()
  @IsEnum(Theme)
  theme?: Theme;

  @ApiProperty({ required: false, enum: Language })
  @IsOptional()
  @IsEnum(Language)
  language?: Language;

  // Insulin Profile - Time-of-day specific IC Ratios
  @ApiProperty({
    required: false,
    minimum: 1,
    maximum: 30,
    description: "Breakfast IC Ratio (grams of carbs per 1 unit of insulin)",
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(30)
  icRatioBreakfast?: number;

  @ApiProperty({
    required: false,
    minimum: 1,
    maximum: 30,
    description: "Lunch IC Ratio (grams of carbs per 1 unit of insulin)",
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(30)
  icRatioLunch?: number;

  @ApiProperty({
    required: false,
    minimum: 1,
    maximum: 30,
    description: "Dinner IC Ratio (grams of carbs per 1 unit of insulin)",
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(30)
  icRatioDinner?: number;

  @ApiProperty({
    required: false,
    minimum: 10,
    maximum: 200,
    description: "Insulin sensitivity factor (mg/dL drop per 1 unit of insulin)",
  })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(200)
  insulinSensitivityFactor?: number;

  @ApiProperty({
    required: false,
    minimum: 2,
    maximum: 8,
    description: "Duration of Insulin Action in hours",
  })
  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(8)
  diaHours?: number;

  @ApiProperty({
    required: false,
    minimum: 70,
    maximum: 180,
    description: "Target glucose level in mg/dL",
  })
  @IsOptional()
  @IsInt()
  @Min(70)
  @Max(180)
  targetGlucose?: number;

  @ApiProperty({
    required: false,
    minimum: 70,
    maximum: 150,
    description: "Minimum target glucose level in mg/dL (personalized range)",
  })
  @IsOptional()
  @IsInt()
  @Min(70)
  @Max(150)
  minTargetGlucose?: number;

  @ApiProperty({
    required: false,
    minimum: 80,
    maximum: 200,
    description: "Maximum target glucose level in mg/dL (personalized range)",
  })
  @IsOptional()
  @IsInt()
  @Min(80)
  @Max(200)
  maxTargetGlucose?: number;

  // Meal time ranges (in minutes from midnight, 0-1439)
  @ApiProperty({
    required: false,
    minimum: 0,
    maximum: 1439,
    description: "Breakfast start time in minutes from midnight",
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1439)
  mealTimeBreakfastStart?: number;

  @ApiProperty({
    required: false,
    minimum: 0,
    maximum: 1439,
    description: "Breakfast end time in minutes from midnight",
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1439)
  mealTimeBreakfastEnd?: number;

  @ApiProperty({
    required: false,
    minimum: 0,
    maximum: 1439,
    description: "Lunch start time in minutes from midnight",
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1439)
  mealTimeLunchStart?: number;

  @ApiProperty({
    required: false,
    minimum: 0,
    maximum: 1439,
    description: "Lunch end time in minutes from midnight",
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1439)
  mealTimeLunchEnd?: number;

  @ApiProperty({
    required: false,
    minimum: 0,
    maximum: 1439,
    description: "Dinner start time in minutes from midnight",
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1439)
  mealTimeDinnerStart?: number;

  @ApiProperty({
    required: false,
    minimum: 0,
    maximum: 1439,
    description: "Dinner end time in minutes from midnight",
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1439)
  mealTimeDinnerEnd?: number;
}
