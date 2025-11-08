import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import type { Prisma } from "@prisma/client";
import { DoctorPatientService } from "./doctor-patient.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthUser } from "../auth/decorators/auth-user.decorator";
import { UserResponseDto } from "../auth/dto/auth-response.dto";
import { CreateDoctorPatientDto } from "./dto/create-doctor-patient.dto";
import { DoctorPatientResponseDto } from "./dto/doctor-patient-response.dto";
import { PatientListItemDto } from "./dto/patient-list-item.dto";
import { GetPatientsQueryDto } from "./dto/get-patients-query.dto";
import { SearchPatientsDto } from "./dto/search-patients.dto";
import { PatientDetailsDto } from "./dto/patient-details.dto";
import { UpdatePatientProfileDto } from "./dto/update-patient-profile.dto";
import { PatientProfileDto } from "./dto/patient-profile.dto";

type LogEntryWithMealTemplate = Prisma.LogEntryGetPayload<{
  include: {
    mealTemplate: {
      include: {
        foodItems: true;
      };
    };
  };
}>;

/**
 * Controller handling doctor-patient relationships
 */
@ApiTags("doctor-patients")
@Controller({ path: "doctor-patients", version: "1" })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DoctorPatientController {
  constructor(private readonly doctorPatientService: DoctorPatientService) {}

  /**
   * Get all patients for the authenticated doctor with filters
   */
  @Get()
  @ApiOperation({ summary: "Get all patients for doctor with filters" })
  @ApiResponse({
    status: 200,
    description: "Patients retrieved successfully",
    type: [PatientListItemDto],
  })
  @ApiResponse({ status: 403, description: "Forbidden - Only doctors can access" })
  async getPatients(
    @AuthUser() user: UserResponseDto,
    @Query() query: GetPatientsQueryDto,
  ): Promise<PatientListItemDto[]> {
    return this.doctorPatientService.getPatients(user.id, query);
  }

  /**
   * Search for patients globally (all patients, not just assigned)
   * Returns only patients not yet assigned to the doctor
   */
  @Get("search")
  @ApiOperation({ summary: "Search for patients globally (name, last name, or email)" })
  @ApiResponse({ status: 200, description: "Search results", type: [PatientListItemDto] })
  @ApiResponse({ status: 403, description: "Forbidden - Only doctors can access" })
  async searchGlobalPatients(
    @AuthUser() user: UserResponseDto,
    @Query() query: SearchPatientsDto,
  ): Promise<PatientListItemDto[]> {
    return this.doctorPatientService.searchGlobalPatients(user.id, query);
  }

  /**
   * Assign a patient to the authenticated doctor
   */
  @Post()
  @ApiOperation({ summary: "Assign patient to doctor" })
  @ApiResponse({
    status: 201,
    description: "Patient assigned successfully",
    type: DoctorPatientResponseDto,
  })
  @ApiResponse({ status: 403, description: "Forbidden - Only doctors can access" })
  @ApiResponse({ status: 404, description: "Patient not found" })
  @ApiResponse({ status: 409, description: "Patient already assigned" })
  async assignPatient(
    @AuthUser() user: UserResponseDto,
    @Body() createDto: CreateDoctorPatientDto,
  ): Promise<DoctorPatientResponseDto> {
    return this.doctorPatientService.assignPatient(user.id, createDto);
  }

  /**
   * Get meals for a specific patient with optional date range
   */
  @Get(":patientId/meals")
  @ApiOperation({ summary: "Get patient meals with optional date range" })
  @ApiResponse({ status: 200, description: "Patient meals retrieved successfully" })
  @ApiResponse({ status: 403, description: "Forbidden - Patient not assigned to doctor" })
  async getPatientMeals(
    @AuthUser() user: UserResponseDto,
    @Param("patientId") patientId: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ): Promise<LogEntryWithMealTemplate[]> {
    return this.doctorPatientService.getPatientMeals(user.id, patientId, startDate, endDate);
  }

  /**
   * Get unified log entries (historial) for a patient with optional date range
   */
  @Get(":patientId/log-entries")
  @ApiOperation({ summary: "Get patient log entries (historial) with optional date range" })
  @ApiResponse({ status: 200, description: "Patient log entries retrieved successfully" })
  @ApiResponse({ status: 403, description: "Forbidden - Patient not assigned to doctor" })
  async getPatientLogEntries(
    @AuthUser() user: UserResponseDto,
    @Param("patientId") patientId: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.doctorPatientService.getPatientLogEntries(user.id, patientId, startDate, endDate);
  }

  /**
   * Get patient profile/parameters
   */
  @Get(":patientId/profile")
  @ApiOperation({ summary: "Get patient profile/parameters" })
  @ApiResponse({
    status: 200,
    description: "Patient profile retrieved successfully",
    type: PatientProfileDto,
  })
  @ApiResponse({ status: 403, description: "Forbidden - Patient not assigned to doctor" })
  @ApiResponse({ status: 404, description: "Patient not found" })
  async getPatientProfile(
    @AuthUser() user: UserResponseDto,
    @Param("patientId") patientId: string,
  ): Promise<PatientProfileDto> {
    return this.doctorPatientService.getPatientProfile(user.id, patientId);
  }

  /**
   * Update patient profile/parameters
   */
  @Patch(":patientId/profile")
  @ApiOperation({ summary: "Update patient profile/parameters" })
  @ApiResponse({ status: 200, description: "Patient profile updated successfully" })
  @ApiResponse({ status: 403, description: "Forbidden - Patient not assigned to doctor" })
  @ApiResponse({ status: 404, description: "Patient not found" })
  @ApiResponse({ status: 400, description: "Invalid input data" })
  async updatePatientProfile(
    @AuthUser() user: UserResponseDto,
    @Param("patientId") patientId: string,
    @Body() updateData: UpdatePatientProfileDto,
  ) {
    return this.doctorPatientService.updatePatientProfile(user.id, patientId, updateData);
  }

  /**
   * Get detailed information about a specific patient
   */
  @Get(":patientId")
  @ApiOperation({ summary: "Get patient details" })
  @ApiResponse({
    status: 200,
    description: "Patient details retrieved successfully",
    type: PatientDetailsDto,
  })
  @ApiResponse({ status: 403, description: "Forbidden - Patient not assigned to doctor" })
  @ApiResponse({ status: 404, description: "Patient not found" })
  async getPatientDetails(
    @AuthUser() user: UserResponseDto,
    @Param("patientId") patientId: string,
  ): Promise<PatientDetailsDto> {
    return this.doctorPatientService.getPatientDetails(user.id, patientId);
  }

  /**
   * Remove a patient from the authenticated doctor
   */
  @Delete(":patientId")
  @ApiOperation({ summary: "Remove patient from doctor" })
  @ApiResponse({ status: 200, description: "Patient removed successfully" })
  @ApiResponse({ status: 403, description: "Forbidden - Only doctors can access" })
  @ApiResponse({ status: 404, description: "Patient relationship not found" })
  async removePatient(
    @AuthUser() user: UserResponseDto,
    @Param("patientId") patientId: string,
  ): Promise<{ message: string }> {
    return this.doctorPatientService.removePatient(user.id, patientId);
  }
}
