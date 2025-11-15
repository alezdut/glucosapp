import { ApiProperty } from "@nestjs/swagger";

class DoctorInfoDto {
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
}

export class AssignedDoctorResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  doctorId!: string;

  @ApiProperty()
  patientId!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty({ type: DoctorInfoDto })
  doctor!: DoctorInfoDto;
}
