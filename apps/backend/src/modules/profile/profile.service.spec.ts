import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../../prisma/prisma.service";
import { ProfileService } from "./profile.service";
import { createMockPrismaService } from "../../common/test-helpers/prisma.mock";
import { createMockUser } from "../../common/test-helpers/fixtures";

describe("ProfileService", () => {
  let service: ProfileService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const mockPrisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getProfile", () => {
    const userId = "user-123";

    it("should return user profile", async () => {
      const user = createMockUser({
        id: userId,
        birthDate: new Date("1990-01-01"),
        weight: 70,
        targetGlucose: 100,
        minTargetGlucose: 80,
        maxTargetGlucose: 120,
        createdAt: new Date("2024-01-01"),
      });

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(user);

      const result = await service.getProfile(userId);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: expect.any(Object),
      });
      expect(result).toMatchObject({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      });
      expect(result.birthDate).toBe(user.birthDate?.toISOString());
      expect(result.createdAt).toBe(user.createdAt.toISOString());
    });

    it("should handle null optional fields", async () => {
      const user = createMockUser({
        id: userId,
        firstName: null,
        lastName: null,
        avatarUrl: null,
        birthDate: null,
        weight: null,
        targetGlucose: null,
        createdAt: new Date("2024-01-01"),
      });

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(user);

      const result = await service.getProfile(userId);

      expect(result.firstName).toBeUndefined();
      expect(result.lastName).toBeUndefined();
      expect(result.avatarUrl).toBeUndefined();
      expect(result.birthDate).toBeUndefined();
      expect(result.weight).toBeUndefined();
      expect(result.targetGlucose).toBeUndefined();
    });

    it("should throw error if user not found", async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getProfile(userId)).rejects.toThrow("User not found");
    });
  });

  describe("updateProfile", () => {
    const userId = "user-123";
    const updateDto = {
      weight: 75,
      targetGlucose: 110,
      minTargetGlucose: 90,
      maxTargetGlucose: 130,
    };

    it("should update user profile", async () => {
      const updatedUser = createMockUser({
        id: userId,
        ...updateDto,
        createdAt: new Date("2024-01-01"),
      });

      (prismaService.user.update as jest.Mock).mockResolvedValue(updatedUser);

      const result = await service.updateProfile(userId, updateDto);

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: expect.objectContaining(updateDto),
        select: expect.any(Object),
      });
      expect(result).toMatchObject({
        id: userId,
        weight: updateDto.weight,
        targetGlucose: updateDto.targetGlucose,
      });
    });

    it("should handle birthDate conversion", async () => {
      const birthDate = "1990-01-01";
      const updatedUser = createMockUser({
        id: userId,
        birthDate: new Date(birthDate),
        createdAt: new Date("2024-01-01"),
      });

      (prismaService.user.update as jest.Mock).mockResolvedValue(updatedUser);

      const result = await service.updateProfile(userId, {
        ...updateDto,
        birthDate,
      });

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: expect.objectContaining({
          birthDate: new Date(birthDate),
        }),
        select: expect.any(Object),
      });
      expect(result.birthDate).toBe(updatedUser.birthDate?.toISOString());
    });

    it("should handle partial updates", async () => {
      const updatedUser = createMockUser({
        id: userId,
        weight: 75,
        createdAt: new Date("2024-01-01"),
      });

      (prismaService.user.update as jest.Mock).mockResolvedValue(updatedUser);

      await service.updateProfile(userId, { weight: 75 });

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: expect.objectContaining({
          weight: 75,
        }),
        select: expect.any(Object),
      });
    });
  });

  describe("getAssignedDoctor", () => {
    const userId = "user-123";

    it("should return assigned doctor if exists", async () => {
      const doctor = createMockUser({
        id: "doctor-123",
        email: "doctor@example.com",
        firstName: "Doctor",
        lastName: "Smith",
      });

      const relation = {
        id: "relation-123",
        doctorId: doctor.id,
        patientId: userId,
        createdAt: new Date("2024-01-01"),
        doctor,
      };

      (prismaService.doctorPatient.findFirst as jest.Mock).mockResolvedValue(relation);

      const result = await service.getAssignedDoctor(userId);

      expect(result).toEqual({
        id: relation.id,
        doctorId: relation.doctorId,
        patientId: relation.patientId,
        createdAt: relation.createdAt.toISOString(),
        doctor: {
          id: doctor.id,
          email: doctor.email,
          firstName: doctor.firstName ?? undefined,
          lastName: doctor.lastName ?? undefined,
          avatarUrl: doctor.avatarUrl ?? undefined,
        },
      });
    });

    it("should return null if no doctor assigned", async () => {
      (prismaService.doctorPatient.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.getAssignedDoctor(userId);

      expect(result).toBeNull();
    });
  });
});
