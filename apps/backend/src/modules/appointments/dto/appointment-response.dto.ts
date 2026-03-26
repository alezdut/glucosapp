import { ApiProperty } from "@nestjs/swagger";
import { AppointmentStatus, AppointmentModality } from "@prisma/client";

export class AppointmentPatientDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ required: false })
  firstName?: string;

  @ApiProperty({ required: false })
  lastName?: string;
}

export class AppointmentDoctorDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ required: false })
  firstName?: string;

  @ApiProperty({ required: false })
  lastName?: string;
}

export class AppointmentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  doctorId!: string;

  @ApiProperty()
  patientId!: string;

  @ApiProperty()
  scheduledAt!: string;

  @ApiProperty({ required: false })
  notes?: string;

  @ApiProperty({ enum: AppointmentStatus })
  status!: AppointmentStatus;

  @ApiProperty({ enum: AppointmentModality })
  modality!: AppointmentModality;

  @ApiProperty({ required: false })
  location?: string;

  @ApiProperty({ required: false })
  meetingUrl?: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  @ApiProperty({ type: AppointmentPatientDto, required: false })
  patient?: AppointmentPatientDto;

  @ApiProperty({ type: AppointmentDoctorDto, required: false })
  doctor?: AppointmentDoctorDto;
}
