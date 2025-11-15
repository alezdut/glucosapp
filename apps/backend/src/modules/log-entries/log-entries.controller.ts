import { Controller, Post, Get, Body, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { LogEntriesService } from "./log-entries.service";
import { CreateLogEntryDto } from "./dto/create-log-entry.dto";
import { QueryLogEntriesDto } from "./dto/query-log-entries.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthUser } from "../auth/decorators/auth-user.decorator";
import { UserResponseDto } from "../auth/dto/auth-response.dto";

/**
 * Controller handling log entries endpoints
 */
@ApiTags("log-entries")
@Controller({ path: "log-entries", version: "1" })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LogEntriesController {
  constructor(private readonly logEntriesService: LogEntriesService) {}

  /**
   * Get all log entries with optional date range filtering
   */
  @Get()
  @ApiOperation({ summary: "Get log entries" })
  @ApiResponse({ status: 200, description: "Log entries retrieved successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async findAll(@AuthUser() user: UserResponseDto, @Query() query: QueryLogEntriesDto) {
    return this.logEntriesService.findAll(user.id, query.startDate, query.endDate);
  }

  /**
   * Create log entry with glucose, insulin, and optional meal
   */
  @Post()
  @ApiOperation({ summary: "Create log entry" })
  @ApiResponse({ status: 201, description: "Log entry created successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 400, description: "Invalid input" })
  async create(@AuthUser() user: UserResponseDto, @Body() createDto: CreateLogEntryDto) {
    return this.logEntriesService.create(user.id, createDto);
  }
}
