import { ApiProperty } from "@nestjs/swagger";
import { DiabetesType } from "@prisma/client";
import { LastGlucoseReadingDto } from "./patient-list-item.dto";

export class PatientDetailsDto {
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

  @ApiProperty({ required: false })
  birthDate?: string;

  @ApiProperty({ required: false })
  weight?: number;

  @ApiProperty({ type: LastGlucoseReadingDto, required: false })
  lastGlucoseReading?: LastGlucoseReadingDto;

  @ApiProperty({ enum: ["Riesgo", "Estable", "Activo", "Inactivo"] })
  status!: "Riesgo" | "Estable" | "Activo" | "Inactivo";

  @ApiProperty()
  registrationDate!: string;

  @ApiProperty()
  totalGlucoseReadings!: number;

  @ApiProperty()
  totalInsulinDoses!: number;

  @ApiProperty()
  totalMeals!: number;

  @ApiProperty()
  totalAlerts!: number;

  @ApiProperty()
  unacknowledgedAlerts!: number;
}
