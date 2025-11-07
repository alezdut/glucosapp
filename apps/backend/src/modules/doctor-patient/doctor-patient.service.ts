import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { UserRole, DiabetesType } from "@prisma/client";
import { DoctorUtilsService } from "../../common/services/doctor-utils.service";
import { EncryptionService } from "../../common/services/encryption.service";
import { CreateDoctorPatientDto } from "./dto/create-doctor-patient.dto";
import { DoctorPatientResponseDto } from "./dto/doctor-patient-response.dto";
import { PatientListItemDto } from "./dto/patient-list-item.dto";
import { GetPatientsQueryDto } from "./dto/get-patients-query.dto";
import { SearchPatientsDto } from "./dto/search-patients.dto";
import { PatientDetailsDto } from "./dto/patient-details.dto";

@Injectable()
export class DoctorPatientService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly doctorUtils: DoctorUtilsService,
    private readonly encryptionService: EncryptionService,
  ) {}

  /**
   * Get all patients for a doctor with filters and enhanced data
   */
  async getPatients(
    doctorId: string,
    filters?: GetPatientsQueryDto,
  ): Promise<PatientListItemDto[]> {
    await this.doctorUtils.verifyDoctor(doctorId);

    // Get assigned patient IDs
    const assignedPatientIds = await this.doctorUtils.getDoctorPatientIds(doctorId);

    if (assignedPatientIds.length === 0) {
      return [];
    }

    // Build where clause for patient filtering
    const where: any = {
      id: { in: assignedPatientIds },
      role: UserRole.PATIENT,
    };

    // Apply search filter (local - only assigned patients)
    if (filters?.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: "insensitive" } },
        { lastName: { contains: filters.search, mode: "insensitive" } },
        { email: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    // Apply diabetes type filter
    if (filters?.diabetesType) {
      where.diabetesType = filters.diabetesType;
    }

    // Apply registration date filter
    if (filters?.registrationDate) {
      const registrationDate = new Date(filters.registrationDate);
      where.createdAt = {
        gte: new Date(registrationDate.setHours(0, 0, 0, 0)),
        lt: new Date(registrationDate.setHours(23, 59, 59, 999)),
      };
    }

    // Get patients with basic info
    const patients = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        diabetesType: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Get patient IDs for activity check
    const patientIds = patients.map((p) => p.id);

    // Check activity if activeOnly filter is enabled
    let activePatientIds: string[] = [];
    if (filters?.activeOnly) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Check for any activity in last 30 days
      const [glucoseEntries, insulinDoses, meals] = await Promise.all([
        this.prisma.glucoseEntry.findMany({
          where: {
            userId: { in: patientIds },
            recordedAt: { gte: thirtyDaysAgo },
          },
          select: { userId: true },
        }),
        this.prisma.insulinDose.findMany({
          where: {
            userId: { in: patientIds },
            recordedAt: { gte: thirtyDaysAgo },
          },
          select: { userId: true },
        }),
        this.prisma.meal.findMany({
          where: {
            userId: { in: patientIds },
            createdAt: { gte: thirtyDaysAgo },
          },
          select: { userId: true },
        }),
      ]);

      const allActiveIds = new Set<string>();
      glucoseEntries.forEach((e) => allActiveIds.add(e.userId));
      insulinDoses.forEach((d) => allActiveIds.add(d.userId));
      meals.forEach((m) => allActiveIds.add(m.userId));

      activePatientIds = Array.from(allActiveIds);
    }

    // Build result with enhanced data
    const result: PatientListItemDto[] = [];

    for (const patient of patients) {
      // Skip if activeOnly filter is enabled and patient is not active
      if (filters?.activeOnly && !activePatientIds.includes(patient.id)) {
        continue;
      }

      // Get last glucose reading (prioritize GlucoseEntry)
      const lastGlucoseEntry = await this.prisma.glucoseEntry.findFirst({
        where: { userId: patient.id },
        orderBy: { recordedAt: "desc" },
        select: { mgdl: true, recordedAt: true },
      });

      let lastGlucoseReading: { value: number; recordedAt: Date } | null = null;

      if (lastGlucoseEntry) {
        lastGlucoseReading = {
          value: lastGlucoseEntry.mgdl,
          recordedAt: lastGlucoseEntry.recordedAt,
        };
      } else {
        // Fallback to GlucoseReading if no GlucoseEntry
        const lastGlucoseReadingRecord = await this.prisma.glucoseReading.findFirst({
          where: { userId: patient.id },
          orderBy: { recordedAt: "desc" },
          select: { glucoseEncrypted: true, recordedAt: true },
        });

        if (lastGlucoseReadingRecord) {
          try {
            const glucoseValue = this.encryptionService.decryptGlucoseValue(
              lastGlucoseReadingRecord.glucoseEncrypted,
            );
            lastGlucoseReading = {
              value: glucoseValue,
              recordedAt: lastGlucoseReadingRecord.recordedAt,
            };
          } catch (error) {
            console.error(
              `[DoctorPatient] Failed to decrypt glucose reading for patient ${patient.id}:`,
              error,
            );
          }
        }
      }

      // Calculate status
      const status = await this.calculatePatientStatus(patient.id, lastGlucoseReading);

      result.push({
        id: patient.id,
        email: patient.email,
        firstName: patient.firstName || undefined,
        lastName: patient.lastName || undefined,
        avatarUrl: patient.avatarUrl || undefined,
        diabetesType: patient.diabetesType || undefined,
        lastGlucoseReading: lastGlucoseReading
          ? {
              value: lastGlucoseReading.value,
              recordedAt: lastGlucoseReading.recordedAt.toISOString(),
            }
          : undefined,
        status,
        registrationDate: patient.createdAt.toISOString(),
      });
    }

    return result;
  }

  /**
   * Search for patients globally (all patients, not just assigned)
   * Returns only patients not yet assigned to the doctor
   */
  async searchGlobalPatients(
    doctorId: string,
    searchDto: SearchPatientsDto,
  ): Promise<PatientListItemDto[]> {
    await this.doctorUtils.verifyDoctor(doctorId);

    // Get assigned patient IDs to exclude them
    const assignedPatientIds = await this.doctorUtils.getDoctorPatientIds(doctorId);

    // Build search query
    const searchTerm = searchDto.q.trim();

    const where: any = {
      role: UserRole.PATIENT,
      // Exclude already assigned patients
      ...(assignedPatientIds.length > 0 && { id: { notIn: assignedPatientIds } }),
      OR: [
        { firstName: { contains: searchTerm, mode: "insensitive" } },
        { lastName: { contains: searchTerm, mode: "insensitive" } },
        { email: { contains: searchTerm, mode: "insensitive" } },
      ],
    };

    // Get patients matching search
    const patients = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        diabetesType: true,
        createdAt: true,
      },
      take: 20, // Limit results
      orderBy: {
        createdAt: "desc",
      },
    });

    // Build result with basic info (no need for full status calculation in search)
    return patients.map((patient) => ({
      id: patient.id,
      email: patient.email,
      firstName: patient.firstName || undefined,
      lastName: patient.lastName || undefined,
      avatarUrl: patient.avatarUrl || undefined,
      diabetesType: patient.diabetesType || undefined,
      lastGlucoseReading: undefined, // Not needed for search results
      status: "Activo" as const, // Default status for search
      registrationDate: patient.createdAt.toISOString(),
    }));
  }

  /**
   * Calculate patient status based on last glucose reading and activity
   */
  private async calculatePatientStatus(
    patientId: string,
    lastGlucoseReading: { value: number; recordedAt: Date } | null,
  ): Promise<"Riesgo" | "Estable" | "Activo" | "Inactivo"> {
    // If we have a glucose reading, check for risk/stable
    if (lastGlucoseReading) {
      const glucoseValue = lastGlucoseReading.value;

      // Riesgo: < 70 or > 250 mg/dL
      if (glucoseValue < 70 || glucoseValue > 250) {
        return "Riesgo";
      }

      // Estable: between 80-140 mg/dL
      if (glucoseValue >= 80 && glucoseValue <= 140) {
        return "Estable";
      }
    }

    // Check for activity in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [hasGlucoseEntry, hasInsulinDose, hasMeal] = await Promise.all([
      this.prisma.glucoseEntry.findFirst({
        where: {
          userId: patientId,
          recordedAt: { gte: thirtyDaysAgo },
        },
        select: { id: true },
      }),
      this.prisma.insulinDose.findFirst({
        where: {
          userId: patientId,
          recordedAt: { gte: thirtyDaysAgo },
        },
        select: { id: true },
      }),
      this.prisma.meal.findFirst({
        where: {
          userId: patientId,
          createdAt: { gte: thirtyDaysAgo },
        },
        select: { id: true },
      }),
    ]);

    // Activo: has activity in last 30 days
    if (hasGlucoseEntry || hasInsulinDose || hasMeal) {
      return "Activo";
    }

    // Inactivo: no activity in last 30 days
    return "Inactivo";
  }

  /**
   * Assign a patient to a doctor
   */
  async assignPatient(
    doctorId: string,
    createDto: CreateDoctorPatientDto,
  ): Promise<DoctorPatientResponseDto> {
    await this.doctorUtils.verifyDoctor(doctorId);

    // Verify patient exists and is actually a patient
    const patient = await this.prisma.user.findUnique({
      where: { id: createDto.patientId },
      select: { id: true, role: true },
    });

    if (!patient) {
      throw new NotFoundException("Patient not found");
    }

    if (patient.role !== UserRole.PATIENT) {
      throw new ConflictException("User is not a patient");
    }

    // Check if relationship already exists
    const existing = await this.prisma.doctorPatient.findUnique({
      where: {
        doctorId_patientId: {
          doctorId,
          patientId: createDto.patientId,
        },
      },
    });

    if (existing) {
      throw new ConflictException("Patient is already assigned to this doctor");
    }

    const relation = await this.prisma.doctorPatient.create({
      data: {
        doctorId,
        patientId: createDto.patientId,
      },
      include: {
        patient: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            createdAt: true,
          },
        },
      },
    });

    return {
      id: relation.id,
      doctorId: relation.doctorId,
      patientId: relation.patientId,
      createdAt: relation.createdAt.toISOString(),
      patient: {
        id: relation.patient.id,
        email: relation.patient.email,
        firstName: relation.patient.firstName || undefined,
        lastName: relation.patient.lastName || undefined,
        avatarUrl: relation.patient.avatarUrl || undefined,
        createdAt: relation.patient.createdAt.toISOString(),
      },
    };
  }

  /**
   * Get detailed information about a specific patient
   */
  async getPatientDetails(doctorId: string, patientId: string): Promise<PatientDetailsDto> {
    await this.doctorUtils.verifyDoctor(doctorId);

    // Verify patient is assigned to this doctor
    const assignedPatientIds = await this.doctorUtils.getDoctorPatientIds(doctorId);
    if (!assignedPatientIds.includes(patientId)) {
      throw new ForbiddenException("Patient is not assigned to this doctor");
    }

    // Get patient information
    const patient = await this.prisma.user.findUnique({
      where: { id: patientId, role: UserRole.PATIENT },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        diabetesType: true,
        birthDate: true,
        weight: true,
        createdAt: true,
      },
    });

    if (!patient) {
      throw new NotFoundException("Patient not found");
    }

    // Get last glucose reading
    const lastGlucoseEntry = await this.prisma.glucoseEntry.findFirst({
      where: { userId: patientId },
      orderBy: { recordedAt: "desc" },
      select: { mgdl: true, recordedAt: true },
    });

    let lastGlucoseReading: { value: number; recordedAt: Date } | null = null;

    if (lastGlucoseEntry) {
      lastGlucoseReading = {
        value: lastGlucoseEntry.mgdl,
        recordedAt: lastGlucoseEntry.recordedAt,
      };
    } else {
      const lastGlucoseReadingRecord = await this.prisma.glucoseReading.findFirst({
        where: { userId: patientId },
        orderBy: { recordedAt: "desc" },
        select: { glucoseEncrypted: true, recordedAt: true },
      });

      if (lastGlucoseReadingRecord) {
        try {
          const glucoseValue = this.encryptionService.decryptGlucoseValue(
            lastGlucoseReadingRecord.glucoseEncrypted,
          );
          lastGlucoseReading = {
            value: glucoseValue,
            recordedAt: lastGlucoseReadingRecord.recordedAt,
          };
        } catch (error) {
          console.error(
            `[DoctorPatient] Failed to decrypt glucose reading for patient ${patientId}:`,
            error,
          );
        }
      }
    }

    // Calculate status
    const status = await this.calculatePatientStatus(patientId, lastGlucoseReading);

    // Get statistics
    const [totalGlucoseReadings, totalInsulinDoses, totalMeals, totalAlerts, unacknowledgedAlerts] =
      await Promise.all([
        this.prisma.glucoseEntry.count({ where: { userId: patientId } }),
        this.prisma.insulinDose.count({ where: { userId: patientId } }),
        this.prisma.meal.count({ where: { userId: patientId } }),
        this.prisma.alert.count({ where: { userId: patientId } }),
        this.prisma.alert.count({ where: { userId: patientId, acknowledged: false } }),
      ]);

    return {
      id: patient.id,
      email: patient.email,
      firstName: patient.firstName || undefined,
      lastName: patient.lastName || undefined,
      avatarUrl: patient.avatarUrl || undefined,
      diabetesType: patient.diabetesType || undefined,
      birthDate: patient.birthDate?.toISOString() || undefined,
      weight: patient.weight || undefined,
      lastGlucoseReading: lastGlucoseReading
        ? {
            value: lastGlucoseReading.value,
            recordedAt: lastGlucoseReading.recordedAt.toISOString(),
          }
        : undefined,
      status,
      registrationDate: patient.createdAt.toISOString(),
      totalGlucoseReadings,
      totalInsulinDoses,
      totalMeals,
      totalAlerts,
      unacknowledgedAlerts,
    };
  }

  /**
   * Remove a patient from a doctor
   */
  async removePatient(doctorId: string, patientId: string): Promise<{ message: string }> {
    await this.doctorUtils.verifyDoctor(doctorId);

    const relation = await this.prisma.doctorPatient.findUnique({
      where: {
        doctorId_patientId: {
          doctorId,
          patientId,
        },
      },
    });

    if (!relation) {
      throw new NotFoundException("Patient relationship not found");
    }

    await this.prisma.doctorPatient.delete({
      where: {
        id: relation.id,
      },
    });

    return { message: "Patient removed successfully" };
  }

  /**
   * Get meals for a specific patient with optional date range
   */
  async getPatientMeals(doctorId: string, patientId: string, startDate?: string, endDate?: string) {
    await this.doctorUtils.verifyDoctor(doctorId);

    // Verify patient is assigned to doctor
    const assignedPatientIds = await this.doctorUtils.getDoctorPatientIds(doctorId);
    if (!assignedPatientIds.includes(patientId)) {
      throw new ForbiddenException("Patient is not assigned to this doctor");
    }

    const whereClause: any = {
      userId: patientId,
      OR: [
        { mealTemplateId: { not: null } }, // Entries with meal templates
        { carbohydrates: { not: null, gt: 0 } }, // Entries with carbohydrates recorded
      ],
    };

    // Add date range filtering if provided
    if (startDate || endDate) {
      whereClause.recordedAt = {};
      if (startDate) {
        whereClause.recordedAt.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.recordedAt.lte = new Date(endDate);
      }
    }

    const logEntries = await this.prisma.logEntry.findMany({
      where: whereClause,
      include: {
        mealTemplate: {
          include: {
            foodItems: true,
          },
        },
      },
      orderBy: {
        recordedAt: "desc",
      },
    });

    return logEntries;
  }

  /**
   * Get patient profile/parameters
   */
  async getPatientProfile(doctorId: string, patientId: string) {
    await this.doctorUtils.verifyDoctor(doctorId);

    // Verify patient is assigned to doctor
    const assignedPatientIds = await this.doctorUtils.getDoctorPatientIds(doctorId);
    if (!assignedPatientIds.includes(patientId)) {
      throw new ForbiddenException("Patient is not assigned to this doctor");
    }

    const patient = await this.prisma.user.findUnique({
      where: { id: patientId, role: UserRole.PATIENT },
      select: {
        id: true,
        email: true,
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
      },
    });

    if (!patient) {
      throw new NotFoundException("Patient not found");
    }

    return {
      id: patient.id,
      email: patient.email,
      icRatioBreakfast: patient.icRatioBreakfast,
      icRatioLunch: patient.icRatioLunch,
      icRatioDinner: patient.icRatioDinner,
      insulinSensitivityFactor: patient.insulinSensitivityFactor,
      diaHours: patient.diaHours,
      targetGlucose: patient.targetGlucose || undefined,
      minTargetGlucose: patient.minTargetGlucose,
      maxTargetGlucose: patient.maxTargetGlucose,
      mealTimeBreakfastStart: patient.mealTimeBreakfastStart || undefined,
      mealTimeBreakfastEnd: patient.mealTimeBreakfastEnd || undefined,
      mealTimeLunchStart: patient.mealTimeLunchStart || undefined,
      mealTimeLunchEnd: patient.mealTimeLunchEnd || undefined,
      mealTimeDinnerStart: patient.mealTimeDinnerStart || undefined,
      mealTimeDinnerEnd: patient.mealTimeDinnerEnd || undefined,
    };
  }
}
