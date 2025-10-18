import { ApiProperty } from "@nestjs/swagger";

/**
 * DTO for profile response
 */
export class ProfileResponseDto {
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

  @ApiProperty({ required: false, type: String, format: "date-time" })
  birthDate?: string;

  @ApiProperty({ required: false })
  weight?: number;

  @ApiProperty({ required: false })
  diabetesType?: string;

  @ApiProperty()
  glucoseUnit!: string;

  @ApiProperty()
  theme!: string;

  @ApiProperty()
  language!: string;

  @ApiProperty()
  createdAt!: string;
}
