import { ApiProperty } from "@nestjs/swagger";

export class InsulinStatsDto {
  @ApiProperty({ example: 12.5 })
  averageDose!: number;

  @ApiProperty({ example: "unidades/día" })
  unit!: string;

  @ApiProperty({ example: 30 })
  days!: number;

  @ApiProperty({ example: "En los últimos 30 días, sus pacientes promedian 12.5 unidades/día." })
  description!: string;
}
