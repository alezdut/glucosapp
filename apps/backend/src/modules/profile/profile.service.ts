import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { ProfileResponseDto } from "./dto/profile-response.dto";
import { AssignedDoctorResponseDto } from "./dto/assigned-doctor-response.dto";

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
        icRatioBreakfast: true,
        icRatioLunch: true,
        icRatioDinner: true,
        insulinSensitivityFactor: true,
        diaHours: true,
        targetGlucose: true,
        minTargetGlucose: true,
        maxTargetGlucose: true,
        mealTimeBreakfastStart: true,
        mealTimeBreakfastEnd: true,
        mealTimeLunchStart: true,
        mealTimeLunchEnd: true,
        mealTimeDinnerStart: true,
        mealTimeDinnerEnd: true,
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
      targetGlucose: user.targetGlucose ?? undefined,
      minTargetGlucose: user.minTargetGlucose,
      maxTargetGlucose: user.maxTargetGlucose,
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
        icRatioBreakfast: data.icRatioBreakfast,
        icRatioLunch: data.icRatioLunch,
        icRatioDinner: data.icRatioDinner,
        insulinSensitivityFactor: data.insulinSensitivityFactor,
        diaHours: data.diaHours,
        targetGlucose: data.targetGlucose,
        minTargetGlucose: data.minTargetGlucose,
        maxTargetGlucose: data.maxTargetGlucose,
        mealTimeBreakfastStart: data.mealTimeBreakfastStart,
        mealTimeBreakfastEnd: data.mealTimeBreakfastEnd,
        mealTimeLunchStart: data.mealTimeLunchStart,
        mealTimeLunchEnd: data.mealTimeLunchEnd,
        mealTimeDinnerStart: data.mealTimeDinnerStart,
        mealTimeDinnerEnd: data.mealTimeDinnerEnd,
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
        icRatioBreakfast: true,
        icRatioLunch: true,
        icRatioDinner: true,
        insulinSensitivityFactor: true,
        diaHours: true,
        targetGlucose: true,
        minTargetGlucose: true,
        maxTargetGlucose: true,
        mealTimeBreakfastStart: true,
        mealTimeBreakfastEnd: true,
        mealTimeLunchStart: true,
        mealTimeLunchEnd: true,
        mealTimeDinnerStart: true,
        mealTimeDinnerEnd: true,
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
      targetGlucose: user.targetGlucose ?? undefined,
      minTargetGlucose: user.minTargetGlucose,
      maxTargetGlucose: user.maxTargetGlucose,
      createdAt: user.createdAt.toISOString(),
    };
  }

  /**
   * Get assigned doctor for patient (if any)
   */
  async getAssignedDoctor(userId: string): Promise<AssignedDoctorResponseDto | null> {
    const relation = await this.prisma.doctorPatient.findFirst({
      where: { patientId: userId },
      include: {
        doctor: {
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
        createdAt: "desc",
      },
    });

    if (!relation) {
      return null;
    }

    return {
      id: relation.id,
      doctorId: relation.doctorId,
      patientId: relation.patientId,
      createdAt: relation.createdAt.toISOString(),
      doctor: {
        id: relation.doctor.id,
        email: relation.doctor.email,
        firstName: relation.doctor.firstName ?? undefined,
        lastName: relation.doctor.lastName ?? undefined,
        avatarUrl: relation.doctor.avatarUrl ?? undefined,
      },
    };
  }
}
