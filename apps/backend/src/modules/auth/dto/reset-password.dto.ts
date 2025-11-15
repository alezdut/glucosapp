import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MinLength } from "class-validator";

/**
 * DTO for reset password request
 */
export class ResetPasswordDto {
  @ApiProperty({ example: "abc123def456" })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ example: "NewSecurePass123!", minLength: 8 })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  newPassword!: string;
}
