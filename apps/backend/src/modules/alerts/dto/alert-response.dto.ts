import { ApiProperty } from "@nestjs/swagger";
import { AlertType, AlertSeverity } from "@prisma/client";

export class AlertPatientDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ required: false })
  firstName?: string;

  @ApiProperty({ required: false })
  lastName?: string;
}

export class AlertResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ enum: AlertType })
  type!: AlertType;

  @ApiProperty({ enum: AlertSeverity })
  severity!: AlertSeverity;

  @ApiProperty()
  message!: string;

  @ApiProperty({ required: false })
  glucoseReadingId?: string;

  @ApiProperty({ required: false })
  glucoseEntryId?: string;

  @ApiProperty()
  acknowledged!: boolean;

  @ApiProperty({ required: false })
  acknowledgedAt?: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty({ type: AlertPatientDto, required: false })
  patient?: AlertPatientDto;
}
