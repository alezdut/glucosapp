import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { UseGuards, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { MessagesService } from "./messages.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthService } from "../auth/services/auth.service";
import { WsJwtGuard } from "./guards/ws-jwt.guard";
import {
  SendMessageDto,
  JoinConversationDto,
  LeaveConversationDto,
  MarkReadDto,
} from "./dto/message-events.dto";
import { UserResponseDto } from "../auth/dto/auth-response.dto";
import { JwtPayload } from "../auth/strategies/jwt.strategy";
import { UserRole } from "@prisma/client";
import { RealtimeNotificationsService } from "../notifications/realtime-notifications.service";
import { NotificationsService } from "../notifications/notifications.service";

/**
 * Helper function to generate room name for a conversation
 * Uses consistent ordering: smaller ID first
 */
function getConversationRoom(doctorId: string, patientId: string): string {
  const ids = [doctorId, patientId].sort();
  return `conversation:${ids[0]}:${ids[1]}`;
}

/**
 * WebSocket Gateway for real-time messaging
 */
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN?.split(",") || [
      "http://localhost:3001",
      "http://localhost:8082",
    ],
    credentials: true,
  },
  namespace: "/messages",
})
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(MessagesGateway.name);

  constructor(
    private readonly messagesService: MessagesService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
    private readonly realtimeNotifications: RealtimeNotificationsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  afterInit(server: Server) {
    this.realtimeNotifications.registerServer(server);
  }

  /**
   * Handle client connection
   * Authenticates user via JWT token in query string
   */
  async handleConnection(client: Socket) {
    try {
      const handshake = client.handshake;
      const token = handshake.query?.token as string | undefined;

      if (!token) {
        this.logger.warn("Connection rejected: No token provided");
        client.disconnect();
        return;
      }

      const secret = this.configService.get<string>("JWT_ACCESS_SECRET");
      if (!secret) {
        this.logger.error("JWT_ACCESS_SECRET is not configured");
        client.disconnect();
        return;
      }

      // Verify and decode JWT
      const payload = this.jwtService.verify<JwtPayload>(token, { secret });

      // Get user from database
      const user = await this.authService.getUserById(payload.sub);
      if (!user) {
        this.logger.warn(`Connection rejected: User not found (${payload.sub})`);
        client.disconnect();
        return;
      }

      // Attach user to socket data
      client.data.user = user;
      client.data.userId = user.id;
      this.realtimeNotifications.joinUserRoom(client, user.id);

      // Log connection with socket count
      try {
        const sockets = this.server.sockets.sockets;
        const currentSockets = sockets ? Array.from(sockets.values()) : [];
        this.logger.log(
          `Client connected: ${user.id} (${user.email}) - Total sockets in namespace: ${currentSockets.length}`,
        );
      } catch (error) {
        // Log error but don't fail connection
        this.logger.warn(
          `Error getting socket count on connect: ${error instanceof Error ? error.message : String(error)}`,
        );
        this.logger.log(`Client connected: ${user.id} (${user.email})`);
      }
    } catch (error) {
      this.logger.warn(
        `Connection rejected: ${error instanceof Error ? error.message : "Invalid token"}`,
      );
      client.disconnect();
    }
  }

  /**
   * Handle client disconnection
   */
  async handleDisconnect(client: Socket) {
    const user = client.data.user as UserResponseDto | undefined;
    try {
      const sockets = this.server.sockets.sockets;
      const remainingSockets = sockets ? Array.from(sockets.values()) : [];
      if (user) {
        this.logger.log(
          `Client disconnected: ${user.id} (${user.email}) - Remaining sockets: ${remainingSockets.length}`,
        );
      } else {
        this.logger.log(
          `Client disconnected: (unauthenticated) - Remaining sockets: ${remainingSockets.length}`,
        );
      }
    } catch (error) {
      // Log error but don't throw - disconnection should always succeed
      this.logger.warn(
        `Error getting socket count on disconnect: ${error instanceof Error ? error.message : String(error)}`,
      );
      if (user) {
        this.logger.log(`Client disconnected: ${user.id} (${user.email})`);
      } else {
        this.logger.log("Client disconnected: (unauthenticated)");
      }
    }
  }

  /**
   * Send a message
   * Event: message:send
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage("message:send")
  async handleSendMessage(@ConnectedSocket() client: Socket, @MessageBody() dto: SendMessageDto) {
    const user = client.data.user as UserResponseDto;

    try {
      // Log current socket count before sending message
      try {
        const sockets = this.server.sockets.sockets;
        const socketsBefore = sockets ? Array.from(sockets.values()) : [];
        this.logger.log(
          `Sending message from ${user.id} to ${dto.receiverId} - Total sockets: ${socketsBefore.length}`,
        );
      } catch (error) {
        this.logger.log(`Sending message from ${user.id} to ${dto.receiverId}`);
      }

      // Create message using service
      const message = await this.messagesService.sendMessage(user.id, {
        receiverId: dto.receiverId,
        content: dto.content,
      });

      // Determine conversation room
      const userRole = user.role as UserRole;
      let room: string;

      if (userRole === UserRole.DOCTOR) {
        room = getConversationRoom(user.id, dto.receiverId);
      } else {
        room = getConversationRoom(dto.receiverId, user.id);
      }

      // Emit new message to room (for users currently viewing the conversation)
      this.server.to(room).emit("message:new", message);

      // Emit to both users' dedicated rooms so every active device/tab stays in sync
      this.realtimeNotifications.emitToUser(user.id, "message:new", message);
      this.realtimeNotifications.emitToUser(dto.receiverId, "message:new", message);
      const senderName =
        `${message.sender.firstName || ""} ${message.sender.lastName || ""}`.trim() ||
        message.sender.email;
      await this.notificationsService.sendToUser(
        dto.receiverId,
        this.notificationsService.createMessagePayload({
          messageId: message.id,
          senderName,
          body: message.content,
          doctorId: userRole === UserRole.DOCTOR ? user.id : dto.receiverId,
        }),
      );

      // Emit conversation list update to sender
      if (userRole === UserRole.DOCTOR) {
        const conversations = await this.messagesService.getConversations(user.id);
        this.realtimeNotifications.emitToUser(user.id, "conversation:updated", conversations);
      }

      // Also emit conversation list update to receiver (if receiver is a doctor)
      // This ensures doctors see updated conversation list when patients send messages
      try {
        const receiverUser = await this.authService.getUserById(dto.receiverId);
        if (receiverUser && receiverUser.role === UserRole.DOCTOR) {
          const receiverConversations = await this.messagesService.getConversations(dto.receiverId);
          this.realtimeNotifications.emitToUser(
            dto.receiverId,
            "conversation:updated",
            receiverConversations,
          );
        }
      } catch (error) {
        // If we can't update receiver's conversations, that's okay
        this.logger.warn(
          `Could not update receiver conversations: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      return { success: true, message };
    } catch (error) {
      this.logger.error(
        `Error sending message: ${error instanceof Error ? error.message : String(error)}`,
      );
      client.emit("error", {
        message: error instanceof Error ? error.message : "Failed to send message",
        code: "MESSAGE_SEND_ERROR",
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to send message",
      };
    }
  }

  /**
   * Join a conversation room
   * Event: conversation:join
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage("conversation:join")
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: JoinConversationDto,
  ) {
    const user = client.data.user as UserResponseDto;
    const userRole = user.role as UserRole;

    try {
      let room: string;

      if (userRole === UserRole.DOCTOR) {
        if (!dto.patientId) {
          client.emit("error", {
            message: "Patient ID is required for doctors",
            code: "PATIENT_ID_REQUIRED",
          });
          return { success: false, error: "Patient ID is required for doctors" };
        }
        room = getConversationRoom(user.id, dto.patientId);
      } else {
        // For patients, get their assigned doctor (1:1 relationship)
        const relation = await this.prisma.doctorPatient.findUnique({
          where: { patientId: user.id },
          select: { doctorId: true },
        });

        if (!relation) {
          client.emit("error", {
            message: "No assigned doctor found",
            code: "NO_DOCTOR_ASSIGNED",
          });
          return { success: false, error: "No assigned doctor found" };
        }

        // Join room with assigned doctor
        room = getConversationRoom(relation.doctorId, user.id);
      }

      await client.join(room);
      this.logger.log(`User ${user.id} joined room: ${room}`);

      // Send current conversation messages
      const messages = await this.messagesService.getConversation(
        user.id,
        userRole === UserRole.DOCTOR ? dto.patientId : undefined,
      );

      client.emit("conversation:messages", messages);

      return { success: true, room };
    } catch (error) {
      this.logger.error(
        `Error joining conversation: ${error instanceof Error ? error.message : String(error)}`,
      );
      client.emit("error", {
        message: error instanceof Error ? error.message : "Failed to join conversation",
        code: "JOIN_CONVERSATION_ERROR",
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to join conversation",
      };
    }
  }

  /**
   * Leave a conversation room
   * Event: conversation:leave
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage("conversation:leave")
  async handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: LeaveConversationDto,
  ) {
    const user = client.data.user as UserResponseDto;
    const userRole = user.role as UserRole;

    try {
      let room: string;

      if (userRole === UserRole.DOCTOR) {
        if (!dto.patientId) {
          return { success: false, error: "Patient ID is required for doctors" };
        }
        room = getConversationRoom(user.id, dto.patientId);
      } else {
        // For patients, get their assigned doctor (1:1 relationship)
        const relation = await this.prisma.doctorPatient.findUnique({
          where: { patientId: user.id },
          select: { doctorId: true },
        });

        if (!relation) {
          return { success: false, error: "No assigned doctor found" };
        }

        room = getConversationRoom(relation.doctorId, user.id);
      }

      await client.leave(room);
      this.logger.log(`User ${user.id} left room: ${room}`);

      return { success: true, room };
    } catch (error) {
      this.logger.error(
        `Error leaving conversation: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to leave conversation",
      };
    }
  }

  /**
   * Mark a message as read
   * Event: message:read
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage("message:read")
  async handleMarkAsRead(@ConnectedSocket() client: Socket, @MessageBody() dto: MarkReadDto) {
    const user = client.data.user as UserResponseDto;

    try {
      const message = await this.messagesService.markAsRead(user.id, dto.messageId);

      // Determine conversation room
      const userRole = user.role as UserRole;
      let room: string;

      if (userRole === UserRole.DOCTOR) {
        room = getConversationRoom(
          user.id,
          message.senderId === user.id ? message.receiverId : message.senderId,
        );
      } else {
        room = getConversationRoom(
          message.senderId === user.id ? message.receiverId : message.senderId,
          user.id,
        );
      }

      // Emit read status to room
      this.server.to(room).emit("message:read", {
        messageId: message.id,
        read: true,
      });

      return { success: true, message };
    } catch (error) {
      this.logger.error(
        `Error marking message as read: ${error instanceof Error ? error.message : String(error)}`,
      );
      client.emit("error", {
        message: error instanceof Error ? error.message : "Failed to mark message as read",
        code: "MARK_READ_ERROR",
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to mark message as read",
      };
    }
  }

  /**
   * Get all conversations (doctors only)
   * Event: conversation:list
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage("conversation:list")
  async handleGetConversations(@ConnectedSocket() client: Socket) {
    const user = client.data.user as UserResponseDto;
    const userRole = user.role as UserRole;

    try {
      if (userRole !== UserRole.DOCTOR) {
        client.emit("error", {
          message: "Only doctors can view all conversations",
          code: "FORBIDDEN",
        });
        return { success: false, error: "Only doctors can view all conversations" };
      }

      const conversations = await this.messagesService.getConversations(user.id);
      client.emit("conversation:updated", conversations);

      return { success: true, conversations };
    } catch (error) {
      this.logger.error(
        `Error getting conversations: ${error instanceof Error ? error.message : String(error)}`,
      );
      client.emit("error", {
        message: error instanceof Error ? error.message : "Failed to get conversations",
        code: "GET_CONVERSATIONS_ERROR",
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get conversations",
      };
    }
  }
}
