import { ApiProperty } from "@nestjs/swagger";

export class CalendarDayResponseDto {
  @ApiProperty()
  date!: string;

  @ApiProperty()
  count!: number;
}
