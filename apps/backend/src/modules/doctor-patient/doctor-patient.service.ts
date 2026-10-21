import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { UserRole, GlucoseEntry } from "@prisma/client";
import { DoctorUtilsService } from "../../common/services/doctor-utils.service";
import { EncryptionService } from "../../common/services/encryption.service";
import { CreateDoctorPatientDto } from "./dto/create-doctor-patient.dto";
import { DoctorPatientResponseDto } from "./dto/doctor-patient-response.dto";
import { PatientListItemDto } from "./dto/patient-list-item.dto";
import { GetPatientsQueryDto } from "./dto/get-patients-query.dto";
import { SearchPatientsDto } from "./dto/search-patients.dto";
import { PatientDetailsDto } from "./dto/patient-details.dto";
import { PatientProfileDto } from "./dto/patient-profile.dto";
import { UpdatePatientProfileDto } from "./dto/update-patient-profile.dto";
import type { Prisma } from "@prisma/client";

/**
 * Type for LogEntry with decrypted glucose value
 * Extends Prisma's LogEntry type to include mgdl in glucoseEntry when present
 */
type LogEntryWithDecryptedGlucose = Omit<
  Prisma.LogEntryGetPayload<{
    include: {
      glucoseEntry: true;
      insulinDose: true;
      mealTemplate: {
        include: {
          foodItems: true;
        };
      };
    };
  }>,
  "glucoseEntry"
> & {
  glucoseEntry: (GlucoseEntry & { mgdl: number }) | null;
};

@Injectable()
export class DoctorPatientService {
  private readonly logger = new Logger(DoctorPatientService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly doctorUtils: DoctorUtilsService,
    private readonly encryptionService: EncryptionService,
  ) {}

