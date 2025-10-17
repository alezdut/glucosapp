import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { ProfileResponseDto } from "./dto/profile-response.dto";

/**
 * Service handling profile operations
 */
@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get user profile
   */
  async getProfile(userId: string): Promise<ProfileResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        emailVerified: true,
        birthDate: true,
        weight: true,
        diabetesType: true,
        glucoseUnit: true,
        theme: true,
        language: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    return {
      ...user,
      firstName: user.firstName ?? undefined,
      lastName: user.lastName ?? undefined,
      avatarUrl: user.avatarUrl ?? undefined,
      birthDate: user.birthDate?.toISOString(),
      weight: user.weight ?? undefined,
      diabetesType: user.diabetesType ?? undefined,
      createdAt: user.createdAt.toISOString(),
    };
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, data: UpdateProfileDto): Promise<ProfileResponseDto> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
        weight: data.weight,
        diabetesType: data.diabetesType,
        glucoseUnit: data.glucoseUnit,
        theme: data.theme,
        language: data.language,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        emailVerified: true,
        birthDate: true,
        weight: true,
        diabetesType: true,
        glucoseUnit: true,
        theme: true,
        language: true,
        createdAt: true,
      },
    });

    return {
      ...user,
      firstName: user.firstName ?? undefined,
      lastName: user.lastName ?? undefined,
      avatarUrl: user.avatarUrl ?? undefined,
      birthDate: user.birthDate?.toISOString(),
      weight: user.weight ?? undefined,
      diabetesType: user.diabetesType ?? undefined,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
