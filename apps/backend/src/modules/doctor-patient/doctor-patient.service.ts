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
import { PatientProfileDto } from "./dto/patient-profile.dto";
import type { Prisma } from "@prisma/client";

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
    const where: Prisma.UserWhereInput = {
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
        select: { mgdlEncrypted: true, recordedAt: true },
      });

      let lastGlucoseReading: { value: number; recordedAt: Date } | null = null;

      if (lastGlucoseEntry) {
        try {
          const decryptedValue = this.encryptionService.decryptGlucoseValue(
            lastGlucoseEntry.mgdlEncrypted,
          );
          lastGlucoseReading = {
            value: decryptedValue,
            recordedAt: lastGlucoseEntry.recordedAt,
          };
        } catch (error) {
          console.error(
            `[DoctorPatient] Failed to decrypt glucose entry for patient ${patient.id}:`,
            error,
          );
        }
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

      // Calculate clinical status (Riesgo/Estable) and activity status (Activo/Inactivo)
      const [clinicalStatus, activityStatus] = await Promise.all([
        this.calculatePatientClinicalStatus(patient.id),
        this.calculatePatientActivityStatus(patient.id),
      ]);

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
        status: clinicalStatus,
        activityStatus,
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

    const where: Prisma.UserWhereInput = {
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
      status: "Estable" as const, // Default clinical status for search
      activityStatus: "Inactivo" as const, // Default activity status for search
      registrationDate: patient.createdAt.toISOString(),
    }));
  }

  /**
   * Calculate patient clinical status based on glucose metrics from last 14 days
   * Risk criteria: severe hypoglycemia events, high variability, low time in range
   * If no data in 14 days, assumes stable (no evidence of risk)
   */
  private async calculatePatientClinicalStatus(patientId: string): Promise<"Riesgo" | "Estable"> {
    // Get glucose readings from the last 14 days for risk assessment
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    // Get patient profile for target range configuration
    const patientProfile = await this.prisma.user.findUnique({
      where: { id: patientId },
      select: {
        minTargetGlucose: true,
        maxTargetGlucose: true,
      },
    });

    // Default target range if not configured
    const minTarget = patientProfile?.minTargetGlucose || 70;
    const maxTarget = patientProfile?.maxTargetGlucose || 180;

    // Get all glucose readings from the last 14 days
    const [glucoseEntries, glucoseReadings] = await Promise.all([
      this.prisma.glucoseEntry.findMany({
        where: {
          userId: patientId,
          recordedAt: { gte: fourteenDaysAgo },
        },
        select: { mgdlEncrypted: true },
      }),
      this.prisma.glucoseReading.findMany({
        where: {
          userId: patientId,
          recordedAt: { gte: fourteenDaysAgo },
        },
        select: { glucoseEncrypted: true },
      }),
    ]);

    // Decrypt glucose entries
    const decryptedEntries = glucoseEntries
      .map((entry) => {
        try {
          return this.encryptionService.decryptGlucoseValue(entry.mgdlEncrypted);
        } catch (error) {
          console.error(`Failed to decrypt glucose entry for patient ${patientId}:`, error);
          return null;
        }
      })
      .filter((entry) => entry !== null) as number[];

    // Decrypt glucose readings
    const decryptedReadings = glucoseReadings
      .map((reading) => {
        try {
          return this.encryptionService.decryptGlucoseValue(reading.glucoseEncrypted);
        } catch (error) {
          console.error(`Failed to decrypt glucose reading for patient ${patientId}:`, error);
          return null;
        }
      })
      .filter((reading) => reading !== null) as number[];

    // Combine all glucose values
    const allGlucoseValues = [...decryptedEntries, ...decryptedReadings];

    // If no glucose data in last 14 days, assume stable (no evidence of risk)
    if (allGlucoseValues.length === 0) {
      return "Estable";
    }

    // Calculate risk criteria based on last 14 days data
    const totalReadings = allGlucoseValues.length;

    // 1. Hay al menos un evento con glucosa <54 mg/dL
    const hasSevereHypoglycemia = allGlucoseValues.some((glucose) => glucose < 54);

    // 2. El porcentaje de lecturas <54 mg/dL es ≥1%
    const severeHypoCount = allGlucoseValues.filter((glucose) => glucose < 54).length;
    const severeHypoPercentage = (severeHypoCount / totalReadings) * 100;

    // 3. El porcentaje de lecturas <70 mg/dL es ≥4%
    const hypoCount = allGlucoseValues.filter((glucose) => glucose < 70).length;
    const hypoPercentage = (hypoCount / totalReadings) * 100;

    // 4. El coeficiente de variación (CV) es mayor al 36%
    const mean = allGlucoseValues.reduce((sum, value) => sum + value, 0) / totalReadings;
    const variance =
      allGlucoseValues.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / totalReadings;
    const standardDeviation = Math.sqrt(variance);
    const coefficientOfVariation = mean > 0 ? (standardDeviation / mean) * 100 : 0;

    // 5. El porcentaje de lecturas en rango (70–180 mg/dL según configuración) es menor al 50%
    const inRangeCount = allGlucoseValues.filter(
      (glucose) => glucose >= minTarget && glucose <= maxTarget,
    ).length;
    const inRangePercentage = (inRangeCount / totalReadings) * 100;

    // Check if any risk criteria are met
    const isAtRisk =
      hasSevereHypoglycemia ||
      severeHypoPercentage >= 1 ||
      hypoPercentage >= 4 ||
      coefficientOfVariation > 36 ||
      inRangePercentage < 50;

    if (isAtRisk) {
      return "Riesgo";
    }

    // If no risk criteria are met, patient is stable
    return "Estable";
  }

  /**
   * Calculate patient activity status based on activity in last 24 hours
   */
  private async calculatePatientActivityStatus(patientId: string): Promise<"Activo" | "Inactivo"> {
    // Check for activity in last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [hasGlucoseEntry, hasSensorReading, hasInsulinDose, hasMeal] = await Promise.all([
      // Manual glucose entries
      this.prisma.glucoseEntry.findFirst({
        where: {
          userId: patientId,
          recordedAt: { gte: twentyFourHoursAgo },
        },
        select: { id: true },
      }),
      // Sensor readings (encrypted glucose readings from CGM)
      this.prisma.glucoseReading.findFirst({
        where: {
          userId: patientId,
          recordedAt: { gte: twentyFourHoursAgo },
        },
        select: { id: true },
      }),
      this.prisma.insulinDose.findFirst({
        where: {
          userId: patientId,
          recordedAt: { gte: twentyFourHoursAgo },
        },
        select: { id: true },
      }),
      this.prisma.meal.findFirst({
        where: {
          userId: patientId,
          createdAt: { gte: twentyFourHoursAgo },
        },
        select: { id: true },
      }),
    ]);

    // Activo: has activity in last 24 hours (manual glucose entries, sensor readings, insulin doses, or meals)
    if (hasGlucoseEntry || hasSensorReading || hasInsulinDose || hasMeal) {
      return "Activo";
    }

    // Inactivo: no activity in last 24 hours
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
      select: { mgdlEncrypted: true, recordedAt: true },
    });

    let lastGlucoseReading: { value: number; recordedAt: Date } | null = null;

    if (lastGlucoseEntry) {
      try {
        const decryptedValue = this.encryptionService.decryptGlucoseValue(
          lastGlucoseEntry.mgdlEncrypted,
        );
        lastGlucoseReading = {
          value: decryptedValue,
          recordedAt: lastGlucoseEntry.recordedAt,
        };
      } catch (error) {
        console.error(
          `[DoctorPatient] Failed to decrypt glucose entry for patient ${patientId}:`,
          error,
        );
      }
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

    // Calculate clinical status (Riesgo/Estable) and activity status (Activo/Inactivo)
    const [status, activityStatus] = await Promise.all([
      this.calculatePatientClinicalStatus(patientId),
      this.calculatePatientActivityStatus(patientId),
    ]);

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
      activityStatus,
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
  async getPatientMeals(
    doctorId: string,
    patientId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<
    Prisma.LogEntryGetPayload<{
      include: {
        mealTemplate: {
          include: {
            foodItems: true;
          };
        };
      };
    }>[]
  > {
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
   * Get unified log entries (historial) for a specific patient with optional date range
   * Includes glucoseEntry, insulinDose and mealTemplate with foodItems
   * Defaults to last 7 days if no date filters are provided
   */
  async getPatientLogEntries(
    doctorId: string,
    patientId: string,
    startDate?: string,
    endDate?: string,
  ) {
    await this.doctorUtils.verifyDoctor(doctorId);

    // Verify patient is assigned to doctor
    const assignedPatientIds = await this.doctorUtils.getDoctorPatientIds(doctorId);
    if (!assignedPatientIds.includes(patientId)) {
      throw new ForbiddenException("Patient is not assigned to this doctor");
    }

    const whereClause: any = {
      userId: patientId,
    };

    // Default to last 7 days if no filters provided
    let start = startDate ? new Date(startDate) : undefined;
    let end = endDate ? new Date(endDate) : undefined;
    if (!start && !end) {
      const now = new Date();
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      start = sevenDaysAgo;
      end = now;
    }

    if (start || end) {
      whereClause.recordedAt = {};
      if (start) {
        whereClause.recordedAt.gte = start;
      }
      if (end) {
        whereClause.recordedAt.lte = end;
      }
    }

    const results = await this.prisma.logEntry.findMany({
      where: whereClause,
      include: {
        glucoseEntry: true,
        insulinDose: true,
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

    // Decrypt glucose values in the results
    const decryptedResults = results.map((entry) => {
      if (entry.glucoseEntry) {
        try {
          const decryptedMgdl = this.encryptionService.decryptGlucoseValue(
            entry.glucoseEntry.mgdlEncrypted,
          );
          return {
            ...entry,
            glucoseEntry: {
              ...entry.glucoseEntry,
              mgdl: decryptedMgdl, // Add decrypted value for client compatibility
            } as any,
          };
        } catch (error) {
          console.error(
            `[DoctorPatient] Failed to decrypt glucose entry ${entry.glucoseEntry.id}:`,
            error,
          );
          // Return entry without decrypted value if decryption fails
          return entry;
        }
      }
      return entry;
    });

    return decryptedResults;
  }

  /**
   * Get patient profile/parameters
   */
  async getPatientProfile(doctorId: string, patientId: string): Promise<PatientProfileDto> {
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

  /**
   * Update patient profile/parameters
   */
  async updatePatientProfile(
    doctorId: string,
    patientId: string,
    updateData: any, // Using any for now, will be properly typed with DTO
  ) {
    await this.doctorUtils.verifyDoctor(doctorId);

    // Verify patient is assigned to doctor
    const assignedPatientIds = await this.doctorUtils.getDoctorPatientIds(doctorId);
    if (!assignedPatientIds.includes(patientId)) {
      throw new ForbiddenException("Patient is not assigned to this doctor");
    }

    const patient = await this.prisma.user.findUnique({
      where: { id: patientId, role: "PATIENT" },
      select: { id: true },
    });

    if (!patient) {
      throw new NotFoundException("Patient not found");
    }

    // Update patient profile
    const updatedPatient = await this.prisma.user.update({
      where: { id: patientId },
      data: updateData,
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

    return updatedPatient;
  }
}
