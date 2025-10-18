import { Controller, Post, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { GlucoseEntriesService } from "./glucose-entries.service";
import { CreateGlucoseEntryDto } from "./dto/create-glucose-entry.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthUser } from "../auth/decorators/auth-user.decorator";
import { UserResponseDto } from "../auth/dto/auth-response.dto";

/**
 * Controller handling glucose entries endpoints
 */
@ApiTags("glucose-entries")
@Controller({ path: "glucose-entries", version: "1" })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GlucoseEntriesController {
  constructor(private readonly glucoseEntriesService: GlucoseEntriesService) {}

  /**
   * Create glucose entry
   */
  @Post()
  @ApiOperation({ summary: "Create glucose entry" })
  @ApiResponse({ status: 201, description: "Entry created successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 400, description: "Invalid input" })
  async create(@AuthUser() user: UserResponseDto, @Body() createDto: CreateGlucoseEntryDto) {
    return this.glucoseEntriesService.create(user.id, createDto);
  }
}
