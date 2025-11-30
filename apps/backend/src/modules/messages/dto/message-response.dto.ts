import { ApiProperty } from "@nestjs/swagger";

export class MessageSenderDto {
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

export class MessageReceiverDto {
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

export class MessageResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  senderId!: string;

  @ApiProperty()
  receiverId!: string;

  @ApiProperty()
  content!: string;

  @ApiProperty()
  read!: boolean;

  @ApiProperty({ required: false })
  readAt?: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty({ type: MessageSenderDto })
  sender!: MessageSenderDto;

  @ApiProperty({ type: MessageReceiverDto })
  receiver!: MessageReceiverDto;
}
