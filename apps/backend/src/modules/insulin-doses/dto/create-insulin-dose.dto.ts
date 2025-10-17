import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsString, IsOptional, Min, Max, IsEnum, IsDateString } from "class-validator";

/**
 * DTO for creating insulin dose
 */
export class CreateInsulinDoseDto {
  @ApiProperty({ minimum: 0.5, maximum: 100 })
  @IsNumber()
  @Min(0.5)
  @Max(100)
  units!: number;

  @ApiProperty({ enum: ["basal", "bolus"] })
  @IsString()
  @IsEnum(["basal", "bolus"])
  type!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  recordedAt?: string;
}
