import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { UserRole } from "@prisma/client";
import { DoctorUtilsService } from "../../common/services/doctor-utils.service";
import { CreateMessageDto } from "./dto/create-message.dto";
import {
  MessageResponseDto,
  MessageSenderDto,
  MessageReceiverDto,
} from "./dto/message-response.dto";
import {
  ConversationResponseDto,
  ConversationParticipantDto,
} from "./dto/conversation-response.dto";

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly doctorUtils: DoctorUtilsService,
  ) {}

  /**
   * Verify that two users have a doctor-patient relationship
   */
  private async verifyDoctorPatientRelationship(
    userId1: string,
    userId2: string,
  ): Promise<boolean> {
    const relation = await this.prisma.doctorPatient.findFirst({
      where: {
        OR: [
          { doctorId: userId1, patientId: userId2 },
          { doctorId: userId2, patientId: userId1 },
        ],
      },
    });

    return !!relation;
  }

  /**
   * Get user role
   */
  private async getUserRole(userId: string): Promise<UserRole> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user.role;
  }

  /**
   * Send a message
   */
  async sendMessage(senderId: string, createDto: CreateMessageDto): Promise<MessageResponseDto> {
    const { receiverId, content } = createDto;

    // Verify receiver exists
    const receiver = await this.prisma.user.findUnique({
      where: { id: receiverId },
      select: { id: true, role: true },
    });

    if (!receiver) {
      throw new NotFoundException("Receiver not found");
    }

    // Verify sender exists and get role
    const senderRole = await this.getUserRole(senderId);
    const receiverRole = receiver.role;

    // Verify doctor-patient relationship
    const hasRelationship = await this.verifyDoctorPatientRelationship(senderId, receiverId);

    if (!hasRelationship) {
      throw new ForbiddenException(
        "You can only send messages to users with whom you have a doctor-patient relationship",
      );
    }

    // Additional validation: Patients can only send to their assigned doctor
    if (senderRole === UserRole.PATIENT && receiverRole !== UserRole.DOCTOR) {
      throw new ForbiddenException("Patients can only send messages to their assigned doctor");
    }

    // Additional validation: Doctors can only send to their assigned patients
    if (senderRole === UserRole.DOCTOR && receiverRole !== UserRole.PATIENT) {
      throw new ForbiddenException("Doctors can only send messages to their assigned patients");
    }

    // Create message
    const message = await this.prisma.message.create({
      data: {
        senderId,
        receiverId,
        content: content.trim(),
      },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        receiver: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    return this.mapMessageToDto(message);
  }

  /**
   * Get conversation between current user and another user
   * For patients: returns conversation with their assigned doctor (1:1 relationship)
   * For doctors: returns conversation with a specific patient
   */
  async getConversation(userId: string, otherUserId?: string): Promise<MessageResponseDto[]> {
    const userRole = await this.getUserRole(userId);

    let targetUserId: string;

    if (userRole === UserRole.PATIENT) {
      // Patients have a 1:1 relationship with their doctor
      // Get the assigned doctor for this patient
      const relation = await this.prisma.doctorPatient.findUnique({
        where: { patientId: userId },
        select: { doctorId: true },
      });

      if (!relation) {
        return [];
      }

      targetUserId = relation.doctorId;
    } else {
      // Doctors need to specify which patient
      if (!otherUserId) {
        throw new BadRequestException("Patient ID is required for doctors");
      }

      // Verify relationship
      const hasRelationship = await this.verifyDoctorPatientRelationship(userId, otherUserId);
      if (!hasRelationship) {
        throw new ForbiddenException("You can only view conversations with your assigned patients");
      }

      targetUserId = otherUserId;
    }

    // Get all messages between the two users
    const messages = await this.prisma.message.findMany({
      where: {
        OR: [
          {
            AND: [{ senderId: userId }, { receiverId: targetUserId }],
          },
          {
            AND: [{ senderId: targetUserId }, { receiverId: userId }],
          },
        ],
      },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        receiver: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Warn if no messages from target user found (potential issue)
    const messagesFromTarget = messages.filter((msg) => msg.senderId === targetUserId);
    if (messagesFromTarget.length === 0 && messages.length > 0) {
      this.logger.warn(`No messages from target user found`, {
        userId,
        targetUserId,
        totalMessages: messages.length,
      });
    }

    return messages.map((msg) => this.mapMessageToDto(msg));
  }

  /**
   * Get all conversations for a doctor (list of patients with messages)
   */
  async getConversations(userId: string): Promise<ConversationResponseDto[]> {
    const userRole = await this.getUserRole(userId);

    if (userRole !== UserRole.DOCTOR) {
      throw new ForbiddenException("Only doctors can view all conversations");
    }

    // Get all patients assigned to this doctor
    const relations = await this.prisma.doctorPatient.findMany({
      where: { doctorId: userId },
      include: {
        patient: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Get all patient IDs for batch operations
    const patientIds = relations.map((relation) => relation.patientId);

    // Batch query for unread counts - group by senderId (patientId) and count unread messages
    const unreadCounts = await this.prisma.message.groupBy({
      by: ["senderId"],
      where: {
        senderId: { in: patientIds },
        receiverId: userId,
        read: false,
      },
      _count: {
        id: true,
      },
    });

    // Create a lookup map for unread counts
    const unreadCountMap = new Map<string, number>();
    unreadCounts.forEach((count) => {
      unreadCountMap.set(count.senderId, count._count.id);
    });

    // Batch query for all messages in all conversations
    const allMessages = await this.prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: { in: patientIds } },
          { senderId: { in: patientIds }, receiverId: userId },
        ],
      },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        receiver: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc", // Most recent first for easier latest message extraction
      },
    });

    // Create lookup maps for latest messages per conversation
    const latestMessageMap = new Map<string, (typeof allMessages)[0]>();
    const allMessagesMap = new Map<string, (typeof allMessages)[0][]>();

    allMessages.forEach((message) => {
      // Determine the patient ID for this conversation
      const patientId = message.senderId === userId ? message.receiverId : message.senderId;
      const conversationKey = `${userId}-${patientId}`;

      // Collect all messages for this conversation
      if (!allMessagesMap.has(conversationKey)) {
        allMessagesMap.set(conversationKey, []);
      }
      allMessagesMap.get(conversationKey)!.push(message);

      // Track the latest message (first in descending order)
      if (!latestMessageMap.has(conversationKey)) {
        latestMessageMap.set(conversationKey, message);
      }
    });

    // Build conversations using in-memory operations
    const conversations = relations.map((relation) => {
      const patientId = relation.patientId;
      const conversationKey = `${userId}-${patientId}`;

      const messages = allMessagesMap.get(conversationKey) || [];
      const latestMessage = latestMessageMap.get(conversationKey);
      const unreadCount = unreadCountMap.get(patientId) || 0;

      return {
        participant: {
          id: relation.patient.id,
          email: relation.patient.email,
          firstName: relation.patient.firstName ?? undefined,
          lastName: relation.patient.lastName ?? undefined,
          avatarUrl: relation.patient.avatarUrl ?? undefined,
        },
        messages: messages
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()) // Sort ascending for display
          .map((msg) => this.mapMessageToDto(msg)),
        unreadCount,
        lastMessageAt: latestMessage ? latestMessage.createdAt.toISOString() : undefined,
      };
    });

    // Sort by last message time (most recent first)
    return conversations.sort((a, b) => {
      if (!a.lastMessageAt && !b.lastMessageAt) return 0;
      if (!a.lastMessageAt) return 1;
      if (!b.lastMessageAt) return -1;
      return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
    });
  }

  /**
   * Mark a message as read
   */
  async markAsRead(userId: string, messageId: string): Promise<MessageResponseDto> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        receiver: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!message) {
      throw new NotFoundException("Message not found");
    }

    // Verify that the user is the receiver
    if (message.receiverId !== userId) {
      throw new ForbiddenException("You can only mark your own received messages as read");
    }

    // Update message
    const updatedMessage = await this.prisma.message.update({
      where: { id: messageId },
      data: {
        read: true,
        readAt: new Date(),
      },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        receiver: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    return this.mapMessageToDto(updatedMessage);
  }

  /**
   * Mark multiple messages as read (batch operation)
   */
  async markAsReadBatch(
    userId: string,
    messageIds: string[],
  ): Promise<{ count: number; messageIds: string[] }> {
    if (messageIds.length === 0) {
      return { count: 0, messageIds: [] };
    }

    // Verify all messages belong to the user and are unread
    const messages = await this.prisma.message.findMany({
      where: {
        id: { in: messageIds },
        receiverId: userId,
        read: false,
      },
      select: { id: true },
    });

    if (messages.length === 0) {
      return { count: 0, messageIds: [] };
    }

    const validMessageIds = messages.map((m) => m.id);

    // Update all messages in a single transaction
    await this.prisma.message.updateMany({
      where: {
        id: { in: validMessageIds },
        receiverId: userId,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    return {
      count: validMessageIds.length,
      messageIds: validMessageIds,
    };
  }

  /**
   * Get unread messages count
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.message.count({
      where: {
        receiverId: userId,
        read: false,
      },
    });
  }

  /**
   * Map Prisma message to DTO
   */
  private mapMessageToDto(message: {
    id: string;
    senderId: string;
    receiverId: string;
    content: string;
    read: boolean;
    readAt: Date | null;
    createdAt: Date;
    sender: {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
      avatarUrl: string | null;
    };
    receiver: {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
      avatarUrl: string | null;
    };
  }): MessageResponseDto {
    return {
      id: message.id,
      senderId: message.senderId,
      receiverId: message.receiverId,
      content: message.content,
      read: message.read,
      readAt: message.readAt ? message.readAt.toISOString() : undefined,
      createdAt: message.createdAt.toISOString(),
      sender: {
        id: message.sender.id,
        email: message.sender.email,
        firstName: message.sender.firstName ?? undefined,
        lastName: message.sender.lastName ?? undefined,
        avatarUrl: message.sender.avatarUrl ?? undefined,
      },
      receiver: {
        id: message.receiver.id,
        email: message.receiver.email,
        firstName: message.receiver.firstName ?? undefined,
        lastName: message.receiver.lastName ?? undefined,
        avatarUrl: message.receiver.avatarUrl ?? undefined,
      },
    };
  }
}
