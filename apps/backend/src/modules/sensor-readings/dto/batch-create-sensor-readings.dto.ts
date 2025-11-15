import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, ValidateNested, ArrayMaxSize, ArrayMinSize } from "class-validator";
import { CreateSensorReadingDto } from "./create-sensor-reading.dto";

/**
 * DTO for batch creating sensor readings
 * Optimized for importing historical data from CGM sensors
 */
export class BatchCreateSensorReadingsDto {
  @ApiProperty({
    description: "Array of sensor readings",
    type: [CreateSensorReadingDto],
    minItems: 1,
    maxItems: 100,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100) // Limit to prevent abuse
  @ValidateNested({ each: true })
  @Type(() => CreateSensorReadingDto)
  readings!: CreateSensorReadingDto[];
}
