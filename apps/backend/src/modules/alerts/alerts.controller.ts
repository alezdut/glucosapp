import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  ValidationPipe,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { AlertsService } from "./alerts.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthUser } from "../auth/decorators/auth-user.decorator";
import { UserResponseDto } from "../auth/dto/auth-response.dto";
import { AlertResponseDto } from "./dto/alert-response.dto";
import { AlertSettingsResponseDto, UpdateAlertSettingsDto } from "./dto/alert-settings.dto";
import { GetAlertsQueryDto } from "./dto/get-alerts-query.dto";

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
   * Get alerts with optional filters
   */
  @Get()
  @ApiOperation({ summary: "Get alerts with optional filters" })
  @ApiResponse({
    status: 200,
    description: "Alerts retrieved successfully",
    type: [AlertResponseDto],
  })
  @ApiResponse({ status: 403, description: "Forbidden - Only doctors can access" })
  async findAll(
    @AuthUser() user: UserResponseDto,
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: GetAlertsQueryDto,
  ): Promise<AlertResponseDto[]> {
    const { limit, acknowledged, severity, sinceHours, patientId } = query;
    return this.alertsService.findAllWithFilters(user.id, {
      limit,
      acknowledged,
      severity,
      sinceHours,
      patientId,
    });
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
