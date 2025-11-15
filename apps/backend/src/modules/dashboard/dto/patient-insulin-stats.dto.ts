import { ApiProperty } from "@nestjs/swagger";

export class PatientInsulinStatsPointDto {
  @ApiProperty({ example: "2024-01" })
  month!: string;

  @ApiProperty({ example: 12.5 })
  averageBasal!: number;

  @ApiProperty({ example: 8.3 })
  averageBolus!: number;
}

export class PatientInsulinStatsDto {
  @ApiProperty({ type: [PatientInsulinStatsPointDto] })
  data!: PatientInsulinStatsPointDto[];
}
