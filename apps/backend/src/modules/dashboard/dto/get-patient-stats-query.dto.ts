import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsOptional, IsInt, Min } from "class-validator";

/**
 * DTO for query parameters in patient stats endpoints
 */
export class GetPatientStatsQueryDto {
  @ApiProperty({
    description: "Number of months to include in statistics",
    example: 12,
    required: false,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  months?: number;
}
