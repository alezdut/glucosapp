import { IsString, IsNotEmpty, IsOptional, MaxLength, MinLength } from "class-validator";
import { Transform } from "class-transformer";

/**
 * DTO for sending a message via WebSocket
 */
export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  receiverId!: string;

  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: "Message content cannot be empty" })
  @MinLength(1, { message: "Message content cannot be empty" })
  @MaxLength(5000, { message: "Message content cannot exceed 5000 characters" })
  content!: string;
}

/**
 * DTO for joining a conversation room
 */
export class JoinConversationDto {
  @IsString()
  @IsOptional()
  patientId?: string;
}

/**
 * DTO for leaving a conversation room
 */
export class LeaveConversationDto {
  @IsString()
  @IsOptional()
  patientId?: string;
}

/**
 * DTO for marking a message as read
 */
export class MarkReadDto {
  @IsString()
  @IsNotEmpty()
  messageId!: string;
}

/**
 * DTO for error responses
 */
export class ErrorResponseDto {
  message!: string;
  code?: string;
}
