import { Test, TestingModule } from "@nestjs/testing";
import { ForbiddenException, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { MessagesService } from "./messages.service";
import { DoctorUtilsService } from "../../common/services/doctor-utils.service";
import { EncryptionService } from "../../common/services/encryption.service";
import { createMockPrismaService } from "../../common/test-helpers/prisma.mock";
import { createMockUser } from "../../common/test-helpers/fixtures";
import { UserRole } from "@prisma/client";
import { CreateMessageDto } from "./dto/create-message.dto";

describe("MessagesService", () => {
  let service: MessagesService;
  let prismaService: PrismaService;
  let doctorUtilsService: DoctorUtilsService;

  const doctorId = "doctor-123";
  const patientId = "patient-123";

  const mockDoctor = createMockUser({
    id: doctorId,
    role: UserRole.DOCTOR,
    email: "doctor@example.com",
    firstName: "Doctor",
    lastName: "Smith",
  });

  const mockPatient = createMockUser({
    id: patientId,
    role: UserRole.PATIENT,
    email: "patient@example.com",
    firstName: "Patient",
    lastName: "Doe",
  });

  const mockDoctorPatientRelation = {
    id: "relation-123",
    doctorId,
    patientId,
    createdAt: new Date("2024-01-01"),
  };

  const mockMessage = {
    id: "message-123",
    senderId: patientId,
    receiverId: doctorId,
    content: "Test message",
    read: false,
    readAt: null,
    createdAt: new Date("2024-01-01T12:00:00.000Z"),
    sender: {
      id: patientId,
      email: mockPatient.email,
      firstName: mockPatient.firstName,
      lastName: mockPatient.lastName,
      avatarUrl: mockPatient.avatarUrl,
    },
    receiver: {
      id: doctorId,
      email: mockDoctor.email,
      firstName: mockDoctor.firstName,
      lastName: mockDoctor.lastName,
      avatarUrl: mockDoctor.avatarUrl,
    },
  };

  beforeEach(async () => {
    const mockPrisma = createMockPrismaService();
    const mockDoctorUtilsService = {
      verifyDoctor: jest.fn().mockResolvedValue(undefined),
    };
    const mockEncryptionService = {
      encrypt: jest.fn().mockImplementation((text: string) => `encrypted:${text}`),
      decrypt: jest.fn().mockImplementation((text: string) => {
        // Handle both encrypted and legacy unencrypted messages
        if (text.startsWith("encrypted:")) {
          return text.replace("encrypted:", "");
        }
        return text;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: DoctorUtilsService,
          useValue: mockDoctorUtilsService,
        },
        {
          provide: EncryptionService,
          useValue: mockEncryptionService,
        },
      ],
    }).compile();

    service = module.get<MessagesService>(MessagesService);
    prismaService = module.get<PrismaService>(PrismaService);
    doctorUtilsService = module.get<DoctorUtilsService>(DoctorUtilsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("sendMessage", () => {
    const createDto: CreateMessageDto = {
      receiverId: doctorId,
      content: "Test message",
    };

    it("should send a message from patient to doctor successfully", async () => {
      (prismaService.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockPatient) // sender
        .mockResolvedValueOnce(mockDoctor); // receiver
      (prismaService.doctorPatient.findFirst as jest.Mock).mockResolvedValue(
        mockDoctorPatientRelation,
      );
      (prismaService.message.create as jest.Mock).mockResolvedValue(mockMessage);

      const result = await service.sendMessage(patientId, createDto);

      expect(result).toMatchObject({
        id: mockMessage.id,
        senderId: patientId,
        receiverId: doctorId,
        content: "Test message",
        read: false,
      });
      expect(prismaService.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            senderId: patientId,
            receiverId: doctorId,
            content: "Test message",
          },
        }),
      );
    });

    it("should send a message from doctor to patient successfully", async () => {
      const createDtoDoctor: CreateMessageDto = {
        receiverId: patientId,
        content: "Doctor's response",
      };

      (prismaService.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockDoctor) // sender
        .mockResolvedValueOnce(mockPatient); // receiver
      (prismaService.doctorPatient.findFirst as jest.Mock).mockResolvedValue(
        mockDoctorPatientRelation,
      );
      (prismaService.message.create as jest.Mock).mockResolvedValue({
        ...mockMessage,
        senderId: doctorId,
        receiverId: patientId,
        content: "Doctor's response",
        sender: {
          id: doctorId,
          email: mockDoctor.email,
          firstName: mockDoctor.firstName,
          lastName: mockDoctor.lastName,
          avatarUrl: mockDoctor.avatarUrl,
        },
        receiver: {
          id: patientId,
          email: mockPatient.email,
          firstName: mockPatient.firstName,
          lastName: mockPatient.lastName,
          avatarUrl: mockPatient.avatarUrl,
        },
      });

      const result = await service.sendMessage(doctorId, createDtoDoctor);

      expect(result.senderId).toBe(doctorId);
      expect(result.receiverId).toBe(patientId);
      expect(result.content).toBe("Doctor's response");
    });

    it("should throw NotFoundException if receiver does not exist", async () => {
      (prismaService.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockPatient) // sender
        .mockResolvedValueOnce(null); // receiver not found

      await expect(service.sendMessage(patientId, createDto)).rejects.toThrow(NotFoundException);
      expect(prismaService.message.create).not.toHaveBeenCalled();
    });

    it("should throw ForbiddenException if no doctor-patient relationship exists", async () => {
      (prismaService.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockPatient)
        .mockResolvedValueOnce(mockDoctor);
      (prismaService.doctorPatient.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.sendMessage(patientId, createDto)).rejects.toThrow(ForbiddenException);
      expect(prismaService.message.create).not.toHaveBeenCalled();
    });

    it("should throw ForbiddenException if patient tries to send to non-doctor", async () => {
      const otherPatient = createMockUser({
        id: "other-patient-123",
        role: UserRole.PATIENT,
      });
      const createDtoInvalid: CreateMessageDto = {
        receiverId: otherPatient.id,
        content: "Test message",
      };

      (prismaService.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockPatient)
        .mockResolvedValueOnce(otherPatient);
      (prismaService.doctorPatient.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.sendMessage(patientId, createDtoInvalid)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should throw ForbiddenException if doctor tries to send to non-patient", async () => {
      const otherDoctor = createMockUser({
        id: "other-doctor-123",
        role: UserRole.DOCTOR,
      });
      const createDtoInvalid: CreateMessageDto = {
        receiverId: otherDoctor.id,
        content: "Test message",
      };

      (prismaService.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockDoctor)
        .mockResolvedValueOnce(otherDoctor);
      (prismaService.doctorPatient.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.sendMessage(doctorId, createDtoInvalid)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should trim message content", async () => {
      const createDtoWithSpaces: CreateMessageDto = {
        receiverId: doctorId,
        content: "  Test message with spaces  ",
      };

      (prismaService.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockPatient)
        .mockResolvedValueOnce(mockDoctor);
      (prismaService.doctorPatient.findFirst as jest.Mock).mockResolvedValue(
        mockDoctorPatientRelation,
      );
      (prismaService.message.create as jest.Mock).mockResolvedValue({
        ...mockMessage,
        content: "Test message with spaces",
      });

      await service.sendMessage(patientId, createDtoWithSpaces);

      expect(prismaService.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            content: "Test message with spaces",
          }),
        }),
      );
    });
  });

  describe("getConversation", () => {
    it("should get conversation for patient with their doctor", async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockPatient);
      (prismaService.doctorPatient.findUnique as jest.Mock).mockResolvedValue(
        mockDoctorPatientRelation,
      );
      (prismaService.message.findMany as jest.Mock).mockResolvedValue([mockMessage]);

      const result = await service.getConversation(patientId);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: mockMessage.id,
        senderId: patientId,
        receiverId: doctorId,
      });
      expect(prismaService.doctorPatient.findUnique).toHaveBeenCalledWith({
        where: { patientId },
        select: { doctorId: true },
      });
    });

    it("should return empty array if patient has no doctor", async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockPatient);
      (prismaService.doctorPatient.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getConversation(patientId);

      expect(result).toEqual([]);
    });

    it("should get conversation for doctor with specific patient", async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockDoctor);
      (prismaService.doctorPatient.findFirst as jest.Mock).mockResolvedValue(
        mockDoctorPatientRelation,
      );
      (prismaService.message.findMany as jest.Mock).mockResolvedValue([mockMessage]);

      const result = await service.getConversation(doctorId, patientId);

      expect(result).toHaveLength(1);
      expect(prismaService.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { AND: [{ senderId: doctorId }, { receiverId: patientId }] },
              { AND: [{ senderId: patientId }, { receiverId: doctorId }] },
            ],
          },
        }),
      );
    });

    it("should throw BadRequestException if doctor does not provide patientId", async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockDoctor);

      await expect(service.getConversation(doctorId)).rejects.toThrow(BadRequestException);
    });

    it("should throw ForbiddenException if doctor tries to access non-assigned patient", async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockDoctor);
      (prismaService.doctorPatient.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.getConversation(doctorId, "other-patient-123")).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("getConversations", () => {
    it("should get all conversations for doctor", async () => {
      const mockConversations = [
        {
          ...mockDoctorPatientRelation,
          patient: {
            id: patientId,
            email: mockPatient.email,
            firstName: mockPatient.firstName,
            lastName: mockPatient.lastName,
            avatarUrl: mockPatient.avatarUrl,
          },
        },
      ];

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockDoctor);
      (prismaService.doctorPatient.findMany as jest.Mock).mockResolvedValue(mockConversations);
      (prismaService.message.groupBy as jest.Mock).mockResolvedValue([
        { senderId: patientId, _count: { id: 1 } },
      ]);
      (prismaService.message.findMany as jest.Mock).mockResolvedValue([mockMessage]);

      const result = await service.getConversations(doctorId);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        participant: {
          id: patientId,
          email: mockPatient.email,
        },
        unreadCount: 1,
      });
    });

    it("should throw ForbiddenException if non-doctor tries to get conversations", async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockPatient);

      await expect(service.getConversations(patientId)).rejects.toThrow(ForbiddenException);
    });

    it("should sort conversations by last message time", async () => {
      const patient2Id = "patient-456";
      const mockPatient2 = createMockUser({
        id: patient2Id,
        role: UserRole.PATIENT,
        email: "patient2@example.com",
      });

      const mockConversations = [
        {
          ...mockDoctorPatientRelation,
          patient: {
            id: patientId,
            email: mockPatient.email,
            firstName: mockPatient.firstName,
            lastName: mockPatient.lastName,
            avatarUrl: mockPatient.avatarUrl,
          },
        },
        {
          id: "relation-456",
          doctorId,
          patientId: patient2Id,
          createdAt: new Date("2024-01-01"),
          patient: {
            id: patient2Id,
            email: mockPatient2.email,
            firstName: mockPatient2.firstName,
            lastName: mockPatient2.lastName,
            avatarUrl: mockPatient2.avatarUrl,
          },
        },
      ];

      const olderMessage = {
        ...mockMessage,
        createdAt: new Date("2024-01-01T10:00:00.000Z"),
      };
      const newerMessage = {
        ...mockMessage,
        id: "message-456",
        createdAt: new Date("2024-01-01T14:00:00.000Z"),
      };

      const olderMessageWithPatient = {
        ...olderMessage,
        senderId: patientId,
        receiverId: doctorId,
      };
      const newerMessageWithPatient = {
        ...newerMessage,
        senderId: patient2Id,
        receiverId: doctorId,
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockDoctor);
      (prismaService.doctorPatient.findMany as jest.Mock).mockResolvedValue(mockConversations);
      (prismaService.message.groupBy as jest.Mock).mockResolvedValue([
        { senderId: patientId, _count: { id: 0 } },
        { senderId: patient2Id, _count: { id: 0 } },
      ]);
      // All messages are returned in a single call, ordered by createdAt desc
      (prismaService.message.findMany as jest.Mock).mockResolvedValue([
        newerMessageWithPatient, // Newer message first (desc order)
        olderMessageWithPatient, // Older message second
      ]);

      const result = await service.getConversations(doctorId);

      expect(result).toHaveLength(2);
      // Second patient should be first (newer message)
      expect(result[0].participant.id).toBe(patient2Id);
      expect(result[1].participant.id).toBe(patientId);
    });
  });

  describe("markAsRead", () => {
    it("should mark a message as read successfully", async () => {
      const updatedMessage = {
        ...mockMessage,
        read: true,
        readAt: new Date("2024-01-01T13:00:00.000Z"),
      };

      (prismaService.message.findUnique as jest.Mock).mockResolvedValue(mockMessage);
      (prismaService.message.update as jest.Mock).mockResolvedValue(updatedMessage);

      const result = await service.markAsRead(doctorId, mockMessage.id);

      expect(result.read).toBe(true);
      expect(result.readAt).toBeDefined();
      expect(prismaService.message.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockMessage.id },
          data: {
            read: true,
            readAt: expect.any(Date),
          },
        }),
      );
    });

    it("should throw NotFoundException if message does not exist", async () => {
      (prismaService.message.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.markAsRead(doctorId, "non-existent-id")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw ForbiddenException if user tries to mark someone else's message as read", async () => {
      (prismaService.message.findUnique as jest.Mock).mockResolvedValue({
        ...mockMessage,
        receiverId: "other-user-123",
      });

      await expect(service.markAsRead(doctorId, mockMessage.id)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("getUnreadCount", () => {
    it("should return unread messages count", async () => {
      (prismaService.message.count as jest.Mock).mockResolvedValue(5);

      const result = await service.getUnreadCount(doctorId);

      expect(result).toBe(5);
      expect(prismaService.message.count).toHaveBeenCalledWith({
        where: {
          receiverId: doctorId,
          read: false,
        },
      });
    });

    it("should return 0 if no unread messages", async () => {
      (prismaService.message.count as jest.Mock).mockResolvedValue(0);

      const result = await service.getUnreadCount(doctorId);

      expect(result).toBe(0);
    });
  });
});
