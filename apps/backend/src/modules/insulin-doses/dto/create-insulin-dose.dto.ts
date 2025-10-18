import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsOptional, Min, Max, IsEnum, IsDateString } from "class-validator";
import { InsulinType } from "@glucosapp/types";

/**
 * DTO for creating insulin dose
 */
export class CreateInsulinDoseDto {
  @ApiProperty({ minimum: 0.5, maximum: 100 })
  @IsNumber()
  @Min(0.5)
  @Max(100)
  units!: number;

  @ApiProperty({ enum: InsulinType })
  @IsEnum(InsulinType)
  type!: InsulinType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  recordedAt?: string;
}
