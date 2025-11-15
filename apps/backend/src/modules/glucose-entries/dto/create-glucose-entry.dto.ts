import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsString, IsOptional, Min, Max, IsDateString } from "class-validator";

/**
 * DTO for creating glucose entry
 */
export class CreateGlucoseEntryDto {
  @ApiProperty({ minimum: 20, maximum: 600 })
  @IsInt()
  @Min(20)
  @Max(600)
  mgdl!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  recordedAt?: string;
}
