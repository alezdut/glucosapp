import { ApiPropertyOptional } from "@nestjs/swagger";
import { AppointmentStatus } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsBoolean, IsDateString, IsEnum, IsOptional, IsString, Matches } from "class-validator";

export class GetAppointmentsQueryDto {
  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true)
  @IsBoolean()
  includePast?: boolean;

  @ApiPropertyOptional({ example: "patient-id-123" })
  @IsOptional()
  @IsString()
  patientId?: string;

  @ApiPropertyOptional({ enum: AppointmentStatus })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @ApiPropertyOptional({ example: "2026-03-26T00:00:00.000Z" })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: "2026-04-02T23:59:59.999Z" })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ example: "2026-03" })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: "month must be in YYYY-MM format" })
  month?: string;
}
