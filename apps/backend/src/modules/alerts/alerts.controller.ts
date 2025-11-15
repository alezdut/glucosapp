import { Controller, Get, Post, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { AlertsService } from "./alerts.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthUser } from "../auth/decorators/auth-user.decorator";
import { UserResponseDto } from "../auth/dto/auth-response.dto";
import { AlertResponseDto } from "./dto/alert-response.dto";

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
}
