import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsString, IsOptional, Min, Max, IsDateString } from "class-validator";

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

  @ApiProperty({ required: false, enum: ["Tipo 1", "Tipo 2"] })
  @IsOptional()
  @IsString()
  diabetesType?: string;

  @ApiProperty({ required: false, enum: ["mg/dL", "mmol/L"] })
  @IsOptional()
  @IsString()
  glucoseUnit?: string;

  @ApiProperty({ required: false, enum: ["light", "dark"] })
  @IsOptional()
  @IsString()
  theme?: string;

  @ApiProperty({ required: false, enum: ["Español"] })
  @IsOptional()
  @IsString()
  language?: string;
}
