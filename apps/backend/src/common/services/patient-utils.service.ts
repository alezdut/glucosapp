import { Injectable, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { UserRole } from "@prisma/client";

/**
 * Shared service for patient-related utilities
 */
@Injectable()
export class PatientUtilsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Verifies that the user is a patient
   * @throws ForbiddenException if user is not a patient
   */
  async verifyPatient(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || user.role !== UserRole.PATIENT) {
      throw new ForbiddenException("Only patients can access this endpoint");
    }
  }
}
