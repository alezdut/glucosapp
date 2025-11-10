import { ApiProperty } from "@nestjs/swagger";

export class GlucoseEvolutionPointDto {
  @ApiProperty({ example: "2024-05-01" })
  date!: string;

  @ApiProperty({ example: 120 })
  averageGlucose!: number;

  @ApiProperty({ example: 100 })
  minGlucose!: number;

  @ApiProperty({ example: 140 })
  maxGlucose!: number;
}

export class GlucoseEvolutionDto {
  @ApiProperty({ type: [GlucoseEvolutionPointDto] })
  data!: GlucoseEvolutionPointDto[];
}
