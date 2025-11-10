import { ApiProperty } from "@nestjs/swagger";

export class PatientGlucoseEvolutionPointDto {
  @ApiProperty({ example: "2024-01" })
  month!: string;

  @ApiProperty({ example: 120 })
  averageGlucose!: number;

  @ApiProperty({ example: 100 })
  minGlucose!: number;

  @ApiProperty({ example: 140 })
  maxGlucose!: number;
}

export class PatientGlucoseEvolutionDto {
  @ApiProperty({ type: [PatientGlucoseEvolutionPointDto] })
  data!: PatientGlucoseEvolutionPointDto[];
}
