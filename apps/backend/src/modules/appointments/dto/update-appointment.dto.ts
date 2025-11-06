import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsDateString, IsString, IsEnum } from "class-validator";
import { AppointmentStatus } from "@prisma/client";

export class UpdateAppointmentDto {
  @ApiProperty({ example: "2024-06-15T10:00:00Z", required: false })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiProperty({ example: "Control rutino de glucosa", required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ example: "CONFIRMED", enum: AppointmentStatus, required: false })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;
}
