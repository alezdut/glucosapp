import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsDateString, IsEnum, IsBoolean, IsOptional, Min, Max } from "class-validator";

/**
 * Reading source enum (matching Prisma schema)
 */
export enum ReadingSource {
  MANUAL = "MANUAL",
  LIBRE_NFC = "LIBRE_NFC",
  DEXCOM = "DEXCOM",
  OTHER_CGM = "OTHER_CGM",
}

/**
 * DTO for creating a single sensor reading
 */
export class CreateSensorReadingDto {
  @ApiProperty({ description: "Glucose value in mg/dL", minimum: 20, maximum: 600 })
  @IsNumber()
  @Min(20)
  @Max(600)
  glucose!: number;

  @ApiProperty({ description: "Timestamp of the reading" })
  @IsDateString()
  recordedAt!: string;

  @ApiProperty({
    description: "Source of the reading",
    enum: ReadingSource,
    default: ReadingSource.MANUAL,
  })
  @IsEnum(ReadingSource)
  @IsOptional()
  source?: ReadingSource;

  @ApiProperty({
    description: "Whether this is historical data from sensor memory",
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isHistorical?: boolean;
}
