import { Controller, Get, UseGuards, Req } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { StatisticsService } from "./statistics.service";
import { StatisticsResponseDto } from "./dto/statistics-response.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Request } from "express";

/**
 * Controller handling statistics endpoints
 */
@ApiTags("statistics")
@Controller({ path: "statistics", version: "1" })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  /**
   * Get summary statistics for home screen
   */
  @Get("summary")
  @ApiOperation({ summary: "Get summary statistics" })
  @ApiResponse({
    status: 200,
    description: "Statistics summary",
    type: StatisticsResponseDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getSummary(@Req() req: Request): Promise<StatisticsResponseDto> {
    const user = req.user as any;
    return this.statisticsService.getSummary(user.id);
  }
}
