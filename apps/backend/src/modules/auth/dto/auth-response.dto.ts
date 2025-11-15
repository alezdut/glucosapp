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
  firstName?: string;

  @ApiProperty({ required: false })
  lastName?: string;

  @ApiProperty({ required: false })
  avatarUrl?: string;

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
