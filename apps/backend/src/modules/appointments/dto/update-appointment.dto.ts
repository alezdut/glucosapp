import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsDateString, IsString, IsEnum, IsUrl } from "class-validator";
import { AppointmentStatus, AppointmentModality } from "@prisma/client";

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

  @ApiProperty({ enum: AppointmentModality, required: false })
  @IsOptional()
  @IsEnum(AppointmentModality)
  modality?: AppointmentModality;

  @ApiProperty({ example: "Consultorio 4, Clínica Central", required: false })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ example: "https://meet.example.com/appointment-123", required: false })
  @IsOptional()
  @IsUrl({}, { message: "meetingUrl must be a valid URL" })
  meetingUrl?: string;
}
