import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsOptional, IsInt, Min } from "class-validator";

/**
 * DTO for query parameters in stats endpoints
 */
export class GetStatsQueryDto {
  @ApiProperty({
    description: "Number of days to include in statistics",
    example: 30,
    required: false,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  days?: number;
}
