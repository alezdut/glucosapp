import { IsArray, IsString, ArrayMinSize, ArrayMaxSize } from "class-validator";

/**
 * DTO for marking multiple messages as read
 */
export class BatchMarkReadDto {
  @IsArray()
  @ArrayMinSize(1, { message: "At least one message ID is required" })
  @ArrayMaxSize(100, { message: "Maximum 100 message IDs allowed per batch" })
  @IsString({ each: true })
  messageIds!: string[];
}
