import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsDateString, IsOptional } from "class-validator";

export class CreateAppointmentDto {
  @ApiProperty({ example: "patient-id-123" })
  @IsString()
  @IsNotEmpty()
  patientId!: string;

  @ApiProperty({ example: "2024-06-15T10:00:00Z" })
  @IsDateString()
  @IsNotEmpty()
  scheduledAt!: string;

  @ApiProperty({ example: "Control rutino de glucosa", required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
