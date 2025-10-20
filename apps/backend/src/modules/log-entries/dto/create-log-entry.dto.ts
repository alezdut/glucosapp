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
  MIN_GLUCOSE_READING,
  MAX_GLUCOSE_READING,
  MIN_INSULIN_DOSE,
  MAX_INSULIN_DOSE,
} from "@glucosapp/types";

/**
 * DTO for creating log entry with glucose, insulin, and optional meal
 */
export class CreateLogEntryDto {
  @ApiProperty({ minimum: MIN_GLUCOSE_READING, maximum: MAX_GLUCOSE_READING })
  @IsInt()
  @Min(MIN_GLUCOSE_READING)
  @Max(MAX_GLUCOSE_READING)
  glucoseMgdl!: number;

  @ApiProperty({
    minimum: MIN_INSULIN_DOSE,
    maximum: MAX_INSULIN_DOSE,
    description: "Insulin units actually applied",
  })
  @IsNumber()
  @Min(MIN_INSULIN_DOSE)
  @Max(MAX_INSULIN_DOSE)
  insulinUnits!: number;

  @ApiProperty({
    required: false,
    minimum: MIN_INSULIN_DOSE,
    maximum: MAX_INSULIN_DOSE,
    description: "System calculated insulin units",
  })
  @IsOptional()
  @IsNumber()
  @Min(MIN_INSULIN_DOSE)
  @Max(MAX_INSULIN_DOSE)
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

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  recordedAt?: string;
}
