import { ApiProperty } from "@nestjs/swagger";

/**
 * DTO for statistics response
 */
export class StatisticsResponseDto {
  @ApiProperty({ description: "Average glucose in mg/dL (last 7 days)" })
  averageGlucose!: number;

  @ApiProperty({ description: "Total daily insulin dose in units (today)" })
  dailyInsulinDose!: number;

  @ApiProperty({ description: "Number of meals registered today" })
  mealsRegistered!: number;
}
