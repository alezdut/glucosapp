import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsEnum, IsOptional, Min, Max, IsDateString } from "class-validator";
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
}
