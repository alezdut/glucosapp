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
}
