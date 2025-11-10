import { ApiProperty } from "@nestjs/swagger";

/**
 * DTO for patient profile/parameters
 */
export class PatientProfileDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  icRatioBreakfast!: number;

  @ApiProperty()
  icRatioLunch!: number;

  @ApiProperty()
  icRatioDinner!: number;

  @ApiProperty()
  insulinSensitivityFactor!: number;

  @ApiProperty()
  diaHours!: number;

  @ApiProperty({ required: false })
  targetGlucose?: number;

  @ApiProperty()
  minTargetGlucose!: number;

  @ApiProperty()
  maxTargetGlucose!: number;

  @ApiProperty({ required: false })
  mealTimeBreakfastStart?: number;

  @ApiProperty({ required: false })
  mealTimeBreakfastEnd?: number;

  @ApiProperty({ required: false })
  mealTimeLunchStart?: number;

  @ApiProperty({ required: false })
  mealTimeLunchEnd?: number;

  @ApiProperty({ required: false })
  mealTimeDinnerStart?: number;

  @ApiProperty({ required: false })
  mealTimeDinnerEnd?: number;
}
