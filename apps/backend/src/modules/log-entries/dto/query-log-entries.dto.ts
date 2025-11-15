import { IsOptional, IsDateString } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

/**
 * DTO for querying log entries with optional date range filtering
 */
export class QueryLogEntriesDto {
  @ApiPropertyOptional({
    description: "Start date for filtering entries (ISO 8601 format)",
    example: "2025-03-01T00:00:00.000Z",
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: "End date for filtering entries (ISO 8601 format)",
    example: "2025-03-08T23:59:59.999Z",
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
