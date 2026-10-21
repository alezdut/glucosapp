import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsBoolean, IsOptional, IsString } from "class-validator";

export class AcknowledgeBatchDto {
  @ApiProperty({
    description: "Array of alert IDs to acknowledge (optional)",
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  alertIds?: string[];

  @ApiProperty({
    description: "Acknowledge all critical alerts (if true, ignores alertIds)",
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  acknowledgeAll?: boolean;
}
