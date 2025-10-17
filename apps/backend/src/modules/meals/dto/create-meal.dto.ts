import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNumber, IsOptional, Min, Max, IsDateString } from "class-validator";

/**
 * DTO for creating meal
 */
export class CreateMealDto {
  @ApiProperty()
  @IsString()
  name!: string;

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
