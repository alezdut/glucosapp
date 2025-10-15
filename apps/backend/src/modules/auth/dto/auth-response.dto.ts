import { ApiProperty } from "@nestjs/swagger";

/**
 * User data returned in auth responses
 */
export class UserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty()
  emailVerified!: boolean;

  @ApiProperty()
  createdAt!: string;
}

/**
 * DTO for authentication response with tokens
 */
export class AuthResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;
}
