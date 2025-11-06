import { ApiProperty } from "@nestjs/swagger";

export class MealStatsDto {
  @ApiProperty({ example: 980 })
  totalMeals!: number;

  @ApiProperty({ example: "comidas" })
  unit!: string;

  @ApiProperty({ example: "Sus pacientes registraron 980 comidas el mes pasado." })
  description!: string;
}
