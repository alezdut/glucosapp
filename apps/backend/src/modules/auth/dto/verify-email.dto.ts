import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

/**
 * DTO for email verification
 */
export class VerifyEmailDto {
  @ApiProperty({ example: "abc123def456" })
  @IsString()
  @IsNotEmpty()
  token!: string;
}
