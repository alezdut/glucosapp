import { ApiProperty } from "@nestjs/swagger";
import { AppointmentModality } from "@prisma/client";
import { IsNotEmpty, IsString, IsDateString, IsOptional, IsEnum, IsUrl } from "class-validator";

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

  @ApiProperty({
    enum: AppointmentModality,
    required: false,
    default: AppointmentModality.IN_PERSON,
  })
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