  /**
   * Get last glucose reading for a patient (prioritizes GlucoseEntry over GlucoseReading)
   * @param patientId - Patient ID
   * @returns Decrypted glucose reading with value and recordedAt, or null if not found
   */
  private async getLastGlucoseReading(
    patientId: string,
  ): Promise<{ value: number; recordedAt: Date } | null> {
    // Try GlucoseEntry first
    const lastGlucoseEntry = await this.prisma.glucoseEntry.findFirst({
      where: { userId: patientId },
      orderBy: { recordedAt: "desc" },
      select: { mgdlEncrypted: true, recordedAt: true },
    });

    if (lastGlucoseEntry) {
      try {
        const decryptedValue = this.encryptionService.decryptGlucoseValue(
          lastGlucoseEntry.mgdlEncrypted,
        );
        return {
          value: decryptedValue,
          recordedAt: lastGlucoseEntry.recordedAt,
        };
      } catch (error) {
        this.logger.error(
          `Failed to decrypt glucose entry for patient ${patientId}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    // Fallback to GlucoseReading if no GlucoseEntry
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
        return {
          value: glucoseValue,
          recordedAt: lastGlucoseReadingRecord.recordedAt,
        };
      } catch (error) {
        this.logger.error(
          `Failed to decrypt glucose reading for patient ${patientId}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    return null;
  }

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

    // Apply age range filter
    if (filters?.ageRange) {
      const now = new Date();
      let minAge: number | undefined;
      let maxAge: number | undefined;

      if (filters.ageRange === "18-30") {
        minAge = 18;
        maxAge = 30;
      } else if (filters.ageRange === "31-50") {
        minAge = 31;
        maxAge = 50;
      } else if (filters.ageRange === "51-70") {
        minAge = 51;
        maxAge = 70;
      } else if (filters.ageRange === "70+") {
        minAge = 70;
        maxAge = undefined;
      }

      if (minAge !== undefined) {
        // For minimum age: person must have been born ON OR BEFORE (now - minAge years)
        // Clone now, subtract minAge years, set to end-of-day for lte comparison
        const maxBirthDate = new Date(now);
        maxBirthDate.setFullYear(now.getFullYear() - minAge);
        maxBirthDate.setHours(23, 59, 59, 999);

        if (maxAge !== undefined) {
          // For maximum age: person must have been born ON OR AFTER (now - maxAge years)
          // Clone now, subtract maxAge years, set to start-of-day for gte comparison
          const minBirthDate = new Date(now);
          minBirthDate.setFullYear(now.getFullYear() - maxAge);
          minBirthDate.setHours(0, 0, 0, 0);
          where.birthDate = {
            gte: minBirthDate, // Born on or after this date (to be at most maxAge)
            lte: maxBirthDate, // Born on or before this date (to be at least minAge)
          };
        } else {
          // Only minimum age specified (e.g., "70+")
          where.birthDate = {
            lte: maxBirthDate, // Born on or before this date (to be at least minAge)
          };
        }
      }
    }

    // Apply weight range filter
    if (filters?.weightRange) {
      let minWeight: number | undefined;
      let maxWeight: number | undefined;

      if (filters.weightRange === "<60") {
        maxWeight = 60;
      } else if (filters.weightRange === "60-80") {
        minWeight = 60;
        maxWeight = 80;
      } else if (filters.weightRange === "80-100") {
        minWeight = 80;
        maxWeight = 100;
      } else if (filters.weightRange === "100+") {
        minWeight = 100;
      }

      if (minWeight !== undefined || maxWeight !== undefined) {
        where.weight = {};
        if (minWeight !== undefined) {
          where.weight.gte = minWeight;
        }
        if (maxWeight !== undefined) {
          where.weight.lte = maxWeight;
        }
      }
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

    // Determine which patients will be processed (after activeOnly filter)
    const patientsToProcess = filters?.activeOnly
      ? patients.filter((p) => activePatientIds.includes(p.id))
      : patients;
    const patientIdsToProcess = patientsToProcess.map((p) => p.id);

    // Batch fetch latest GlucoseEntry for all patients to process
    const glucoseEntries = await this.prisma.glucoseEntry.findMany({
      where: { userId: { in: patientIdsToProcess } },
      select: {
        userId: true,
        mgdlEncrypted: true,
        recordedAt: true,
      },
      orderBy: { recordedAt: "desc" },
    });

    // Build Map<userId, latest entry> - keep only the latest entry per user
    const latestGlucoseEntryMap = new Map<string, { mgdlEncrypted: string; recordedAt: Date }>();
    for (const entry of glucoseEntries) {
      if (!latestGlucoseEntryMap.has(entry.userId)) {
        latestGlucoseEntryMap.set(entry.userId, {
          mgdlEncrypted: entry.mgdlEncrypted,
          recordedAt: entry.recordedAt,
        });
      }
    }

    // Identify patients without GlucoseEntry
    const patientIdsWithoutEntry = patientIdsToProcess.filter(
      (id) => !latestGlucoseEntryMap.has(id),
    );

    // Batch fetch latest GlucoseReading for patients without GlucoseEntry
    const glucoseReadings = await this.prisma.glucoseReading.findMany({
      where: { userId: { in: patientIdsWithoutEntry } },
      select: {
        userId: true,
        glucoseEncrypted: true,
        recordedAt: true,
      },
      orderBy: { recordedAt: "desc" },
    });

    // Build Map<userId, latest reading> - keep only the latest reading per user
    const latestGlucoseReadingMap = new Map<
      string,
      { glucoseEncrypted: string; recordedAt: Date }
    >();
    for (const reading of glucoseReadings) {
      if (!latestGlucoseReadingMap.has(reading.userId)) {
        latestGlucoseReadingMap.set(reading.userId, {
          glucoseEncrypted: reading.glucoseEncrypted,
          recordedAt: reading.recordedAt,
        });
      }
    }

    // Build patient data without statuses (collect in loop, calculate statuses in batch after)
    interface PatientDataWithoutStatus {
      patient: (typeof patients)[0];
      lastGlucoseReading: { value: number; recordedAt: Date } | null;
    }

    const patientsData: PatientDataWithoutStatus[] = [];

    for (const patient of patients) {
      // Skip if activeOnly filter is enabled and patient is not active
      if (filters?.activeOnly && !activePatientIds.includes(patient.id)) {
        continue;
      }

      // Get last glucose reading from pre-fetched maps (no DB calls in loop)
      let lastGlucoseReading: { value: number; recordedAt: Date } | null = null;

      const glucoseEntry = latestGlucoseEntryMap.get(patient.id);
      if (glucoseEntry) {
        try {
          const decryptedValue = this.encryptionService.decryptGlucoseValue(
            glucoseEntry.mgdlEncrypted,
          );
          lastGlucoseReading = {
            value: decryptedValue,
            recordedAt: glucoseEntry.recordedAt,
          };
        } catch (error) {
          this.logger.error(
            `Failed to decrypt glucose entry for patient ${patient.id}`,
            error instanceof Error ? error.stack : String(error),
          );
        }
      } else {
        // Fallback to GlucoseReading if no GlucoseEntry
        const glucoseReading = latestGlucoseReadingMap.get(patient.id);
        if (glucoseReading) {
          try {
            const glucoseValue = this.encryptionService.decryptGlucoseValue(
              glucoseReading.glucoseEncrypted,
            );
            lastGlucoseReading = {
              value: glucoseValue,
              recordedAt: glucoseReading.recordedAt,
            };
          } catch (error) {
            this.logger.error(
              `Failed to decrypt glucose reading for patient ${patient.id}`,
              error instanceof Error ? error.stack : String(error),
            );
          }
        }
      }

      patientsData.push({
        patient,
        lastGlucoseReading,
      });
    }

    // Calculate all statuses in parallel (batch processing to avoid N+1)
    const statusPromises = patientsData.map((patientData) =>
      Promise.all([
        this.calculatePatientClinicalStatus(patientData.patient.id),
        this.calculatePatientActivityStatus(patientData.patient.id),
      ]).then(([clinicalStatus, activityStatus]) => ({
        patientId: patientData.patient.id,
        clinicalStatus,
        activityStatus,
      })),
    );

    const statusesResults = await Promise.all(statusPromises);

    // Build Map for quick lookup of statuses by patient ID
    const statusesMap = new Map<
      string,
      { clinicalStatus: "Riesgo" | "Estable"; activityStatus: "Activo" | "Inactivo" }
    >();
    for (const statusResult of statusesResults) {
      statusesMap.set(statusResult.patientId, {
        clinicalStatus: statusResult.clinicalStatus,
        activityStatus: statusResult.activityStatus,
      });
    }

    // Apply clinical status and activity status filters after calculating statuses
    let filteredPatientsData = patientsData;
    if (filters?.clinicalStatus || filters?.activityStatus) {
      filteredPatientsData = patientsData.filter((patientData) => {
        const statuses = statusesMap.get(patientData.patient.id);
        if (!statuses) return false;

        if (filters?.clinicalStatus && statuses.clinicalStatus !== filters.clinicalStatus) {
          return false;
        }

        if (filters?.activityStatus && statuses.activityStatus !== filters.activityStatus) {
          return false;
        }

        return true;
      });
    }

    // Build final result with statuses
    const result: PatientListItemDto[] = filteredPatientsData.map((patientData) => {
      const statuses = statusesMap.get(patientData.patient.id)!;
      return {
        id: patientData.patient.id,
        email: patientData.patient.email,
        firstName: patientData.patient.firstName || undefined,
        lastName: patientData.patient.lastName || undefined,
        avatarUrl: patientData.patient.avatarUrl || undefined,
        diabetesType: patientData.patient.diabetesType || undefined,
        lastGlucoseReading: patientData.lastGlucoseReading
          ? {
              value: patientData.lastGlucoseReading.value,
              recordedAt: patientData.lastGlucoseReading.recordedAt.toISOString(),
            }
          : undefined,
        status: statuses.clinicalStatus,
        activityStatus: statuses.activityStatus,
        registrationDate: patientData.patient.createdAt.toISOString(),
      };
    });

    return result;
  }

  /**
   * Search for patients globally (all patients, not just assigned)
   * Returns only patients without any assignment (1:1 relationship enforced)
   */
  async searchGlobalPatients(
    doctorId: string,
    searchDto: SearchPatientsDto,
  ): Promise<PatientListItemDto[]> {
    await this.doctorUtils.verifyDoctor(doctorId);

    // Get all assigned patient IDs (from any doctor) to exclude them
    const allAssignedPatients = await this.prisma.doctorPatient.findMany({
      select: { patientId: true },
    });
    const assignedPatientIds = allAssignedPatients.map((r) => r.patientId);

    // Build search query
    const searchTerm = searchDto.q.trim();

    const where: Prisma.UserWhereInput = {
      role: UserRole.PATIENT,
      // Exclude all patients already assigned to any doctor
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

    const activityStatuses = await Promise.all(
      patients.map(async (patient) => ({
        patientId: patient.id,
        activityStatus: await this.calculatePatientActivityStatus(patient.id),
      })),
    );

    const activityStatusMap = new Map(
      activityStatuses.map((status) => [status.patientId, status.activityStatus]),
    );

    return patients.map((patient) => ({
      id: patient.id,
      email: patient.email,
      firstName: patient.firstName || undefined,
      lastName: patient.lastName || undefined,
      avatarUrl: patient.avatarUrl || undefined,
      diabetesType: patient.diabetesType || undefined,
      lastGlucoseReading: undefined,
      status: "Estable" as const,
      activityStatus: activityStatusMap.get(patient.id) || ("Inactivo" as const),
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

    // Decrypt glucose entries and readings using batch method
    const decryptedEntries = this.encryptionService.decryptGlucoseValues(
      glucoseEntries.map((e) => e.mgdlEncrypted),
    );
    const decryptedReadings = this.encryptionService.decryptGlucoseValues(
      glucoseReadings.map((r) => r.glucoseEncrypted),
    );

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
   * Enforces 1:1 relationship - a patient can only be assigned to one doctor
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

    // Check if patient is already assigned to any doctor (1:1 relationship)
    const existingAssignment = await this.prisma.doctorPatient.findUnique({
      where: {
        patientId: createDto.patientId,
      },
    });

    if (existingAssignment) {
      if (existingAssignment.doctorId === doctorId) {
        throw new ConflictException("Patient is already assigned to this doctor");
      } else {
        throw new ConflictException("Patient is already assigned to another doctor");
      }
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
    const lastGlucoseReading = await this.getLastGlucoseReading(patientId);

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

    const whereClause: Prisma.LogEntryWhereInput = {
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
   * @returns Array of log entries with decrypted glucose values
   */
  async getPatientLogEntries(
    doctorId: string,
    patientId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<LogEntryWithDecryptedGlucose[]> {
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
    const decryptedResults: LogEntryWithDecryptedGlucose[] = results.map((entry) => {
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
            },
          } as LogEntryWithDecryptedGlucose;
        } catch (error) {
          this.logger.error(
            `Failed to decrypt glucose entry ${entry.glucoseEntry.id}`,
            error instanceof Error ? error.stack : String(error),
          );
          // Return entry without decrypted value if decryption fails
          return entry as LogEntryWithDecryptedGlucose;
        }
      }
      return entry as LogEntryWithDecryptedGlucose;
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
    updateData: UpdatePatientProfileDto,
  ) {
    await this.doctorUtils.verifyDoctor(doctorId);

    // Verify patient is assigned to doctor
    const assignedPatientIds = await this.doctorUtils.getDoctorPatientIds(doctorId);
    if (!assignedPatientIds.includes(patientId)) {
      throw new ForbiddenException("Patient is not assigned to this doctor");
    }

    const patient = await this.prisma.user.findUnique({
      where: { id: patientId, role: UserRole.PATIENT },
      select: { id: true },
    });

    if (!patient) {
      throw new NotFoundException("Patient not found");
    }

    // Convert DTO to Prisma update input (handle birthDate string to Date conversion)
    const prismaUpdateData: Prisma.UserUpdateInput = {
      ...updateData,
      ...(updateData.birthDate !== undefined && {
        birthDate: updateData.birthDate ? new Date(updateData.birthDate) : null,
      }),
    };

    // Update patient profile
    const updatedPatient = await this.prisma.user.update({
      where: { id: patientId },
      data: prismaUpdateData,
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

  /**
   * Get the doctor assigned to a patient (1:1 relationship)
   * @param patientId - Patient ID
   * @returns Doctor information or null if no doctor assigned
   */
  async getPatientDoctor(patientId: string): Promise<{
    id: string;
    doctorId: string;
    patientId: string;
    createdAt: string;
    doctor: {
      id: string;
      email: string;
      firstName?: string;
      lastName?: string;
      avatarUrl?: string;
    };
  } | null> {
    const relation = await this.prisma.doctorPatient.findUnique({
      where: { patientId },
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
