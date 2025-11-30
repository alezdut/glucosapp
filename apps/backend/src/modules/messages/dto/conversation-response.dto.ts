import { ApiProperty } from "@nestjs/swagger";
import { MessageResponseDto } from "./message-response.dto";

export class ConversationParticipantDto {
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
}

export class ConversationResponseDto {
  @ApiProperty({ type: ConversationParticipantDto })
  participant!: ConversationParticipantDto;

  @ApiProperty({ type: [MessageResponseDto] })
  messages!: MessageResponseDto[];

  @ApiProperty()
  unreadCount!: number;

  @ApiProperty({ required: false })
  lastMessageAt?: string;
}
