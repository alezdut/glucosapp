import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, IsEnum, IsBoolean, IsDateString } from "class-validator";
import { Transform } from "class-transformer";
import { DiabetesType } from "@prisma/client";

export class GetPatientsQueryDto {
  @ApiProperty({
    required: false,
    description: "Search by name (local search, only assigned patients)",
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ enum: DiabetesType, required: false, description: "Filter by diabetes type" })
  @IsOptional()
  @IsEnum(DiabetesType)
  diabetesType?: DiabetesType;

  @ApiProperty({ required: false, description: "Only show patients with activity in last 30 days" })
  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true)
  @IsBoolean()
  activeOnly?: boolean;

  @ApiProperty({ required: false, description: "Filter by registration date (ISO string)" })
  @IsOptional()
  @IsDateString()
  registrationDate?: string;

  @ApiProperty({
    enum: ["Riesgo", "Estable"],
    required: false,
    description: "Filter by clinical status",
  })
  @IsOptional()
  @IsEnum(["Riesgo", "Estable"])
  clinicalStatus?: "Riesgo" | "Estable";

  @ApiProperty({
    enum: ["Activo", "Inactivo"],
    required: false,
    description: "Filter by activity status",
  })
  @IsOptional()
  @IsEnum(["Activo", "Inactivo"])
  activityStatus?: "Activo" | "Inactivo";

  @ApiProperty({
    required: false,
    description: "Filter by age range (e.g., '18-30', '31-50', '51-70', '70+')",
  })
  @IsOptional()
  @IsString()
  ageRange?: string;

  @ApiProperty({
    required: false,
    description: "Filter by weight range (e.g., '<60', '60-80', '80-100', '100+')",
  })
  @IsOptional()
  @IsString()
  weightRange?: string;
}
