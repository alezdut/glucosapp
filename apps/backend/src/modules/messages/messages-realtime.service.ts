import { Injectable, Logger } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { MessageResponseDto } from "./dto/message-response.dto";
import { MessagesService } from "./messages.service";
import { AuthService } from "../auth/services/auth.service";
import { RealtimeNotificationsService } from "../notifications/realtime-notifications.service";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class MessagesRealtimeService {
  private readonly logger = new Logger(MessagesRealtimeService.name);

  constructor(
    private readonly messagesService: MessagesService,
    private readonly authService: AuthService,
    private readonly realtimeNotifications: RealtimeNotificationsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async emitMessageCreated(message: MessageResponseDto): Promise<void> {
    this.realtimeNotifications.emitToUser(message.senderId, "message:new", message);
    this.realtimeNotifications.emitToUser(message.receiverId, "message:new", message);

    const senderName =
      `${message.sender.firstName || ""} ${message.sender.lastName || ""}`.trim() ||
      message.sender.email;

    await this.notificationsService.sendToUser(
      message.receiverId,
      this.notificationsService.createMessagePayload({
        messageId: message.id,
        senderName,
        body: message.content,
        doctorId: (await this.resolveDoctorId(message)) ?? message.receiverId,
      }),
    );

    await this.emitConversationUpdates(message.senderId);
    await this.emitConversationUpdates(message.receiverId);
  }

  private async emitConversationUpdates(userId: string): Promise<void> {
    try {
      const user = await this.authService.getUserById(userId);
      if (!user || user.role !== UserRole.DOCTOR) {
        return;
      }

      const conversations = await this.messagesService.getConversations(userId);
      this.realtimeNotifications.emitToUser(userId, "conversation:updated", conversations);
    } catch (error) {
      this.logger.warn(
        `Could not update conversations for ${userId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async resolveDoctorId(message: MessageResponseDto): Promise<string | undefined> {
    try {
      const sender = await this.authService.getUserById(message.senderId);
      if (sender?.role === UserRole.DOCTOR) {
        return message.senderId;
      }

      const receiver = await this.authService.getUserById(message.receiverId);
      if (receiver?.role === UserRole.DOCTOR) {
        return message.receiverId;
      }
    } catch (error) {
      this.logger.warn(
        `Could not resolve doctor for message ${message.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return undefined;
  }
}
