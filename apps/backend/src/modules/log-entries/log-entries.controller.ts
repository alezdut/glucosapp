import { Controller, Post, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { LogEntriesService } from "./log-entries.service";
import { CreateLogEntryDto } from "./dto/create-log-entry.dto";
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
