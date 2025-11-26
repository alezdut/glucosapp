import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsBoolean,
  IsObject,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export enum ReportFormat {
  PDF = "pdf",
  CSV = "csv",
}

export enum ReportType {
  GLUCOSE = "glucosa",
  SENSOR_READINGS = "lecturas_sensor",
  INSULIN = "insulina",
  MEALS = "comidas",
}

export class ReportFiltersDto {
  @ApiProperty({ required: false, description: "Search by name or email" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ enum: ["TYPE_1", "TYPE_2"], required: false })
  @IsOptional()
  @IsString()
  diabetesType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  activeOnly?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  registrationDate?: string;

  @ApiProperty({ enum: ["Riesgo", "Estable"], required: false })
  @IsOptional()
  @IsString()
  clinicalStatus?: "Riesgo" | "Estable";

  @ApiProperty({ enum: ["Activo", "Inactivo"], required: false })
  @IsOptional()
  @IsString()
  activityStatus?: "Activo" | "Inactivo";

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ageRange?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  weightRange?: string;
}

export class GenerateIndividualReportDto {
  @ApiProperty({ description: "Patient ID" })
  @IsString()
  patientId!: string;

  @ApiProperty({ description: "Start date (ISO string)" })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ description: "End date (ISO string)" })
  @IsDateString()
  endDate!: string;

  @ApiProperty({ enum: ReportFormat, description: "Report format" })
  @IsEnum(ReportFormat)
  format!: ReportFormat;

  @ApiProperty({
    type: [String],
    enum: ReportType,
    description: "Types of data to include in report",
  })
  @IsEnum(ReportType, { each: true })
  reportTypes!: ReportType[];

  @ApiProperty({
    required: false,
    default: false,
    description: "Include AI-generated summary in the report",
  })
  @IsOptional()
  @IsBoolean()
  includeAISummary?: boolean;
}

export class GenerateGroupReportDto {
  @ApiProperty({ description: "Start date (ISO string)" })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ description: "End date (ISO string)" })
  @IsDateString()
  endDate!: string;

  @ApiProperty({ enum: ReportFormat, description: "Report format" })
  @IsEnum(ReportFormat)
  format!: ReportFormat;

  @ApiProperty({
    type: [String],
    enum: ReportType,
    description: "Types of data to include in report",
  })
  @IsEnum(ReportType, { each: true })
  reportTypes!: ReportType[];

  @ApiProperty({ type: ReportFiltersDto, required: false })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ReportFiltersDto)
  filters?: ReportFiltersDto;

  @ApiProperty({
    required: false,
    default: false,
    description: "Include AI-generated summary in the report",
  })
  @IsOptional()
  @IsBoolean()
  includeAISummary?: boolean;
}
