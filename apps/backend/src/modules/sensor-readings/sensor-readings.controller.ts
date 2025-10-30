import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Header,
  Res,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { Response } from "express";
import { SensorReadingsService } from "./sensor-readings.service";
import { CreateSensorReadingDto } from "./dto/create-sensor-reading.dto";
import { BatchCreateSensorReadingsDto } from "./dto/batch-create-sensor-readings.dto";
import { ExportReadingsQueryDto, ExportFormat } from "./dto/export-readings-query.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthUser } from "../auth/decorators/auth-user.decorator";
import { UserResponseDto } from "../auth/dto/auth-response.dto";

/**
 * Controller for sensor readings endpoints
 * Handles CGM data ingestion, retrieval, and export
 */
@ApiTags("sensor-readings")
@Controller({ path: "sensor-readings", version: "1" })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SensorReadingsController {
  constructor(private readonly sensorReadingsService: SensorReadingsService) {}

  /**
   * Create a single sensor reading
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a single sensor reading" })
  @ApiResponse({ status: 201, description: "Reading created successfully" })
  @ApiResponse({ status: 400, description: "Invalid input" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async createReading(
    @AuthUser() user: UserResponseDto,
    @Body() createDto: CreateSensorReadingDto,
  ) {
    return this.sensorReadingsService.createReading(user.id, createDto);
  }

  /**
   * Batch create sensor readings
   */
  @Post("batch")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Batch create sensor readings" })
  @ApiResponse({ status: 201, description: "Readings created successfully" })
  @ApiResponse({ status: 400, description: "Invalid input or too many readings" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async batchCreateReadings(
    @AuthUser() user: UserResponseDto,
    @Body() batchDto: BatchCreateSensorReadingsDto,
  ) {
    return this.sensorReadingsService.batchCreateReadings(user.id, batchDto);
  }

  /**
   * Export sensor readings
   */
  @Get("export")
  @ApiOperation({ summary: "Export sensor readings as JSON or CSV" })
  @ApiResponse({ status: 200, description: "Export successful" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async exportReadings(
    @AuthUser() user: UserResponseDto,
    @Query() query: ExportReadingsQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const exportData = await this.sensorReadingsService.exportReadings(user.id, query);

    const format = query.format || ExportFormat.JSON;

    if (format === ExportFormat.CSV) {
      // Return CSV file
      const filename = `glucosapp_readings_${new Date().toISOString().split("T")[0]}.csv`;
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      return exportData;
    }

    // Return JSON - passthrough permite que NestJS maneje la respuesta normalmente
    return exportData;
  }

  /**
   * Get the most recent sensor reading for the user
   */
  @Get("latest")
  @ApiOperation({ summary: "Get the most recent sensor reading" })
  @ApiResponse({ status: 200, description: "Latest reading retrieved successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getLatestReading(@AuthUser() user: UserResponseDto) {
    return this.sensorReadingsService.getLatestReading(user.id);
  }

  /**
   * Get sensor reading statistics
   */
  @Get("statistics")
  @ApiOperation({ summary: "Get sensor reading statistics" })
  @ApiResponse({ status: 200, description: "Statistics retrieved successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getStatistics(@AuthUser() user: UserResponseDto, @Query("days") days?: string) {
    const numDays = days ? parseInt(days, 10) : 30;
    return this.sensorReadingsService.getStatistics(user.id, numDays);
  }
}
