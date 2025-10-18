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
}
