import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty, MaxLength, MinLength } from "class-validator";
import { Transform } from "class-transformer";

export class CreateMessageDto {
  @ApiProperty({ description: "ID of the message receiver" })
  @IsString()
  @IsNotEmpty()
  receiverId!: string;

  @ApiProperty({ description: "Message content", maxLength: 5000 })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: "Message content cannot be empty" })
  @MinLength(1, { message: "Message content cannot be empty" })
  @MaxLength(5000, { message: "Message content cannot exceed 5000 characters" })
  content!: string;
}
