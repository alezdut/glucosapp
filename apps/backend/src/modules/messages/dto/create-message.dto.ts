import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsNotEmpty, IsString, MaxLength } from "class-validator";

export class CreateMessageDto {
  @ApiProperty({ description: "ID of the message receiver" })
  @IsString()
  @IsNotEmpty()
  receiverId!: string;

  @ApiProperty({ description: "Message content", maxLength: 5000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000, { message: "Message content cannot exceed 5000 characters" })
  content!: string;

  @ApiProperty({ description: "Client-generated idempotency key for the message" })
  @IsString()
  @IsNotEmpty()
  clientMessageId!: string;

  @ApiProperty({ description: "Client timestamp when the message was created", required: false })
  @IsDateString()
  @IsNotEmpty()
  createdAtClient!: string;
}
