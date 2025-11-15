import { ApiProperty } from "@nestjs/swagger";

export class PatientInfoDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ required: false })
  firstName?: string;

  @ApiProperty({ required: false })
  lastName?: string;

  @ApiProperty({ required: false })
  avatarUrl?: string;

  @ApiProperty()
  createdAt!: string;
}

export class DoctorPatientResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  doctorId!: string;

  @ApiProperty()
  patientId!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty({ type: PatientInfoDto })
  patient!: PatientInfoDto;
}
