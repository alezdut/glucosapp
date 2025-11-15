import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class CreateDoctorPatientDto {
  @ApiProperty({ example: "patient-id-123" })
  @IsString()
  @IsNotEmpty()
  patientId!: string;
}
