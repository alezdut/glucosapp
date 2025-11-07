import { Controller, Get, UseGuards, Query, Param } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { DashboardService } from "./dashboard.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthUser } from "../auth/decorators/auth-user.decorator";
import { UserResponseDto } from "../auth/dto/auth-response.dto";
import { DashboardSummaryDto } from "./dto/dashboard-summary.dto";
import { GlucoseEvolutionDto } from "./dto/glucose-evolution.dto";
import { InsulinStatsDto } from "./dto/insulin-stats.dto";
import { MealStatsDto } from "./dto/meal-stats.dto";
import { PatientGlucoseEvolutionDto } from "./dto/patient-glucose-evolution.dto";
import { PatientInsulinStatsDto } from "./dto/patient-insulin-stats.dto";
import { AlertsService } from "../alerts/alerts.service";
import { AlertResponseDto } from "../alerts/dto/alert-response.dto";

/**
 * Controller handling dashboard endpoints
 */
@ApiTags("dashboard")
@Controller({ path: "dashboard", version: "1" })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly alertsService: AlertsService,
  ) {}

  /**
   * Get dashboard summary (active patients, critical alerts, upcoming appointments)
   */
  @Get("summary")
  @ApiOperation({ summary: "Get dashboard summary" })
  @ApiResponse({
    status: 200,
    description: "Dashboard summary retrieved successfully",
    type: DashboardSummaryDto,
  })
  @ApiResponse({ status: 403, description: "Forbidden - Only doctors can access" })
  async getSummary(@AuthUser() user: UserResponseDto): Promise<DashboardSummaryDto> {
    return this.dashboardService.getSummary(user.id);
  }

  /**
   * Get glucose evolution data for the last 15 days (daily average of all patients)
   */
  @Get("glucose-evolution")
  @ApiOperation({ summary: "Get glucose evolution data for last 15 days" })
  @ApiResponse({
    status: 200,
    description: "Glucose evolution data retrieved successfully",
    type: GlucoseEvolutionDto,
  })
  @ApiResponse({ status: 403, description: "Forbidden - Only doctors can access" })
  async getGlucoseEvolution(@AuthUser() user: UserResponseDto): Promise<GlucoseEvolutionDto> {
    return this.dashboardService.getGlucoseEvolution(user.id);
  }

  /**
   * Get insulin statistics
   */
  @Get("insulin-stats")
  @ApiOperation({ summary: "Get insulin statistics" })
  @ApiResponse({
    status: 200,
    description: "Insulin statistics retrieved successfully",
    type: InsulinStatsDto,
  })
  @ApiResponse({ status: 403, description: "Forbidden - Only doctors can access" })
  async getInsulinStats(
    @AuthUser() user: UserResponseDto,
    @Query("days") days?: string,
  ): Promise<InsulinStatsDto> {
    const daysNumber = days ? parseInt(days, 10) : 30;
    return this.dashboardService.getInsulinStats(user.id, daysNumber);
  }

  /**
   * Get meal statistics
   */
  @Get("meal-stats")
  @ApiOperation({ summary: "Get meal statistics" })
  @ApiResponse({
    status: 200,
    description: "Meal statistics retrieved successfully",
    type: MealStatsDto,
  })
  @ApiResponse({ status: 403, description: "Forbidden - Only doctors can access" })
  async getMealStats(
    @AuthUser() user: UserResponseDto,
    @Query("days") days?: string,
  ): Promise<MealStatsDto> {
    const daysNumber = days ? parseInt(days, 10) : 30;
    return this.dashboardService.getMealStats(user.id, daysNumber);
  }

  /**
   * Get recent alerts
   */
  @Get("recent-alerts")
  @ApiOperation({ summary: "Get recent alerts" })
  @ApiResponse({
    status: 200,
    description: "Recent alerts retrieved successfully",
    type: [AlertResponseDto],
  })
  @ApiResponse({ status: 403, description: "Forbidden - Only doctors can access" })
  async getRecentAlerts(
    @AuthUser() user: UserResponseDto,
    @Query("limit") limit?: string,
  ): Promise<AlertResponseDto[]> {
    const limitNumber = limit ? parseInt(limit, 10) : 10;
    return this.alertsService.getRecent(user.id, limitNumber);
  }

  /**
   * Get glucose evolution data for a specific patient (last 12 months)
   */
  @Get("patients/:patientId/glucose-evolution")
  @ApiOperation({ summary: "Get patient glucose evolution data for last 12 months" })
  @ApiResponse({
    status: 200,
    description: "Patient glucose evolution data retrieved successfully",
    type: PatientGlucoseEvolutionDto,
  })
  @ApiResponse({ status: 403, description: "Forbidden - Patient not assigned to doctor" })
  async getPatientGlucoseEvolution(
    @AuthUser() user: UserResponseDto,
    @Param("patientId") patientId: string,
    @Query("months") months?: string,
  ): Promise<PatientGlucoseEvolutionDto> {
    const monthsNumber = months ? parseInt(months, 10) : 12;
    return this.dashboardService.getPatientGlucoseEvolution(user.id, patientId, monthsNumber);
  }

  /**
   * Get insulin statistics for a specific patient (last 12 months)
   */
  @Get("patients/:patientId/insulin-stats")
  @ApiOperation({ summary: "Get patient insulin statistics for last 12 months" })
  @ApiResponse({
    status: 200,
    description: "Patient insulin statistics retrieved successfully",
    type: PatientInsulinStatsDto,
  })
  @ApiResponse({ status: 403, description: "Forbidden - Patient not assigned to doctor" })
  async getPatientInsulinStats(
    @AuthUser() user: UserResponseDto,
    @Param("patientId") patientId: string,
    @Query("months") months?: string,
  ): Promise<PatientInsulinStatsDto> {
    const monthsNumber = months ? parseInt(months, 10) : 12;
    return this.dashboardService.getPatientInsulinStats(user.id, patientId, monthsNumber);
  }
}
