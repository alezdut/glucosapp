import { ApiProperty } from "@nestjs/swagger";
import { DiabetesType } from "@prisma/client";

export class LastGlucoseReadingDto {
  @ApiProperty()
  value!: number;

  @ApiProperty()
  recordedAt!: string;
}

export class PatientListItemDto {
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

  @ApiProperty({ enum: DiabetesType, required: false })
  diabetesType?: DiabetesType;

  @ApiProperty({ type: LastGlucoseReadingDto, required: false })
  lastGlucoseReading?: LastGlucoseReadingDto;

  @ApiProperty({ enum: ["Riesgo", "Estable", "Activo", "Inactivo"] })
  status!: "Riesgo" | "Estable" | "Activo" | "Inactivo";

  @ApiProperty()
  registrationDate!: string;
}
