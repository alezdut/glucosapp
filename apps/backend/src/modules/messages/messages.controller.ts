import { Controller, Post, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { MessagesService } from "./messages.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthUser } from "../auth/decorators/auth-user.decorator";
import { UserResponseDto } from "../auth/dto/auth-response.dto";
import { BatchMarkReadDto } from "./dto/batch-mark-read.dto";

/**
 * REST Controller for messages operations
 */
@ApiTags("messages")
@Controller({ path: "messages", version: "1" })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  /**
   * Mark multiple messages as read (batch operation)
   */
  @Post("mark-read-batch")
  @ApiOperation({ summary: "Mark multiple messages as read" })
  @ApiResponse({
    status: 200,
    description: "Messages marked as read successfully",
    schema: {
      type: "object",
      properties: {
        count: { type: "number" },
        messageIds: { type: "array", items: { type: "string" } },
      },
    },
  })
  @ApiResponse({ status: 400, description: "Invalid input data" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  async markAsReadBatch(
    @AuthUser() user: UserResponseDto,
    @Body() batchDto: BatchMarkReadDto,
  ): Promise<{ count: number; messageIds: string[] }> {
    return this.messagesService.markAsReadBatch(user.id, batchDto.messageIds);
  }
}
