import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsOptional, IsInt, Min } from "class-validator";

/**
 * DTO for query parameters in recent alerts endpoint
 */
export class GetRecentAlertsQueryDto {
  @ApiProperty({
    description: "Maximum number of alerts to return",
    example: 10,
    required: false,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
