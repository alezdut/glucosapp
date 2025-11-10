import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty, MinLength } from "class-validator";

export class SearchPatientsDto {
  @ApiProperty({ description: "Search query (name, last name, or email)", example: "john" })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  q!: string;
}
