import { Injectable, ForbiddenException, NotFoundException, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import { DoctorUtilsService } from "../../common/services/doctor-utils.service";
import { EncryptionService } from "../../common/services/encryption.service";
import { DoctorPatientService } from "../doctor-patient/doctor-patient.service";
import { getDiabetesTypeLabel } from "@glucosapp/utils";
import {
  GenerateIndividualReportDto,
  GenerateGroupReportDto,
  ReportFormat,
  ReportType,
} from "./dto/generate-report.dto";
import { GetPatientsQueryDto } from "../doctor-patient/dto/get-patients-query.dto";
import {
  IndividualReportData,
  GroupReportData,
  PatientDemographics,
  DiabetesTypeDistribution,
  AgeDistribution,
  WeightDistribution,
  GlucoseData,
  InsulinData,
  MealsData,
} from "./interfaces/report-data.interface";
import PDFDocument from "pdfkit";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { DiabetesType } from "@prisma/client";

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly doctorUtils: DoctorUtilsService,
    private readonly encryptionService: EncryptionService,
    private readonly doctorPatientService: DoctorPatientService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generate individual patient report
   */
  async generateIndividualReport(
    doctorId: string,
    dto: GenerateIndividualReportDto,
  ): Promise<Buffer | string> {
    // Verify doctor
    await this.doctorUtils.verifyDoctor(doctorId);

    // Verify patient is assigned to doctor
    const assignedPatientIds = await this.doctorUtils.getDoctorPatientIds(doctorId);
    if (!assignedPatientIds.includes(dto.patientId)) {
      throw new ForbiddenException("Patient is not assigned to this doctor");
    }

    // Get patient data
    const patient = await this.prisma.user.findUnique({
      where: { id: dto.patientId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        diabetesType: true,
        birthDate: true,
        weight: true,
        minTargetGlucose: true,
        maxTargetGlucose: true,
      },
    });

    if (!patient) {
      throw new NotFoundException("Patient not found");
    }

    // Parse dates and ensure we capture the full day
    // If date comes as YYYY-MM-DD string, parse it in local timezone to avoid UTC issues
    const startDateStr = dto.startDate.split("T")[0]; // Get just the date part
    const endDateStr = dto.endDate.split("T")[0];

    const startDate = new Date(startDateStr + "T00:00:00");
    const endDate = new Date(endDateStr + "T23:59:59.999");

    // Collect data based on report types
    const reportData: Record<string, any> = {
      patient,
      startDate: dto.startDate,
      endDate: dto.endDate,
    };

    if (
      dto.reportTypes.includes(ReportType.GLUCOSE) ||
      dto.reportTypes.includes(ReportType.SENSOR_READINGS)
    ) {
      const includeManual = dto.reportTypes.includes(ReportType.GLUCOSE);
      const includeSensor = dto.reportTypes.includes(ReportType.SENSOR_READINGS);
      reportData.glucose = await this.getGlucoseData(
        dto.patientId,
        startDate,
        endDate,
        includeManual,
        includeSensor,
      );
    }

    if (dto.reportTypes.includes(ReportType.INSULIN)) {
      reportData.insulin = await this.getInsulinData(dto.patientId, startDate, endDate);
    }

    if (dto.reportTypes.includes(ReportType.MEALS)) {
      reportData.meals = await this.getMealsData(dto.patientId, startDate, endDate);
    }

    // Generate AI summary if requested and Gemini API key is configured
    if (dto.includeAISummary && this.configService.get<string>("GEMINI_API_KEY")) {
      try {
        reportData.aiSummary = await this.generateAISummary(reportData);
      } catch (error) {
        this.logger.warn("Failed to generate AI summary", error);
        // Continue without AI summary if it fails
      }
    }

    // Generate report based on format
    if (dto.format === ReportFormat.PDF) {
      return await this.generatePDF(reportData, dto.reportTypes);
    } else {
      return this.generateCSV(reportData, dto.reportTypes);
    }
  }

  /**
   * Generate group report for multiple patients
   */
  async generateGroupReport(
    doctorId: string,
    dto: GenerateGroupReportDto,
  ): Promise<Buffer | string> {
    // Verify doctor
    await this.doctorUtils.verifyDoctor(doctorId);

    // Parse dates and ensure we capture the full day
    // If date comes as YYYY-MM-DD string, parse it in local timezone to avoid UTC issues
    const startDateStr = dto.startDate.split("T")[0]; // Get just the date part
    const endDateStr = dto.endDate.split("T")[0];

    const startDate = new Date(startDateStr + "T00:00:00");
    const endDate = new Date(endDateStr + "T23:59:59.999");

    // Convert filters to GetPatientsQueryDto format
    const filters: GetPatientsQueryDto = dto.filters
      ? {
          search: dto.filters.search,
          diabetesType: dto.filters.diabetesType as DiabetesType,
          activeOnly: dto.filters.activeOnly,
          registrationDate: dto.filters.registrationDate,
          clinicalStatus: dto.filters.clinicalStatus,
          activityStatus: dto.filters.activityStatus,
          ageRange: dto.filters.ageRange,
          weightRange: dto.filters.weightRange,
        }
      : {};

    // Get filtered patients
    const patients = await this.doctorPatientService.getPatients(doctorId, filters);

    if (patients.length === 0) {
      throw new NotFoundException("No patients found matching the criteria");
    }

    // Collect aggregated data for all patients
    const reportData: Record<string, any> = {
      startDate: dto.startDate,
      endDate: dto.endDate,
      totalPatients: patients.length,
      filters: filters,
    };

    // Batch fetch all patient data in a single query
    const patientIds = patients.map((p) => p.id);
    const fullPatients = await this.prisma.user.findMany({
      where: { id: { in: patientIds } },
      select: {
        id: true,
        birthDate: true,
        weight: true,
        minTargetGlucose: true,
        maxTargetGlucose: true,
      },
    });

    // Create a map for quick lookup
    const patientDataMap = new Map((fullPatients || []).map((p) => [p.id, p]));

    // Collect patient demographics for aggregation
    const patientDemographics: PatientDemographics[] = [];
    for (const patient of patients) {
      const fullPatient = patientDataMap.get(patient.id);
      patientDemographics.push({
        diabetesType: patient.diabetesType ?? null,
        birthDate: fullPatient?.birthDate ?? null,
        weight: fullPatient?.weight ?? null,
        minTargetGlucose: fullPatient?.minTargetGlucose ?? null,
        maxTargetGlucose: fullPatient?.maxTargetGlucose ?? null,
      });
    }

    // Batch fetch all data in parallel
    const dataPromises: Promise<any>[] = [];

    // Collect glucose data
    if (
      dto.reportTypes.includes(ReportType.GLUCOSE) ||
      dto.reportTypes.includes(ReportType.SENSOR_READINGS)
    ) {
      const includeManual = dto.reportTypes.includes(ReportType.GLUCOSE);
      const includeSensor = dto.reportTypes.includes(ReportType.SENSOR_READINGS);
      dataPromises.push(
        this.getBatchGlucoseData(patientIds, startDate, endDate, includeManual, includeSensor),
      );
    } else {
      dataPromises.push(Promise.resolve([]));
    }

    // Collect insulin data
    if (dto.reportTypes.includes(ReportType.INSULIN)) {
      dataPromises.push(this.getBatchInsulinData(patientIds, startDate, endDate));
    } else {
      dataPromises.push(Promise.resolve([]));
    }

    // Collect meals data
    if (dto.reportTypes.includes(ReportType.MEALS)) {
      dataPromises.push(this.getBatchMealsData(patientIds, startDate, endDate));
    } else {
      dataPromises.push(Promise.resolve([]));
    }

    // Execute all batch queries in parallel
    const [allGlucoseData, allInsulinData, allMealsData] = await Promise.all(dataPromises);

    // Aggregate demographics
    const diabetesTypeCounts = patientDemographics.reduce(
      (acc: Record<string, number>, p: PatientDemographics) => {
        const type = p.diabetesType ?? "unknown";
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      },
      {},
    );

    const ages = patientDemographics
      .filter(
        (p: PatientDemographics): p is PatientDemographics & { birthDate: Date } =>
          p.birthDate !== null,
      )
      .map((p) => {
        const birthDate = new Date(p.birthDate);
        return Math.floor(
          (new Date().getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365),
        );
      });

    const weights = patientDemographics
      .filter(
        (p: PatientDemographics): p is PatientDemographics & { weight: number } =>
          p.weight !== null && p.weight !== undefined,
      )
      .map((p) => p.weight);

    const targetGlucoseRanges = patientDemographics.filter(
      (
        p: PatientDemographics,
      ): p is PatientDemographics & { minTargetGlucose: number; maxTargetGlucose: number } =>
        p.minTargetGlucose !== null && p.maxTargetGlucose !== null,
    );

    reportData.demographics = {
      diabetesTypeDistribution: diabetesTypeCounts,
      ageStats:
        ages.length > 0
          ? {
              average: ages.reduce((a: number, b: number) => a + b, 0) / ages.length,
              min: Math.min(...ages),
              max: Math.max(...ages),
              median:
                ages.length % 2 === 0
                  ? (ages.sort((a, b) => a - b)[ages.length / 2 - 1] +
                      ages.sort((a, b) => a - b)[ages.length / 2]) /
                    2
                  : ages.sort((a, b) => a - b)[Math.floor(ages.length / 2)],
            }
          : null,
      weightStats:
        weights.length > 0
          ? {
              average: weights.reduce((a: number, b: number) => a + b, 0) / weights.length,
              min: Math.min(...weights),
              max: Math.max(...weights),
              median:
                weights.length % 2 === 0
                  ? (weights.sort((a, b) => a - b)[weights.length / 2 - 1] +
                      weights.sort((a, b) => a - b)[weights.length / 2]) /
                    2
                  : weights.sort((a, b) => a - b)[Math.floor(weights.length / 2)],
            }
          : null,
      targetGlucoseRange:
        targetGlucoseRanges.length > 0
          ? {
              averageMin:
                targetGlucoseRanges.reduce((sum: number, p) => sum + p.minTargetGlucose, 0) /
                targetGlucoseRanges.length,
              averageMax:
                targetGlucoseRanges.reduce((sum: number, p) => sum + p.maxTargetGlucose, 0) /
                targetGlucoseRanges.length,
            }
          : null,
    };

    // Aggregate glucose data
    if (allGlucoseData.length > 0) {
      const glucoseValues = allGlucoseData
        .map((g: any) => Number(g.value))
        .filter((v: number) => !isNaN(v) && v > 0);

      if (glucoseValues.length > 0) {
        const sortedValues = [...glucoseValues].sort((a, b) => a - b);
        const avg = glucoseValues.reduce((a: number, b: number) => a + b, 0) / glucoseValues.length;
        const median =
          sortedValues.length % 2 === 0
            ? (sortedValues[sortedValues.length / 2 - 1] + sortedValues[sortedValues.length / 2]) /
              2
            : sortedValues[Math.floor(sortedValues.length / 2)];
        const p25 = sortedValues[Math.floor(sortedValues.length * 0.25)];
        const p75 = sortedValues[Math.floor(sortedValues.length * 0.75)];

        // Calculate time in range using average target range
        const avgMinTarget = reportData.demographics.targetGlucoseRange?.averageMin || 70;
        const avgMaxTarget = reportData.demographics.targetGlucoseRange?.averageMax || 180;
        const inRange = glucoseValues.filter(
          (v: number) => v >= avgMinTarget && v <= avgMaxTarget,
        ).length;
        const inRangePercent = (inRange / glucoseValues.length) * 100;

        // Events
        const hypoglycemia = glucoseValues.filter((v: number) => v < 70).length;
        const severeHypoglycemia = glucoseValues.filter((v: number) => v < 54).length;
        const hyperglycemia = glucoseValues.filter((v: number) => v > 180).length;
        const severeHyperglycemia = glucoseValues.filter((v: number) => v > 250).length;

        // Coefficient of variation
        const variance =
          glucoseValues.reduce((sum: number, val: number) => sum + Math.pow(val - avg, 2), 0) /
          glucoseValues.length;
        const stdDev = Math.sqrt(variance);
        const cv = avg > 0 ? (stdDev / avg) * 100 : 0;

        reportData.glucose = {
          totalReadings: allGlucoseData.length,
          average: avg,
          median,
          min: sortedValues[0],
          max: sortedValues[sortedValues.length - 1],
          p25,
          p75,
          cv,
          inRange,
          inRangePercent,
          hypoglycemia,
          hypoglycemiaPercent: (hypoglycemia / glucoseValues.length) * 100,
          severeHypoglycemia,
          severeHypoglycemiaPercent: (severeHypoglycemia / glucoseValues.length) * 100,
          hyperglycemia,
          hyperglycemiaPercent: (hyperglycemia / glucoseValues.length) * 100,
          severeHyperglycemia,
          severeHyperglycemiaPercent: (severeHyperglycemia / glucoseValues.length) * 100,
        };
      }
    }

    // Aggregate insulin data
    if (allInsulinData.length > 0) {
      const totalUnits = allInsulinData.reduce((sum: number, d: any) => sum + d.units, 0);
      const basalDoses = allInsulinData.filter((d: any) => d.type === "BASAL");
      const bolusDoses = allInsulinData.filter((d: any) => d.type === "BOLUS");
      const basalUnits = basalDoses.reduce((sum: number, d: any) => sum + d.units, 0);
      const bolusUnits = bolusDoses.reduce((sum: number, d: any) => sum + d.units, 0);

      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      reportData.insulin = {
        totalDoses: allInsulinData.length,
        totalUnits,
        averageDose: totalUnits / allInsulinData.length,
        averageDailyUnits: daysDiff > 0 ? totalUnits / daysDiff : 0,
        averageDailyUnitsPerPatient:
          daysDiff > 0 && patients.length > 0 ? totalUnits / daysDiff / patients.length : 0,
        basalDoses: basalDoses.length,
        basalUnits,
        bolusDoses: bolusDoses.length,
        bolusUnits,
      };
    }

    // Aggregate meals data
    if (allMealsData.length > 0) {
      const totalCarbs = allMealsData.reduce(
        (sum: number, m: any) => sum + (m.carbohydrates || 0),
        0,
      );
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      reportData.meals = {
        totalMeals: allMealsData.length,
        totalCarbohydrates: totalCarbs,
        averageCarbsPerMeal: totalCarbs / allMealsData.length,
        averageDailyCarbs: daysDiff > 0 ? totalCarbs / daysDiff : 0,
        averageDailyCarbsPerPatient:
          daysDiff > 0 && patients.length > 0 ? totalCarbs / daysDiff / patients.length : 0,
      };
    }

    // Generate AI summary if requested and Gemini API key is configured
    if (dto.includeAISummary && this.configService.get<string>("GEMINI_API_KEY")) {
      try {
        reportData.aiSummary = await this.generateGroupAISummary(reportData);
      } catch (error) {
        this.logger.warn("Failed to generate AI summary for group report", error);
        // Continue without AI summary if it fails
      }
    }

    // Generate report based on format
    if (dto.format === ReportFormat.PDF) {
      return await this.generateGroupPDF(reportData, dto.reportTypes);
    } else {
      return this.generateGroupCSV(reportData, dto.reportTypes);
    }
  }

  /**
   * Get glucose data for a patient in date range
   * @param includeManual - Include only manual glucose entries (GlucoseEntry) - pure manual entries, not sensor readings
   * @param includeSensor - Include all sensor readings (GlucoseReading) - includes LIBRE_NFC, DEXCOM, OTHER_CGM, etc.
   */
  private async getGlucoseData(
    patientId: string,
    startDate: Date,
    endDate: Date,
    includeManual: boolean = true,
    includeSensor: boolean = true,
  ) {
    const promises: Promise<any>[] = [];

    if (includeManual) {
      // Include only GlucoseEntry (pure manual entries, not sensor readings)
      // Reset time to start of day for startDate and end of day for endDate to ensure we capture all entries
      const startOfDay = new Date(startDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);

      const entriesQuery = this.prisma.glucoseEntry.findMany({
        where: {
          userId: patientId,
          recordedAt: { gte: startOfDay, lte: endOfDay },
        },
        orderBy: { recordedAt: "asc" },
      });

      promises.push(entriesQuery);
    } else {
      promises.push(Promise.resolve([]));
    }

    if (includeSensor) {
      // Include all sensor readings (LIBRE_NFC, DEXCOM, OTHER_CGM, etc.)
      // Reset time to start of day for startDate and end of day for endDate
      const startOfDay = new Date(startDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);

      promises.push(
        this.prisma.glucoseReading.findMany({
          where: {
            userId: patientId,
            recordedAt: { gte: startOfDay, lte: endOfDay },
          },
          orderBy: { recordedAt: "asc" },
        }),
      );
    } else {
      promises.push(Promise.resolve([]));
    }

    const [entries, readings] = await Promise.all(promises);

    const glucoseData = [];

    // Process entries (manual - only from GlucoseEntry)
    if (includeManual) {
      for (const entry of entries) {
        try {
          const value = this.encryptionService.decryptGlucoseValue(entry.mgdlEncrypted);
          glucoseData.push({
            date: entry.recordedAt.toISOString(),
            value,
            source: "manual",
          });
        } catch (error) {
          this.logger.error(`Failed to decrypt glucose entry ${entry.id}`, error);
        }
      }
    }

    // Process all sensor readings (LIBRE_NFC, DEXCOM, OTHER_CGM, etc.)
    if (includeSensor) {
      for (const reading of readings) {
        try {
          const value = this.encryptionService.decryptGlucoseValue(reading.glucoseEncrypted);
          glucoseData.push({
            date: reading.recordedAt.toISOString(),
            value,
            source: reading.source,
          });
        } catch (error) {
          this.logger.error(`Failed to decrypt glucose reading ${reading.id}`, error);
        }
      }
    }

    return glucoseData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  /**
   * Get batch glucose data for multiple patients in date range
   */
  private async getBatchGlucoseData(
    patientIds: string[],
    startDate: Date,
    endDate: Date,
    includeManual: boolean = true,
    includeSensor: boolean = true,
  ) {
    const promises: Promise<any>[] = [];
    const startOfDay = new Date(startDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);

    if (includeManual) {
      promises.push(
        this.prisma.glucoseEntry.findMany({
          where: {
            userId: { in: patientIds },
            recordedAt: { gte: startOfDay, lte: endOfDay },
          },
          orderBy: { recordedAt: "asc" },
        }),
      );
    } else {
      promises.push(Promise.resolve([]));
    }

    if (includeSensor) {
      promises.push(
        this.prisma.glucoseReading.findMany({
          where: {
            userId: { in: patientIds },
            recordedAt: { gte: startOfDay, lte: endOfDay },
          },
          orderBy: { recordedAt: "asc" },
        }),
      );
    } else {
      promises.push(Promise.resolve([]));
    }

    const [entries, readings] = await Promise.all(promises);

    const glucoseData = [];

    // Process entries (manual - only from GlucoseEntry)
    if (includeManual) {
      for (const entry of entries) {
        try {
          const value = this.encryptionService.decryptGlucoseValue(entry.mgdlEncrypted);
          glucoseData.push({
            date: entry.recordedAt.toISOString(),
            value,
            source: "manual",
          });
        } catch (error) {
          this.logger.error(`Failed to decrypt glucose entry ${entry.id}`, error);
        }
      }
    }

    // Process all sensor readings (LIBRE_NFC, DEXCOM, OTHER_CGM, etc.)
    if (includeSensor) {
      for (const reading of readings) {
        try {
          const value = this.encryptionService.decryptGlucoseValue(reading.glucoseEncrypted);
          glucoseData.push({
            date: reading.recordedAt.toISOString(),
            value,
            source: reading.source,
          });
        } catch (error) {
          this.logger.error(`Failed to decrypt glucose reading ${reading.id}`, error);
        }
      }
    }

    return glucoseData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  /**
   * Get batch insulin data for multiple patients in date range
   */
  private async getBatchInsulinData(patientIds: string[], startDate: Date, endDate: Date) {
    const doses = await this.prisma.insulinDose.findMany({
      where: {
        userId: { in: patientIds },
        recordedAt: { gte: startDate, lte: endDate },
      },
      orderBy: { recordedAt: "asc" },
    });

    return doses.map((dose) => ({
      date: dose.recordedAt.toISOString(),
      units: dose.units,
      type: dose.type,
    }));
  }

  /**
   * Get insulin data for a patient in date range
   */
  private async getInsulinData(patientId: string, startDate: Date, endDate: Date) {
    const doses = await this.prisma.insulinDose.findMany({
      where: {
        userId: patientId,
        recordedAt: { gte: startDate, lte: endDate },
      },
      orderBy: { recordedAt: "asc" },
    });

    return doses.map((dose) => ({
      date: dose.recordedAt.toISOString(),
      units: dose.units,
      type: dose.type,
    }));
  }

  /**
   * Get batch meals data for multiple patients in date range
   */
  private async getBatchMealsData(patientIds: string[], startDate: Date, endDate: Date) {
    const logEntries = await this.prisma.logEntry.findMany({
      where: {
        userId: { in: patientIds },
        recordedAt: { gte: startDate, lte: endDate },
        mealTemplateId: { not: null },
      },
      include: {
        mealTemplate: {
          include: {
            foodItems: true,
          },
        },
      },
      orderBy: { recordedAt: "asc" },
    });

    return logEntries.map((entry) => ({
      date: entry.recordedAt.toISOString(),
      mealType: (entry.mealTemplate as any)?.mealType,
      carbohydrates: entry.mealTemplate?.carbohydrates,
      name: entry.mealTemplate?.name,
      foodItems: entry.mealTemplate?.foodItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        carbs: item.carbs,
      })),
    }));
  }

  /**
   * Get meals data for a patient in date range
   */
  private async getMealsData(patientId: string, startDate: Date, endDate: Date) {
    const logEntries = await this.prisma.logEntry.findMany({
      where: {
        userId: patientId,
        recordedAt: { gte: startDate, lte: endDate },
        mealTemplateId: { not: null },
      },
      include: {
        mealTemplate: {
          include: {
            foodItems: true,
          },
        },
      },
      orderBy: { recordedAt: "asc" },
    });

    return logEntries.map((entry) => ({
      date: entry.recordedAt.toISOString(),
      mealType: (entry.mealTemplate as any)?.mealType,
      carbohydrates: entry.mealTemplate?.carbohydrates,
      name: entry.mealTemplate?.name,
      foodItems: entry.mealTemplate?.foodItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        carbs: item.carbs,
      })),
    }));
  }

  /**
   * Generate PDF for individual report
   */
  private async generatePDF(data: any, reportTypes: ReportType[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => buffers.push(chunk));
      doc.on("end", () => {
        resolve(Buffer.concat(buffers));
      });
      doc.on("error", (error: Error) => {
        reject(error);
      });

      // Header
      doc.fontSize(20).text("Reporte de Paciente", { align: "center" });
      doc.moveDown();

      // Patient info
      doc.fontSize(14).text("Información del Paciente", { underline: true });
      doc.fontSize(12);
      const patientName =
        `${data.patient.firstName || ""} ${data.patient.lastName || ""}`.trim() || "N/A";
      doc.text(`Nombre: ${patientName}`);
      doc.text(`Email: ${data.patient.email}`);
      doc.text(
        `Tipo de Diabetes: ${getDiabetesTypeLabel(data.patient.diabetesType) || "No especificado"}`,
      );

      // Calculate age if birthDate is available
      if (data.patient.birthDate) {
        const birthDate = new Date(data.patient.birthDate);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        doc.text(`Edad: ${age} años`);
      }

      if (data.patient.weight) {
        doc.text(`Peso: ${data.patient.weight} kg`);
      }

      if (data.patient.minTargetGlucose && data.patient.maxTargetGlucose) {
        doc.text(
          `Rango Objetivo: ${data.patient.minTargetGlucose} - ${data.patient.maxTargetGlucose} mg/dL`,
        );
      }

      doc.moveDown();

      // Date range with better formatting
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);
      const formatDate = (date: Date) => {
        const day = date.getDate();
        const month = date.toLocaleDateString("es-ES", { month: "long" });
        const year = date.getFullYear();
        return `${day} de ${month} de ${year}`;
      };
      doc.text(`Período: ${formatDate(startDate)} - ${formatDate(endDate)}`);
      doc.moveDown();

      // Glucose data
      if (
        (reportTypes.includes(ReportType.GLUCOSE) ||
          reportTypes.includes(ReportType.SENSOR_READINGS)) &&
        data.glucose
      ) {
        const hasManual = reportTypes.includes(ReportType.GLUCOSE);
        const hasSensor = reportTypes.includes(ReportType.SENSOR_READINGS);
        let title = "Datos de Glucosa";
        if (hasManual && hasSensor) {
          title = "Datos de Glucosa (Manual y Sensor)";
        } else if (hasManual) {
          title = "Datos de Glucosa (Manual)";
        } else if (hasSensor) {
          title = "Datos de Glucosa (Sensor)";
        }
        doc.fontSize(14).text(title, { underline: true });
        doc.fontSize(10);
        if (!data.glucose || data.glucose.length === 0) {
          if (hasManual && !hasSensor) {
            doc.text("No hay datos de glucosa manual en el período seleccionado.");
            doc.text("Esto incluye solo entradas manuales (no incluye lecturas del sensor).");
          } else if (!hasManual && hasSensor) {
            doc.text("No hay datos de lecturas del sensor en el período seleccionado.");
            doc.text(
              "Esto incluye todas las lecturas del sensor (NFC, DEXCOM, otros sensores continuos).",
            );
          } else {
            doc.text("No hay datos de glucosa en el período seleccionado.");
          }
        } else if (data.glucose.length > 0) {
          // Convert to numbers and filter invalid values
          const values = data.glucose
            .map((g: any) => Number(g.value))
            .filter((v: number) => !isNaN(v) && v > 0);

          if (values.length > 0) {
            // Basic statistics
            const avg = values.reduce((a: number, b: number) => a + b, 0) / values.length;
            const sortedValues = [...values].sort((a, b) => a - b);
            const min = sortedValues[0];
            const max = sortedValues[sortedValues.length - 1];
            const median =
              sortedValues.length % 2 === 0
                ? (sortedValues[sortedValues.length / 2 - 1] +
                    sortedValues[sortedValues.length / 2]) /
                  2
                : sortedValues[Math.floor(sortedValues.length / 2)];

            // Percentiles
            const p25 = sortedValues[Math.floor(sortedValues.length * 0.25)];
            const p75 = sortedValues[Math.floor(sortedValues.length * 0.75)];

            // Coefficient of variation
            const variance =
              values.reduce((sum: number, val: number) => sum + Math.pow(val - avg, 2), 0) /
              values.length;
            const stdDev = Math.sqrt(variance);
            const cv = avg > 0 ? (stdDev / avg) * 100 : 0;

            // Target range (use patient's range or default 70-180)
            const minTarget = data.patient.minTargetGlucose || 70;
            const maxTarget = data.patient.maxTargetGlucose || 180;
            const inRange = values.filter((v: number) => v >= minTarget && v <= maxTarget).length;
            const inRangePercent = (inRange / values.length) * 100;

            doc.text(`Total de lecturas: ${data.glucose.length}`);
            doc.moveDown(0.5);
            doc.fontSize(11).text("Estadísticas Básicas", { underline: true });
            doc.fontSize(10);
            doc.text(`Promedio: ${avg.toFixed(1)} mg/dL`);
            doc.text(`Mediana: ${median.toFixed(1)} mg/dL`);
            doc.text(`Mínimo: ${min} mg/dL`);
            doc.text(`Máximo: ${max} mg/dL`);
            doc.text(`Percentil 25: ${p25} mg/dL`);
            doc.text(`Percentil 75: ${p75} mg/dL`);
            doc.text(`Coeficiente de Variación: ${cv.toFixed(1)}%`);
            doc.moveDown(0.5);
            doc.fontSize(11).text("Tiempo en Rango", { underline: true });
            doc.fontSize(10);
            doc.text(
              `Lecturas en rango (${minTarget}-${maxTarget} mg/dL): ${inRange} (${inRangePercent.toFixed(1)}%)`,
            );
            doc.moveDown(0.5);

            // Events - Calculate after all other stats
            const hypoglycemia = values.filter((v: number) => v < 70).length;
            const hypoglycemiaPercent =
              values.length > 0 ? (hypoglycemia / values.length) * 100 : 0;
            const severeHypoglycemia = values.filter((v: number) => v < 54).length;
            const severeHypoglycemiaPercent =
              values.length > 0 ? (severeHypoglycemia / values.length) * 100 : 0;
            const hyperglycemia = values.filter((v: number) => v > 180).length;
            const hyperglycemiaPercent =
              values.length > 0 ? (hyperglycemia / values.length) * 100 : 0;
            const severeHyperglycemia = values.filter((v: number) => v > 250).length;
            const severeHyperglycemiaPercent =
              values.length > 0 ? (severeHyperglycemia / values.length) * 100 : 0;

            doc.fontSize(11).text("Eventos", { underline: true });
            doc.fontSize(10);
            doc.text(
              `Hipoglucemia (<70 mg/dL): ${hypoglycemia} (${hypoglycemiaPercent.toFixed(1)}%)`,
            );
            if (severeHypoglycemia > 0) {
              doc.fillColor("red");
              doc.text(
                `Hipoglucemia Severa (<54 mg/dL): ${severeHypoglycemia} (${severeHypoglycemiaPercent.toFixed(1)}%)`,
              );
              doc.fillColor("black");
            } else {
              doc.text(`Hipoglucemia Severa (<54 mg/dL): 0 (0.0%)`);
            }
            doc.text(
              `Hiperglucemia (>180 mg/dL): ${hyperglycemia} (${hyperglycemiaPercent.toFixed(1)}%)`,
            );
            if (severeHyperglycemia > 0) {
              doc.fillColor("red");
              doc.text(
                `Hiperglucemia Severa (>250 mg/dL): ${severeHyperglycemia} (${severeHyperglycemiaPercent.toFixed(1)}%)`,
              );
              doc.fillColor("black");
            } else {
              doc.text(`Hiperglucemia Severa (>250 mg/dL): 0 (0.0%)`);
            }
          } else {
            doc.text("No hay datos válidos de glucosa en el período seleccionado");
          }
        } else {
          doc.text("No hay datos de glucosa en el período seleccionado");
        }
        doc.moveDown();
      }

      // Insulin data
      if (reportTypes.includes(ReportType.INSULIN) && data.insulin) {
        doc.fontSize(14).text("Datos de Insulina", { underline: true });
        doc.fontSize(10);
        if (data.insulin.length > 0) {
          const totalUnits = data.insulin.reduce((sum: number, d: any) => sum + d.units, 0);
          const avgDose = totalUnits / data.insulin.length;

          // Calculate days in period
          const daysDiff = Math.ceil(
            (new Date(data.endDate).getTime() - new Date(data.startDate).getTime()) /
              (1000 * 60 * 60 * 24),
          );
          const avgDailyUnits = daysDiff > 0 ? totalUnits / daysDiff : 0;

          // Breakdown by type
          const basalDoses = data.insulin.filter((d: any) => d.type === "BASAL");
          const bolusDoses = data.insulin.filter((d: any) => d.type === "BOLUS");
          const basalUnits = basalDoses.reduce((sum: number, d: any) => sum + d.units, 0);
          const bolusUnits = bolusDoses.reduce((sum: number, d: any) => sum + d.units, 0);

          doc.text(`Total de dosis: ${data.insulin.length}`);
          doc.text(`Total de unidades: ${totalUnits.toFixed(1)} U`);
          doc.text(`Promedio por dosis: ${avgDose.toFixed(1)} U`);
          doc.text(`Promedio diario: ${avgDailyUnits.toFixed(1)} U/día`);
          doc.moveDown(0.5);
          doc.fontSize(11).text("Desglose por Tipo", { underline: true });
          doc.fontSize(10);
          doc.text(`Basal: ${basalDoses.length} dosis, ${basalUnits.toFixed(1)} U`);
          doc.text(`Bolus: ${bolusDoses.length} dosis, ${bolusUnits.toFixed(1)} U`);
        } else {
          doc.text("No hay datos de insulina en el período seleccionado");
        }
        doc.moveDown();
      }

      // Meals data
      if (reportTypes.includes(ReportType.MEALS) && data.meals) {
        doc.fontSize(14).text("Datos de Comidas", { underline: true });
        doc.fontSize(10);
        if (data.meals.length > 0) {
          doc.text(`Total de comidas: ${data.meals.length}`);
          const totalCarbs = data.meals.reduce(
            (sum: number, m: any) => sum + (m.carbohydrates || 0),
            0,
          );
          doc.text(`Total de carbohidratos: ${totalCarbs.toFixed(1)} g`);
        } else {
          doc.text("No hay datos de comidas en el período seleccionado");
        }
        doc.moveDown();
      }

      // AI Summary section
      if (data.aiSummary) {
        doc.addPage();
        doc.fontSize(14).text("Resumen de Análisis", { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(9).fillColor("gray");
        doc.font("Helvetica-Oblique");
        doc.text(
          "Este resumen fue generado por inteligencia artificial y debe ser utilizado como referencia complementaria.",
        );
        doc.font("Helvetica");
        doc.fillColor("black");
        doc.moveDown(0.5);
        doc.fontSize(10);

        // Split text into paragraphs and add to PDF
        const paragraphs = data.aiSummary.split("\n\n").filter((p: string) => p.trim().length > 0);
        paragraphs.forEach((paragraph: string) => {
          doc.text(paragraph.trim(), { align: "justify" });
          doc.moveDown(0.3);
        });
      }

      doc.end();
      // Buffer will be returned in the 'end' event handler
    });
  }

  /**
   * Escape CSV value to prevent injection and handle special characters
   */
  private escapeCSVValue(value: string | number | null | undefined): string {
    if (value === null || value === undefined) {
      return "";
    }

    const str = String(value);

    // Prevent CSV injection by prefixing dangerous characters
    const dangerousStartChars = ["=", "+", "-", "@", "\t", "\r"];
    if (dangerousStartChars.some((char) => str.startsWith(char))) {
      return `"'${str.replace(/"/g, '""')}"`;
    }

    // If value contains comma, quote, or newline, wrap in quotes and escape internal quotes
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
      return `"${str.replace(/"/g, '""')}"`;
    }

    return str;
  }

  /**
   * Generate CSV for individual report
   */
  private generateCSV(data: any, reportTypes: ReportType[]): string {
    const rows: string[] = [];

    // Header
    rows.push("Tipo,Fecha,Valor,Unidad,Detalles");

    // Glucose data
    if (
      (reportTypes.includes(ReportType.GLUCOSE) ||
        reportTypes.includes(ReportType.SENSOR_READINGS)) &&
      data.glucose
    ) {
      for (const item of data.glucose) {
        const type = item.source === "manual" ? "Glucosa Manual" : "Lectura Sensor";
        rows.push(
          [
            this.escapeCSVValue(type),
            this.escapeCSVValue(item.date),
            this.escapeCSVValue(item.value),
            this.escapeCSVValue("mg/dL"),
            this.escapeCSVValue(item.source),
          ].join(","),
        );
      }
    }

    // Insulin data
    if (reportTypes.includes(ReportType.INSULIN) && data.insulin) {
      for (const item of data.insulin) {
        rows.push(
          [
            this.escapeCSVValue("Insulina"),
            this.escapeCSVValue(item.date),
            this.escapeCSVValue(item.units),
            this.escapeCSVValue("Unidades"),
            this.escapeCSVValue(item.type),
          ].join(","),
        );
      }
    }

    // Meals data
    if (reportTypes.includes(ReportType.MEALS) && data.meals) {
      for (const item of data.meals) {
        rows.push(
          [
            this.escapeCSVValue("Comida"),
            this.escapeCSVValue(item.date),
            this.escapeCSVValue(item.carbohydrates || 0),
            this.escapeCSVValue("g"),
            this.escapeCSVValue(item.name || ""),
          ].join(","),
        );
      }
    }

    return rows.join("\n");
  }

  /**
   * Generate PDF for group report
   */
  private async generateGroupPDF(data: any, reportTypes: ReportType[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => buffers.push(chunk));
      doc.on("end", () => {
        resolve(Buffer.concat(buffers));
      });
      doc.on("error", (error: Error) => {
        reject(error);
      });

      // Header
      doc.fontSize(20).text("Reporte Grupal de Pacientes", { align: "center" });
      doc.moveDown();

      // Summary
      doc.fontSize(14).text("Resumen del Grupo", { underline: true });
      doc.fontSize(12);
      doc.text(`Total de pacientes: ${data.totalPatients}`);
      doc.text(
        `Período: ${new Date(data.startDate).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })} - ${new Date(data.endDate).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}`,
      );

      // Show applied filters
      if (data.filters && Object.keys(data.filters).length > 0) {
        doc.moveDown(0.5);
        doc.fontSize(11).text("Criterios de Filtrado Aplicados", { underline: true });
        doc.fontSize(10);
        if (data.filters.diabetesType) {
          doc.text(`Tipo de diabetes: ${getDiabetesTypeLabel(data.filters.diabetesType)}`);
        }
        if (data.filters.ageRange) {
          doc.text(`Rango de edad: ${data.filters.ageRange}`);
        }
        if (data.filters.weightRange) {
          doc.text(`Rango de peso: ${data.filters.weightRange}`);
        }
        if (data.filters.clinicalStatus) {
          doc.text(`Estado clínico: ${data.filters.clinicalStatus}`);
        }
        if (data.filters.activityStatus) {
          doc.text(`Estado de actividad: ${data.filters.activityStatus}`);
        }
        if (data.filters.activeOnly) {
          doc.text(`Solo pacientes activos: Sí`);
        }
      }
      doc.moveDown();

      // Demographics
      if (data.demographics) {
        doc.fontSize(14).text("Características Demográficas del Grupo", { underline: true });
        doc.fontSize(10);

        if (data.demographics.diabetesTypeDistribution) {
          doc.text("Distribución por Tipo de Diabetes:");
          Object.entries(data.demographics.diabetesTypeDistribution).forEach(
            ([type, count]: [string, any]) => {
              const percent = ((count / data.totalPatients) * 100).toFixed(1);
              doc.text(`  ${getDiabetesTypeLabel(type as any)}: ${count} pacientes (${percent}%)`, {
                indent: 20,
              });
            },
          );
          doc.moveDown(0.5);
        }

        if (data.demographics.ageStats) {
          doc.text(`Edad promedio: ${data.demographics.ageStats.average.toFixed(1)} años`);
          doc.text(
            `Rango de edad: ${data.demographics.ageStats.min} - ${data.demographics.ageStats.max} años`,
          );
          doc.text(`Mediana de edad: ${data.demographics.ageStats.median} años`);
          doc.moveDown(0.5);
        }

        if (data.demographics.weightStats) {
          doc.text(`Peso promedio: ${data.demographics.weightStats.average.toFixed(1)} kg`);
          doc.text(
            `Rango de peso: ${data.demographics.weightStats.min} - ${data.demographics.weightStats.max} kg`,
          );
          doc.text(`Mediana de peso: ${data.demographics.weightStats.median.toFixed(1)} kg`);
          doc.moveDown(0.5);
        }

        if (data.demographics.targetGlucoseRange) {
          doc.text(
            `Rango objetivo promedio de glucosa: ${data.demographics.targetGlucoseRange.averageMin.toFixed(0)} - ${data.demographics.targetGlucoseRange.averageMax.toFixed(0)} mg/dL`,
          );
        }
        doc.moveDown();
      }

      // Aggregated Glucose Data
      if (
        (reportTypes.includes(ReportType.GLUCOSE) ||
          reportTypes.includes(ReportType.SENSOR_READINGS)) &&
        data.glucose
      ) {
        const hasManual = reportTypes.includes(ReportType.GLUCOSE);
        const hasSensor = reportTypes.includes(ReportType.SENSOR_READINGS);
        let title = "Datos Agregados de Glucosa";
        if (hasManual && hasSensor) {
          title = "Datos Agregados de Glucosa (Manual y Sensor)";
        } else if (hasManual) {
          title = "Datos Agregados de Glucosa (Manual)";
        } else if (hasSensor) {
          title = "Datos Agregados de Glucosa (Sensor)";
        }

        doc.fontSize(14).text(title, { underline: true });
        doc.fontSize(10);
        doc.text(`Total de lecturas: ${data.glucose.totalReadings}`);
        doc.moveDown(0.5);
        doc.fontSize(11).text("Estadísticas Básicas", { underline: true });
        doc.fontSize(10);
        doc.text(`Promedio: ${data.glucose.average.toFixed(1)} mg/dL`);
        doc.text(`Mediana: ${data.glucose.median.toFixed(1)} mg/dL`);
        doc.text(`Mínimo: ${data.glucose.min} mg/dL`);
        doc.text(`Máximo: ${data.glucose.max} mg/dL`);
        doc.text(`Percentil 25: ${data.glucose.p25} mg/dL`);
        doc.text(`Percentil 75: ${data.glucose.p75} mg/dL`);
        doc.text(`Coeficiente de Variación: ${data.glucose.cv.toFixed(1)}%`);
        doc.moveDown(0.5);
        doc.fontSize(11).text("Tiempo en Rango", { underline: true });
        doc.fontSize(10);
        const avgMinTarget = data.demographics?.targetGlucoseRange?.averageMin || 70;
        const avgMaxTarget = data.demographics?.targetGlucoseRange?.averageMax || 180;
        doc.text(
          `Lecturas en rango (${avgMinTarget.toFixed(0)}-${avgMaxTarget.toFixed(0)} mg/dL): ${data.glucose.inRange} (${data.glucose.inRangePercent.toFixed(1)}%)`,
        );
        doc.moveDown(0.5);
        doc.fontSize(11).text("Eventos", { underline: true });
        doc.fontSize(10);
        doc.text(
          `Hipoglucemia (<70 mg/dL): ${data.glucose.hypoglycemia} (${data.glucose.hypoglycemiaPercent.toFixed(1)}%)`,
        );
        doc.text(
          `Hipoglucemia Severa (<54 mg/dL): ${data.glucose.severeHypoglycemia} (${data.glucose.severeHypoglycemiaPercent.toFixed(1)}%)`,
        );
        doc.text(
          `Hiperglucemia (>180 mg/dL): ${data.glucose.hyperglycemia} (${data.glucose.hyperglycemiaPercent.toFixed(1)}%)`,
        );
        doc.text(
          `Hiperglucemia Severa (>250 mg/dL): ${data.glucose.severeHyperglycemia} (${data.glucose.severeHyperglycemiaPercent.toFixed(1)}%)`,
        );
        doc.moveDown();
      }

      // Aggregated Insulin Data
      if (reportTypes.includes(ReportType.INSULIN) && data.insulin) {
        doc.fontSize(14).text("Datos Agregados de Insulina", { underline: true });
        doc.fontSize(10);
        doc.text(`Total de dosis: ${data.insulin.totalDoses}`);
        doc.text(`Total de unidades: ${data.insulin.totalUnits.toFixed(1)} U`);
        doc.text(`Promedio por dosis: ${data.insulin.averageDose.toFixed(1)} U`);
        doc.text(`Promedio diario total: ${data.insulin.averageDailyUnits.toFixed(1)} U/día`);
        doc.text(
          `Promedio diario por paciente: ${data.insulin.averageDailyUnitsPerPatient.toFixed(1)} U/día/paciente`,
        );
        doc.moveDown(0.5);
        doc.fontSize(11).text("Desglose por Tipo", { underline: true });
        doc.fontSize(10);
        doc.text(
          `Basal: ${data.insulin.basalDoses} dosis, ${data.insulin.basalUnits.toFixed(1)} U`,
        );
        doc.text(
          `Bolus: ${data.insulin.bolusDoses} dosis, ${data.insulin.bolusUnits.toFixed(1)} U`,
        );
        doc.moveDown();
      }

      // Aggregated Meals Data
      if (reportTypes.includes(ReportType.MEALS) && data.meals) {
        doc.fontSize(14).text("Datos Agregados de Comidas", { underline: true });
        doc.fontSize(10);
        doc.text(`Total de comidas: ${data.meals.totalMeals}`);
        doc.text(`Total de carbohidratos: ${data.meals.totalCarbohydrates.toFixed(1)} g`);
        doc.text(`Promedio por comida: ${data.meals.averageCarbsPerMeal.toFixed(1)} g`);
        doc.text(`Promedio diario total: ${data.meals.averageDailyCarbs.toFixed(1)} g/día`);
        doc.text(
          `Promedio diario por paciente: ${data.meals.averageDailyCarbsPerPatient.toFixed(1)} g/día/paciente`,
        );
        doc.moveDown();
      }

      // AI Summary section
      if (data.aiSummary) {
        doc.addPage();
        doc.fontSize(14).text("Resumen de Análisis", { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(9).fillColor("gray");
        doc.font("Helvetica-Oblique");
        doc.text(
          "Este resumen fue generado por inteligencia artificial y debe ser utilizado como referencia complementaria.",
        );
        doc.font("Helvetica");
        doc.fillColor("black");
        doc.moveDown(0.5);
        doc.fontSize(10);

        // Split text into paragraphs and add to PDF
        const paragraphs = data.aiSummary.split("\n\n").filter((p: string) => p.trim().length > 0);
        paragraphs.forEach((paragraph: string) => {
          doc.text(paragraph.trim(), { align: "justify" });
          doc.moveDown(0.3);
        });
      }

      doc.end();
      // Buffer will be returned in the 'end' event handler
    });
  }

  /**
   * Generate CSV for group report
   */
  private generateGroupCSV(data: any, reportTypes: ReportType[]): string {
    const rows: string[] = [];

    // Header with aggregated statistics
    rows.push("Tipo,Métrica,Valor,Unidad");
    rows.push(
      [
        this.escapeCSVValue("Grupo"),
        this.escapeCSVValue("Total de pacientes"),
        this.escapeCSVValue(data.totalPatients),
        this.escapeCSVValue("pacientes"),
      ].join(","),
    );
    rows.push(
      [
        this.escapeCSVValue("Período"),
        this.escapeCSVValue("Inicio"),
        this.escapeCSVValue(data.startDate),
        this.escapeCSVValue(""),
      ].join(","),
    );
    rows.push(
      [
        this.escapeCSVValue("Período"),
        this.escapeCSVValue("Fin"),
        this.escapeCSVValue(data.endDate),
        this.escapeCSVValue(""),
      ].join(","),
    );

    // Demographics
    if (data.demographics) {
      if (data.demographics.diabetesTypeDistribution) {
        Object.entries(data.demographics.diabetesTypeDistribution).forEach(
          ([type, count]: [string, any]) => {
            rows.push(
              [
                this.escapeCSVValue("Demografía"),
                this.escapeCSVValue(`Tipo de Diabetes ${getDiabetesTypeLabel(type as any)}`),
                this.escapeCSVValue(count),
                this.escapeCSVValue("pacientes"),
              ].join(","),
            );
          },
        );
      }
      if (data.demographics.ageStats) {
        rows.push(
          [
            this.escapeCSVValue("Demografía"),
            this.escapeCSVValue("Edad promedio"),
            this.escapeCSVValue(data.demographics.ageStats.average.toFixed(1)),
            this.escapeCSVValue("años"),
          ].join(","),
        );
        rows.push(
          [
            this.escapeCSVValue("Demografía"),
            this.escapeCSVValue("Edad mínima"),
            this.escapeCSVValue(data.demographics.ageStats.min),
            this.escapeCSVValue("años"),
          ].join(","),
        );
        rows.push(
          [
            this.escapeCSVValue("Demografía"),
            this.escapeCSVValue("Edad máxima"),
            this.escapeCSVValue(data.demographics.ageStats.max),
            this.escapeCSVValue("años"),
          ].join(","),
        );
        rows.push(
          [
            this.escapeCSVValue("Demografía"),
            this.escapeCSVValue("Mediana de edad"),
            this.escapeCSVValue(data.demographics.ageStats.median),
            this.escapeCSVValue("años"),
          ].join(","),
        );
      }
      if (data.demographics.weightStats) {
        rows.push(
          [
            this.escapeCSVValue("Demografía"),
            this.escapeCSVValue("Peso promedio"),
            this.escapeCSVValue(data.demographics.weightStats.average.toFixed(1)),
            this.escapeCSVValue("kg"),
          ].join(","),
        );
        rows.push(
          [
            this.escapeCSVValue("Demografía"),
            this.escapeCSVValue("Peso mínimo"),
            this.escapeCSVValue(data.demographics.weightStats.min),
            this.escapeCSVValue("kg"),
          ].join(","),
        );
        rows.push(
          [
            this.escapeCSVValue("Demografía"),
            this.escapeCSVValue("Peso máximo"),
            this.escapeCSVValue(data.demographics.weightStats.max),
            this.escapeCSVValue("kg"),
          ].join(","),
        );
        rows.push(
          [
            this.escapeCSVValue("Demografía"),
            this.escapeCSVValue("Mediana de peso"),
            this.escapeCSVValue(data.demographics.weightStats.median.toFixed(1)),
            this.escapeCSVValue("kg"),
          ].join(","),
        );
      }
    }

    // Aggregated Glucose Statistics
    if (
      (reportTypes.includes(ReportType.GLUCOSE) ||
        reportTypes.includes(ReportType.SENSOR_READINGS)) &&
      data.glucose
    ) {
      rows.push(
        [
          this.escapeCSVValue("Glucosa"),
          this.escapeCSVValue("Total de lecturas"),
          this.escapeCSVValue(data.glucose.totalReadings),
          this.escapeCSVValue("lecturas"),
        ].join(","),
      );
      rows.push(
        [
          this.escapeCSVValue("Glucosa"),
          this.escapeCSVValue("Promedio"),
          this.escapeCSVValue(data.glucose.average.toFixed(1)),
          this.escapeCSVValue("mg/dL"),
        ].join(","),
      );
      rows.push(
        [
          this.escapeCSVValue("Glucosa"),
          this.escapeCSVValue("Mediana"),
          this.escapeCSVValue(data.glucose.median.toFixed(1)),
          this.escapeCSVValue("mg/dL"),
        ].join(","),
      );
      rows.push(
        [
          this.escapeCSVValue("Glucosa"),
          this.escapeCSVValue("Mínimo"),
          this.escapeCSVValue(data.glucose.min),
          this.escapeCSVValue("mg/dL"),
        ].join(","),
      );
      rows.push(
        [
          this.escapeCSVValue("Glucosa"),
          this.escapeCSVValue("Máximo"),
          this.escapeCSVValue(data.glucose.max),
          this.escapeCSVValue("mg/dL"),
        ].join(","),
      );
      rows.push(
        [
          this.escapeCSVValue("Glucosa"),
          this.escapeCSVValue("Percentil 25"),
          this.escapeCSVValue(data.glucose.p25),
          this.escapeCSVValue("mg/dL"),
        ].join(","),
      );
      rows.push(
        [
          this.escapeCSVValue("Glucosa"),
          this.escapeCSVValue("Percentil 75"),
          this.escapeCSVValue(data.glucose.p75),
          this.escapeCSVValue("mg/dL"),
        ].join(","),
      );
      rows.push(
        [
          this.escapeCSVValue("Glucosa"),
          this.escapeCSVValue("Coeficiente de Variación"),
          this.escapeCSVValue(data.glucose.cv.toFixed(1)),
          this.escapeCSVValue("%"),
        ].join(","),
      );
      rows.push(
        [
          this.escapeCSVValue("Glucosa"),
          this.escapeCSVValue("Tiempo en rango"),
          this.escapeCSVValue(data.glucose.inRangePercent.toFixed(1)),
          this.escapeCSVValue("%"),
        ].join(","),
      );
      rows.push(
        [
          this.escapeCSVValue("Glucosa"),
          this.escapeCSVValue("Hipoglucemias"),
          this.escapeCSVValue(data.glucose.hypoglycemia),
          this.escapeCSVValue("eventos"),
        ].join(","),
      );
      rows.push(
        [
          this.escapeCSVValue("Glucosa"),
          this.escapeCSVValue("Hipoglucemias %"),
          this.escapeCSVValue(data.glucose.hypoglycemiaPercent.toFixed(1)),
          this.escapeCSVValue("%"),
        ].join(","),
      );
      rows.push(
        [
          this.escapeCSVValue("Glucosa"),
          this.escapeCSVValue("Hipoglucemias severas"),
          this.escapeCSVValue(data.glucose.severeHypoglycemia),
          this.escapeCSVValue("eventos"),
        ].join(","),
      );
      rows.push(
        [
          this.escapeCSVValue("Glucosa"),
          this.escapeCSVValue("Hipoglucemias severas %"),
          this.escapeCSVValue(data.glucose.severeHypoglycemiaPercent.toFixed(1)),
          this.escapeCSVValue("%"),
        ].join(","),
      );
      rows.push(
        [
          this.escapeCSVValue("Glucosa"),
          this.escapeCSVValue("Hiperglucemias"),
          this.escapeCSVValue(data.glucose.hyperglycemia),
          this.escapeCSVValue("eventos"),
        ].join(","),
      );
      rows.push(
        [
          this.escapeCSVValue("Glucosa"),
          this.escapeCSVValue("Hiperglucemias %"),
          this.escapeCSVValue(data.glucose.hyperglycemiaPercent.toFixed(1)),
          this.escapeCSVValue("%"),
        ].join(","),
      );
      rows.push(
        [
          this.escapeCSVValue("Glucosa"),
          this.escapeCSVValue("Hiperglucemias severas"),
          this.escapeCSVValue(data.glucose.severeHyperglycemia),
          this.escapeCSVValue("eventos"),
        ].join(","),
      );
      rows.push(
        [
          this.escapeCSVValue("Glucosa"),
          this.escapeCSVValue("Hiperglucemias severas %"),
          this.escapeCSVValue(data.glucose.severeHyperglycemiaPercent.toFixed(1)),
          this.escapeCSVValue("%"),
        ].join(","),
      );
    }

    // Aggregated Insulin Statistics
    if (reportTypes.includes(ReportType.INSULIN) && data.insulin) {
      rows.push(
        [
          this.escapeCSVValue("Insulina"),
          this.escapeCSVValue("Total de dosis"),
          this.escapeCSVValue(data.insulin.totalDoses),
          this.escapeCSVValue("dosis"),
        ].join(","),
      );
      rows.push(
        [
          this.escapeCSVValue("Insulina"),
          this.escapeCSVValue("Total de unidades"),
          this.escapeCSVValue(data.insulin.totalUnits.toFixed(1)),
          this.escapeCSVValue("U"),
        ].join(","),
      );
      rows.push(
        [
          this.escapeCSVValue("Insulina"),
          this.escapeCSVValue("Promedio por dosis"),
          this.escapeCSVValue(data.insulin.averageDose.toFixed(1)),
          this.escapeCSVValue("U"),
        ].join(","),
      );
      rows.push(
        [
          this.escapeCSVValue("Insulina"),
          this.escapeCSVValue("Promedio diario total"),
          this.escapeCSVValue(data.insulin.averageDailyUnits.toFixed(1)),
          this.escapeCSVValue("U/día"),
        ].join(","),
      );
      rows.push(
        [
          this.escapeCSVValue("Insulina"),
          this.escapeCSVValue("Promedio diario por paciente"),
          this.escapeCSVValue(data.insulin.averageDailyUnitsPerPatient.toFixed(1)),
          this.escapeCSVValue("U/día/paciente"),
        ].join(","),
      );
      rows.push(
        [
          this.escapeCSVValue("Insulina"),
          this.escapeCSVValue("Dosis basal"),
          this.escapeCSVValue(data.insulin.basalDoses),
          this.escapeCSVValue("dosis"),
        ].join(","),
      );
      rows.push(
        [
          this.escapeCSVValue("Insulina"),
          this.escapeCSVValue("Unidades basal"),
          this.escapeCSVValue(data.insulin.basalUnits.toFixed(1)),
          this.escapeCSVValue("U"),
        ].join(","),
      );
      rows.push(
        [
          this.escapeCSVValue("Insulina"),
          this.escapeCSVValue("Dosis bolus"),
          this.escapeCSVValue(data.insulin.bolusDoses),
          this.escapeCSVValue("dosis"),
        ].join(","),
      );
      rows.push(
        [
          this.escapeCSVValue("Insulina"),
          this.escapeCSVValue("Unidades bolus"),
          this.escapeCSVValue(data.insulin.bolusUnits.toFixed(1)),
          this.escapeCSVValue("U"),
        ].join(","),
      );
    }

    // Aggregated Meals Statistics
    if (reportTypes.includes(ReportType.MEALS) && data.meals) {
      rows.push(
        [
          this.escapeCSVValue("Comidas"),
          this.escapeCSVValue("Total de comidas"),
          this.escapeCSVValue(data.meals.totalMeals),
          this.escapeCSVValue("comidas"),
        ].join(","),
      );
      rows.push(
        [
          this.escapeCSVValue("Comidas"),
          this.escapeCSVValue("Total de carbohidratos"),
          this.escapeCSVValue(data.meals.totalCarbohydrates.toFixed(1)),
          this.escapeCSVValue("g"),
        ].join(","),
      );
      rows.push(
        [
          this.escapeCSVValue("Comidas"),
          this.escapeCSVValue("Promedio por comida"),
          this.escapeCSVValue(data.meals.averageCarbsPerMeal.toFixed(1)),
          this.escapeCSVValue("g"),
        ].join(","),
      );
      rows.push(
        [
          this.escapeCSVValue("Comidas"),
          this.escapeCSVValue("Promedio diario total"),
          this.escapeCSVValue(data.meals.averageDailyCarbs.toFixed(1)),
          this.escapeCSVValue("g/día"),
        ].join(","),
      );
      rows.push(
        [
          this.escapeCSVValue("Comidas"),
          this.escapeCSVValue("Promedio diario por paciente"),
          this.escapeCSVValue(data.meals.averageDailyCarbsPerPatient.toFixed(1)),
          this.escapeCSVValue("g/día/paciente"),
        ].join(","),
      );
    }

    return rows.join("\n");
  }

  /**
   * Sanitize patient data by removing personal information while keeping useful analysis data
   */
  private sanitizePatientData(data: any): any {
    const sanitized = {
      // Keep demographic data useful for analysis (no personal identifiers)
      diabetesType: data.patient?.diabetesType,
      age: data.patient?.birthDate
        ? Math.floor(
            (new Date().getTime() - new Date(data.patient.birthDate).getTime()) /
              (1000 * 60 * 60 * 24 * 365),
          )
        : null,
      weight: data.patient?.weight,
      minTargetGlucose: data.patient?.minTargetGlucose,
      maxTargetGlucose: data.patient?.maxTargetGlucose,
      // Keep date range
      startDate: data.startDate,
      endDate: data.endDate,
      // Keep aggregated data (no personal info)
      glucose: data.glucose
        ? {
            totalReadings: data.glucose.length,
            average:
              data.glucose.length > 0
                ? data.glucose.reduce((sum: number, g: any) => sum + Number(g.value), 0) /
                  data.glucose.length
                : 0,
            min:
              data.glucose.length > 0
                ? Math.min(...data.glucose.map((g: any) => Number(g.value)))
                : 0,
            max:
              data.glucose.length > 0
                ? Math.max(...data.glucose.map((g: any) => Number(g.value)))
                : 0,
            inRange: data.glucose.filter((g: any) => {
              const value = Number(g.value);
              const minTarget = data.patient?.minTargetGlucose || 70;
              const maxTarget = data.patient?.maxTargetGlucose || 180;
              return value >= minTarget && value <= maxTarget;
            }).length,
            hypoglycemia: data.glucose.filter((g: any) => Number(g.value) < 70).length,
            severeHypoglycemia: data.glucose.filter((g: any) => Number(g.value) < 54).length,
            hyperglycemia: data.glucose.filter((g: any) => Number(g.value) > 180).length,
            severeHyperglycemia: data.glucose.filter((g: any) => Number(g.value) > 250).length,
          }
        : null,
      insulin: data.insulin
        ? {
            totalDoses: data.insulin.length,
            totalUnits: data.insulin.reduce((sum: number, d: any) => sum + d.units, 0),
            averageDose:
              data.insulin.length > 0
                ? data.insulin.reduce((sum: number, d: any) => sum + d.units, 0) /
                  data.insulin.length
                : 0,
            basalDoses: data.insulin.filter((d: any) => d.type === "BASAL").length,
            bolusDoses: data.insulin.filter((d: any) => d.type === "BOLUS").length,
            basalUnits: data.insulin
              .filter((d: any) => d.type === "BASAL")
              .reduce((sum: number, d: any) => sum + d.units, 0),
            bolusUnits: data.insulin
              .filter((d: any) => d.type === "BOLUS")
              .reduce((sum: number, d: any) => sum + d.units, 0),
          }
        : null,
      meals: data.meals
        ? {
            totalMeals: data.meals.length,
            totalCarbohydrates: data.meals.reduce(
              (sum: number, m: any) => sum + (m.carbohydrates || 0),
              0,
            ),
          }
        : null,
    };

    return sanitized;
  }

  /**
   * Generate AI summary using Google Gemini
   */
  private async generateAISummary(data: any): Promise<string> {
    const apiKey = this.configService.get<string>("GEMINI_API_KEY");
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite-001" });

    // Sanitize data to remove personal information
    const sanitizedData = this.sanitizePatientData(data);

    const prompt = `Eres un experto en diabetes y análisis de datos de glucosa. Tu tarea es generar un resumen profesional de aproximadamente 500 palabras basado únicamente en los datos proporcionados.

Instrucciones importantes:
- NO uses formato markdown (sin ##, **, etc.).
- NO incluyas fechas exactas ni nombres de paciente.
- NO inventes información que no esté en los datos.
- El resumen debe ser claro, profesional, útil para un médico, y con lenguaje médico accesible.
- Incluye observaciones y recomendaciones basadas únicamente en los datos provistos.

Datos del paciente:
- Tipo de diabetes: ${sanitizedData.diabetesType || "No especificado"}
- Edad: ${sanitizedData.age || "No especificada"} años
- Peso: ${sanitizedData.weight || "No especificado"} kg
- Rango objetivo de glucosa: ${sanitizedData.minTargetGlucose || 70}-${sanitizedData.maxTargetGlucose || 180} mg/dL

Datos de glucosa:
${
  sanitizedData.glucose
    ? `- Total de lecturas: ${sanitizedData.glucose.totalReadings}
- Promedio: ${sanitizedData.glucose.average.toFixed(1)} mg/dL
- Rango: ${sanitizedData.glucose.min}-${sanitizedData.glucose.max} mg/dL
- Lecturas en rango objetivo: ${sanitizedData.glucose.inRange} (${sanitizedData.glucose.totalReadings > 0 ? ((sanitizedData.glucose.inRange / sanitizedData.glucose.totalReadings) * 100).toFixed(1) : 0}%)
- Hipoglucemias (<70 mg/dL): ${sanitizedData.glucose.hypoglycemia} (${sanitizedData.glucose.totalReadings > 0 ? ((sanitizedData.glucose.hypoglycemia / sanitizedData.glucose.totalReadings) * 100).toFixed(1) : 0}%)
- Hipoglucemias severas (<54 mg/dL): ${sanitizedData.glucose.severeHypoglycemia} (${sanitizedData.glucose.totalReadings > 0 ? ((sanitizedData.glucose.severeHypoglycemia / sanitizedData.glucose.totalReadings) * 100).toFixed(1) : 0}%)
- Hiperglucemias (>180 mg/dL): ${sanitizedData.glucose.hyperglycemia} (${sanitizedData.glucose.totalReadings > 0 ? ((sanitizedData.glucose.hyperglycemia / sanitizedData.glucose.totalReadings) * 100).toFixed(1) : 0}%)
- Hiperglucemias severas (>250 mg/dL): ${sanitizedData.glucose.severeHyperglycemia} (${sanitizedData.glucose.totalReadings > 0 ? ((sanitizedData.glucose.severeHyperglycemia / sanitizedData.glucose.totalReadings) * 100).toFixed(1) : 0}%)`
    : "No hay datos de glucosa disponibles"
}

Datos de insulina:
${
  sanitizedData.insulin
    ? `- Total de dosis: ${sanitizedData.insulin.totalDoses}
- Total de unidades: ${sanitizedData.insulin.totalUnits.toFixed(1)} U
- Promedio por dosis: ${sanitizedData.insulin.averageDose.toFixed(1)} U
- Basal: ${sanitizedData.insulin.basalDoses} dosis, ${sanitizedData.insulin.basalUnits.toFixed(1)} U
- Bolus: ${sanitizedData.insulin.bolusDoses} dosis, ${sanitizedData.insulin.bolusUnits.toFixed(1)} U`
    : "No hay datos de insulina disponibles"
}

Datos de comidas:
${
  sanitizedData.meals
    ? `- Total de comidas registradas: ${sanitizedData.meals.totalMeals}
- Total de carbohidratos: ${sanitizedData.meals.totalCarbohydrates.toFixed(1)} g`
    : "No hay datos de comidas disponibles"
}

Genera un resumen que incluya:
1. Evaluación general del control glucémico.
2. Análisis del tiempo en rango y eventos de hipo/hiperglucemia.
3. Evaluación del uso de insulina y su adecuación.
4. Recomendaciones generales basadas en los datos.
5. Áreas de mejora identificadas para optimizar el control glucémico.

Asegúrate de que el resumen sea coherente, profesional, y fácil de interpretar para un médico tratante. Evita repeticiones y mantén un flujo lógico de la información.
`;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();

      // Clean markdown formatting and redundant information
      text = this.cleanAISummaryText(text);

      return text;
    } catch (error) {
      this.logger.error("Error generating AI summary", error);
      throw error;
    }
  }

  /**
   * Sanitize group data by removing personal information while keeping useful analysis data
   */
  private sanitizeGroupData(data: any): any {
    const sanitized = {
      // Group-level demographics (no personal identifiers)
      totalPatients: data.totalPatients,
      demographics: data.demographics
        ? {
            diabetesTypeDistribution: data.demographics.diabetesTypeDistribution,
            ageStats: data.demographics.ageStats,
            weightStats: data.demographics.weightStats,
            targetGlucoseRange: data.demographics.targetGlucoseRange,
          }
        : null,
      // Keep date range (no specific dates)
      startDate: data.startDate,
      endDate: data.endDate,
      // Keep aggregated data (no personal info)
      glucose: data.glucose || null,
      insulin: data.insulin || null,
      meals: data.meals || null,
    };

    return sanitized;
  }

  /**
   * Generate AI summary for group reports using Google Gemini
   */
  private async generateGroupAISummary(data: any): Promise<string> {
    const apiKey = this.configService.get<string>("GEMINI_API_KEY");
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite-001" });

    // Sanitize data to remove personal information
    const sanitizedData = this.sanitizeGroupData(data);

    // Build demographics section
    let demographicsSection = "";
    if (sanitizedData.demographics) {
      const demo = sanitizedData.demographics;

      demographicsSection = `Características del grupo:
- Total de pacientes: ${sanitizedData.totalPatients}`;

      if (demo.diabetesTypeDistribution) {
        const typeEntries = Object.entries(demo.diabetesTypeDistribution)
          .map(([type, count]: [string, any]) => {
            const percent = ((count / sanitizedData.totalPatients) * 100).toFixed(1);
            return `  - ${getDiabetesTypeLabel(type as any)}: ${count} pacientes (${percent}%)`;
          })
          .join("\n");
        demographicsSection += `\n- Distribución por tipo de diabetes:\n${typeEntries}`;
      }

      if (demo.ageStats) {
        demographicsSection += `\n- Edad promedio: ${demo.ageStats.average.toFixed(1)} años (rango: ${demo.ageStats.min}-${demo.ageStats.max} años)`;
      }

      if (demo.weightStats) {
        demographicsSection += `\n- Peso promedio: ${demo.weightStats.average.toFixed(1)} kg (rango: ${demo.weightStats.min}-${demo.weightStats.max} kg)`;
      }

      if (demo.targetGlucoseRange) {
        demographicsSection += `\n- Rango objetivo promedio de glucosa: ${demo.targetGlucoseRange.averageMin.toFixed(0)}-${demo.targetGlucoseRange.averageMax.toFixed(0)} mg/dL`;
      }
    }

    const prompt = `Eres un experto en diabetes y análisis de datos de glucosa. Tu tarea es generar un resumen profesional de aproximadamente 500 palabras basado en los datos agregados de un grupo de pacientes con diabetes.

Instrucciones importantes:
- NO uses formato markdown (sin ##, **, etc.).
- NO incluyas fechas exactas ni información personal.
- NO inventes información que no esté en los datos.
- El resumen debe ser claro, profesional, útil para un médico, y con lenguaje médico accesible.
- Enfócate en patrones y tendencias del grupo, no en pacientes individuales.
- Incluye observaciones y recomendaciones basadas únicamente en los datos provistos del grupo.

${demographicsSection}

Datos agregados de glucosa:
${
  sanitizedData.glucose
    ? `- Total de lecturas: ${sanitizedData.glucose.totalReadings}
- Promedio: ${sanitizedData.glucose.average.toFixed(1)} mg/dL
- Mediana: ${sanitizedData.glucose.median.toFixed(1)} mg/dL
- Rango: ${sanitizedData.glucose.min}-${sanitizedData.glucose.max} mg/dL
- Percentil 25: ${sanitizedData.glucose.p25} mg/dL
- Percentil 75: ${sanitizedData.glucose.p75} mg/dL
- Coeficiente de variación: ${sanitizedData.glucose.cv.toFixed(1)}%
- Lecturas en rango objetivo: ${sanitizedData.glucose.inRange} (${sanitizedData.glucose.inRangePercent.toFixed(1)}%)
- Hipoglucemias (<70 mg/dL): ${sanitizedData.glucose.hypoglycemia} (${sanitizedData.glucose.hypoglycemiaPercent.toFixed(1)}%)
- Hipoglucemias severas (<54 mg/dL): ${sanitizedData.glucose.severeHypoglycemia} (${sanitizedData.glucose.severeHypoglycemiaPercent.toFixed(1)}%)
- Hiperglucemias (>180 mg/dL): ${sanitizedData.glucose.hyperglycemia} (${sanitizedData.glucose.hyperglycemiaPercent.toFixed(1)}%)
- Hiperglucemias severas (>250 mg/dL): ${sanitizedData.glucose.severeHyperglycemia} (${sanitizedData.glucose.severeHyperglycemiaPercent.toFixed(1)}%)`
    : "No hay datos de glucosa disponibles"
}

Datos agregados de insulina:
${
  sanitizedData.insulin
    ? `- Total de dosis: ${sanitizedData.insulin.totalDoses}
- Total de unidades: ${sanitizedData.insulin.totalUnits.toFixed(1)} U
- Promedio por dosis: ${sanitizedData.insulin.averageDose.toFixed(1)} U
- Promedio diario total: ${sanitizedData.insulin.averageDailyUnits.toFixed(1)} U/día
- Promedio diario por paciente: ${sanitizedData.insulin.averageDailyUnitsPerPatient.toFixed(1)} U/día/paciente
- Basal: ${sanitizedData.insulin.basalDoses} dosis, ${sanitizedData.insulin.basalUnits.toFixed(1)} U
- Bolus: ${sanitizedData.insulin.bolusDoses} dosis, ${sanitizedData.insulin.bolusUnits.toFixed(1)} U`
    : "No hay datos de insulina disponibles"
}

Datos agregados de comidas:
${
  sanitizedData.meals
    ? `- Total de comidas registradas: ${sanitizedData.meals.totalMeals}
- Total de carbohidratos: ${sanitizedData.meals.totalCarbohydrates.toFixed(1)} g
- Promedio por comida: ${sanitizedData.meals.averageCarbsPerMeal.toFixed(1)} g
- Promedio diario total: ${sanitizedData.meals.averageDailyCarbs.toFixed(1)} g/día
- Promedio diario por paciente: ${sanitizedData.meals.averageDailyCarbsPerPatient.toFixed(1)} g/día/paciente`
    : "No hay datos de comidas disponibles"
}

Genera un resumen que incluya:
1. Evaluación general del control glucémico del grupo.
2. Análisis de patrones y tendencias observadas en el grupo.
3. Análisis del tiempo en rango y eventos de hipo/hiperglucemia a nivel grupal.
4. Evaluación del uso de insulina y su adecuación en el grupo.
5. Recomendaciones generales basadas en los datos agregados del grupo.
6. Áreas de mejora identificadas para optimizar el control glucémico del grupo.

Asegúrate de que el resumen sea coherente, profesional, y fácil de interpretar para un médico tratante. Enfócate en el análisis de cohorte y patrones grupales, no en pacientes individuales. Evita repeticiones y mantén un flujo lógico de la información.
`;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();

      // Clean markdown formatting and redundant information
      text = this.cleanAISummaryText(text);

      return text;
    } catch (error) {
      this.logger.error("Error generating group AI summary", error);
      throw error;
    }
  }

  /**
   * Clean AI summary text by removing markdown and redundant information
   */
  private cleanAISummaryText(text: string): string {
    // Remove markdown headers (##, ###, etc.)
    text = text.replace(/^#{1,6}\s+/gm, "");

    // Remove bold/italic markdown (**text**, *text*, __text__, _text_)
    text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
    text = text.replace(/\*([^*]+)\*/g, "$1");
    text = text.replace(/__([^_]+)__/g, "$1");
    text = text.replace(/_([^_]+)_/g, "$1");

    // Remove markdown links [text](url)
    text = text.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");

    // Remove lines that contain redundant information
    const redundantPatterns = [
      /^.*Resumen del Análisis.*$/gim,
      /^.*Paciente.*$/gim,
      /^.*\[Datos sanitizados\].*$/gim,
      /^.*Fecha:.*$/gim,
      /^.*Fecha del análisis.*$/gim,
      /^.*Período.*$/gim,
    ];

    redundantPatterns.forEach((pattern) => {
      text = text.replace(pattern, "");
    });

    // Remove empty lines at the beginning
    text = text.replace(/^\s*\n+/gm, "");

    // Clean up multiple consecutive empty lines (keep max 2)
    text = text.replace(/\n{3,}/g, "\n\n");

    // Trim the result
    text = text.trim();

    return text;
  }
}
