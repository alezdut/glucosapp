import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, Min, Max } from "class-validator";

/**
 * DTO for pre-sleep evaluation
 */
export class PreSleepEvaluationDto {
  @ApiProperty({ description: "Current glucose level in mg/dL", minimum: 40, maximum: 600 })
  @IsNumber()
  @Min(40, { message: "Glucose must be at least 40 mg/dL" })
  @Max(600, { message: "Glucose must not exceed 600 mg/dL" })
  glucose!: number;
}
