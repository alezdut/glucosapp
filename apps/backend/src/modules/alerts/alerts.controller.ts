import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { AlertsService } from "./alerts.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthUser } from "../auth/decorators/auth-user.decorator";
import { UserResponseDto } from "../auth/dto/auth-response.dto";
import { AlertResponseDto } from "./dto/alert-response.dto";
import { AlertSettingsResponseDto, UpdateAlertSettingsDto } from "./dto/alert-settings.dto";

/**
 * Controller handling alerts
 */
@ApiTags("alerts")
@Controller({ path: "alerts", version: "1" })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  /**
   * Get all alerts for doctor's patients
   */
  @Get()
  @ApiOperation({ summary: "Get all alerts" })
  @ApiResponse({
    status: 200,
    description: "Alerts retrieved successfully",
    type: [AlertResponseDto],
  })
  @ApiResponse({ status: 403, description: "Forbidden - Only doctors can access" })
  async findAll(
    @AuthUser() user: UserResponseDto,
    @Query("limit") limit?: string,
  ): Promise<AlertResponseDto[]> {
    const limitNumber = limit ? parseInt(limit, 10) : 50;
    return this.alertsService.findAll(user.id, limitNumber);
  }

  /**
   * Get critical alerts
   */
  @Get("critical")
  @ApiOperation({ summary: "Get critical alerts" })
  @ApiResponse({
    status: 200,
    description: "Critical alerts retrieved successfully",
    type: [AlertResponseDto],
  })
  @ApiResponse({ status: 403, description: "Forbidden - Only doctors can access" })
  async getCritical(@AuthUser() user: UserResponseDto): Promise<AlertResponseDto[]> {
    return this.alertsService.getCritical(user.id);
  }

  /**
   * Get recent alerts (last 24 hours)
   */
  @Get("recent")
  @ApiOperation({ summary: "Get recent alerts" })
  @ApiResponse({
    status: 200,
    description: "Recent alerts retrieved successfully",
    type: [AlertResponseDto],
  })
  @ApiResponse({ status: 403, description: "Forbidden - Only doctors can access" })
  async getRecent(
    @AuthUser() user: UserResponseDto,
    @Query("limit") limit?: string,
  ): Promise<AlertResponseDto[]> {
    const limitNumber = limit ? parseInt(limit, 10) : 10;
    return this.alertsService.getRecent(user.id, limitNumber);
  }

  /**
   * Acknowledge an alert
   */
  @Post(":id/acknowledge")
  @ApiOperation({ summary: "Acknowledge alert" })
  @ApiResponse({
    status: 200,
    description: "Alert acknowledged successfully",
    type: AlertResponseDto,
  })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "Alert not found" })
  async acknowledge(
    @AuthUser() user: UserResponseDto,
    @Param("id") id: string,
  ): Promise<AlertResponseDto> {
    return this.alertsService.acknowledge(user.id, id);
  }

  /**
   * Get alert settings for doctor's patients
   * - Only doctors can access alert settings
   * - Returns settings that apply to all assigned patients
   */
  @Get("settings")
  @ApiOperation({ summary: "Get alert settings for doctor's patients (doctors only)" })
  @ApiResponse({
    status: 200,
    description: "Alert settings retrieved successfully",
    type: AlertSettingsResponseDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Only doctors can access" })
  async getAlertSettings(@AuthUser() user: UserResponseDto): Promise<AlertSettingsResponseDto> {
    return this.alertsService.getAlertSettings(user.id);
  }

  /**
   * Update alert settings for all doctor's patients
   * - Only doctors can update alert settings
   * - Updates settings for all assigned patients
   */
  @Patch("settings")
  @ApiOperation({ summary: "Update alert settings for all doctor's patients (doctors only)" })
  @ApiResponse({
    status: 200,
    description: "Alert settings updated successfully",
    type: AlertSettingsResponseDto,
  })
  @ApiResponse({ status: 400, description: "Invalid input" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Only doctors can access" })
  async updateAlertSettings(
    @AuthUser() user: UserResponseDto,
    @Body() updateDto: UpdateAlertSettingsDto,
  ): Promise<AlertSettingsResponseDto> {
    return this.alertsService.updateAlertSettings(user.id, updateDto);
  }
}
