import { Controller, Post, Body, UseGuards, Req } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { GlucoseEntriesService } from "./glucose-entries.service";
import { CreateGlucoseEntryDto } from "./dto/create-glucose-entry.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Request } from "express";

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
  async create(@Req() req: Request, @Body() createDto: CreateGlucoseEntryDto) {
    const user = req.user as any;
    return this.glucoseEntriesService.create(user.id, createDto);
  }
}
