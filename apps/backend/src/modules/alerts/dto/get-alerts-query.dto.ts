import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsInt, IsBoolean, IsEnum, IsString, Min, Max } from "class-validator";
import { Type, Transform } from "class-transformer";
import { AlertSeverity } from "@prisma/client";

/**
 * DTO for filtering alerts query
 */
export class GetAlertsQueryDto {
  @ApiProperty({
    required: false,
    description: "Maximum number of alerts to return",
    minimum: 1,
    maximum: 100,
    default: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiProperty({
    required: false,
    description:
      "Filter by acknowledgement status (true for acknowledged, false for unacknowledged)",
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === "true") return true;
    if (value === "false") return false;
    return value;
  })
  @IsBoolean()
  acknowledged?: boolean;

  @ApiProperty({
    required: false,
    description: "Filter by severity (comma-separated values: CRITICAL,HIGH,MEDIUM,LOW)",
    example: "CRITICAL,HIGH",
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === "string") {
      return value.split(",").map((s) => s.trim());
    }
    return value;
  })
  @IsEnum(AlertSeverity, { each: true })
  severity?: AlertSeverity[];

  @ApiProperty({
    required: false,
    description: "Filter alerts created in the last N hours",
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sinceHours?: number;

  @ApiProperty({
    required: false,
    description: "Filter by specific patient ID",
  })
  @IsOptional()
  @IsString()
  patientId?: string;
}
