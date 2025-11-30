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
   * For patients: returns conversation with their doctor
   * For doctors: returns conversation with a specific patient
   */
  async getConversation(userId: string, otherUserId?: string): Promise<MessageResponseDto[]> {
    const userRole = await this.getUserRole(userId);

    let targetUserId: string;

    if (userRole === UserRole.PATIENT) {
      // Patients can see conversation with any doctor they have a relationship with
      // Get all doctor-patient relationships for this patient
      const relations = await this.prisma.doctorPatient.findMany({
        where: { patientId: userId },
        orderBy: { createdAt: "desc" },
        select: { doctorId: true },
      });

      if (relations.length === 0) {
        this.logger.warn(
          "🔍 [BACKEND] MessagesService.getConversation - No doctor-patient relation found",
          {
            userId,
            userRole,
          },
        );
        return [];
      }

      // For patients, we need to get messages with ALL their assigned doctors
      // We'll handle this differently - get all messages where patient is involved
      // and the other user is one of their assigned doctors
      const doctorIds = relations.map((r) => r.doctorId);

      // Get all messages where patient is sender or receiver, and the other user is one of their doctors
      const messages = await this.prisma.message.findMany({
        where: {
          OR: [
            // Messages where patient is sender and receiver is one of their doctors
            {
              AND: [{ senderId: userId }, { receiverId: { in: doctorIds } }],
            },
            // Messages where patient is receiver and sender is one of their doctors
            {
              AND: [{ receiverId: userId }, { senderId: { in: doctorIds } }],
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

      return messages.map((msg) => this.mapMessageToDto(msg));
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

    // For each patient, get the conversation and unread count
    const conversations = await Promise.all(
      relations.map(async (relation) => {
        const patientId = relation.patientId;

        // Get all messages with this patient
        const messages = await this.prisma.message.findMany({
          where: {
            OR: [
              { senderId: userId, receiverId: patientId },
              { senderId: patientId, receiverId: userId },
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

        // Count unread messages (messages sent by patient to doctor that are not read)
        const unreadCount = await this.prisma.message.count({
          where: {
            senderId: patientId,
            receiverId: userId,
            read: false,
          },
        });

        // Get last message timestamp
        const lastMessage = messages[messages.length - 1];

        return {
          participant: {
            id: relation.patient.id,
            email: relation.patient.email,
            firstName: relation.patient.firstName ?? undefined,
            lastName: relation.patient.lastName ?? undefined,
            avatarUrl: relation.patient.avatarUrl ?? undefined,
          },
          messages: messages.map((msg) => this.mapMessageToDto(msg)),
          unreadCount,
          lastMessageAt: lastMessage ? lastMessage.createdAt.toISOString() : undefined,
        };
      }),
    );

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
