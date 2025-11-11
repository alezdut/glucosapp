import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { StatisticsService } from "./statistics.service";
import { StatisticsResponseDto } from "./dto/statistics-response.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthUser } from "../auth/decorators/auth-user.decorator";
import { UserResponseDto } from "../auth/dto/auth-response.dto";

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
  async getSummary(@AuthUser() user: UserResponseDto): Promise<StatisticsResponseDto> {
    return this.statisticsService.getSummary(user.id);
  }

  /**
   * Get weekly glucose average (last 7 days)
   */
  @Get("weekly-glucose-average")
  @ApiOperation({ summary: "Get weekly glucose average" })
  @ApiResponse({
    status: 200,
    description: "Weekly glucose average",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getWeeklyGlucoseAverage(@AuthUser() user: UserResponseDto) {
    return this.statisticsService.getWeeklyGlucoseAverage(user.id);
  }

  /**
   * Get daily insulin average (last 7 days)
   */
  @Get("daily-insulin-average")
  @ApiOperation({ summary: "Get daily insulin average" })
  @ApiResponse({
    status: 200,
    description: "Daily insulin average",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getDailyInsulinAverage(@AuthUser() user: UserResponseDto) {
    return this.statisticsService.getDailyInsulinAverage(user.id);
  }

  /**
   * Get glucose trend for the last 7 days (daily averages)
   */
  @Get("glucose-trend")
  @ApiOperation({ summary: "Get glucose trend (last 7 days - daily averages)" })
  @ApiResponse({
    status: 200,
    description: "Glucose trend data with daily averages",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getGlucoseTrend(@AuthUser() user: UserResponseDto) {
    return this.statisticsService.getGlucoseTrend(user.id);
  }
}
