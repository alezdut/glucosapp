import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsEnum, IsOptional } from "class-validator";

/**
 * Export format enum
 */
export enum ExportFormat {
  JSON = "json",
  CSV = "csv",
}

/**
 * DTO for exporting sensor readings
 */
export class ExportReadingsQueryDto {
  @ApiProperty({
    description: "Start date for export range",
    required: false,
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: "End date for export range",
    required: false,
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    description: "Export format",
    enum: ExportFormat,
    default: ExportFormat.JSON,
  })
  @IsEnum(ExportFormat)
  @IsOptional()
  format?: ExportFormat;
}
