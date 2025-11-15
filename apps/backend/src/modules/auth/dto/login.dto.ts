import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString } from "class-validator";

/**
 * DTO for user login with email and password
 */
export class LoginDto {
  @ApiProperty({ example: "user@example.com" })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: "SecurePass123!" })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
