import { Injectable, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { UserRole } from "@prisma/client";

/**
 * Shared service for doctor-related utilities
 */
@Injectable()
export class DoctorUtilsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Verifies that the user is a doctor
   * @throws ForbiddenException if user is not a doctor
   */
  async verifyDoctor(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || user.role !== UserRole.DOCTOR) {
      throw new ForbiddenException("Only doctors can access this endpoint");
    }
  }

  /**
   * Get all patient IDs for a doctor
   */
  async getDoctorPatientIds(doctorId: string): Promise<string[]> {
    const relations = await this.prisma.doctorPatient.findMany({
      where: { doctorId },
      select: { patientId: true },
    });
    return relations.map((r) => r.patientId);
  }
}
