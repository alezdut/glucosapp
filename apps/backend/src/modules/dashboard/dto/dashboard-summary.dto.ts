import { ApiProperty } from "@nestjs/swagger";

export class DashboardSummaryDto {
  @ApiProperty({ example: 120 })
  activePatients!: number;

  @ApiProperty({ example: 5 })
  criticalAlerts!: number;

  @ApiProperty({ example: 15 })
  upcomingAppointments!: number;
}
