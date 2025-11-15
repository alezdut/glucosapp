import { Controller, Post, Get, Body, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthUser } from "../auth/decorators/auth-user.decorator";
import { InsulinCalculationService } from "./insulin-calculation.service";
import { CalculateDoseDto } from "./dto/calculate-dose.dto";
import { PreSleepEvaluationDto } from "./dto/pre-sleep-evaluation.dto";

/**
 * Controller for insulin dose calculations
 */
@ApiTags("Insulin Calculation")
@Controller("v1/insulin-calculation")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InsulinCalculationController {
  constructor(private readonly service: InsulinCalculationService) {}

  @Post("calculate-meal-dose")
  @ApiOperation({ summary: "Calculate insulin dose for a meal" })
  @ApiResponse({ status: 200, description: "Dose calculated successfully" })
  @ApiResponse({ status: 400, description: "Invalid input parameters" })
  @ApiResponse({ status: 404, description: "User not found" })
  async calculateMealDose(@AuthUser() user: { id: string }, @Body() dto: CalculateDoseDto) {
    return this.service.calculateMealDose(user.id, dto);
  }

  @Post("calculate-correction")
  @ApiOperation({ summary: "Calculate correction dose between meals" })
  @ApiResponse({ status: 200, description: "Correction dose calculated" })
  @ApiResponse({ status: 400, description: "Invalid glucose value" })
  @ApiResponse({ status: 404, description: "User not found" })
  async calculateCorrection(@AuthUser() user: { id: string }, @Body() dto: CalculateDoseDto) {
    return this.service.calculateCorrection(user.id, dto);
  }

  @Post("evaluate-pre-sleep")
  @ApiOperation({ summary: "Evaluate safety before sleep" })
  @ApiResponse({ status: 200, description: "Pre-sleep evaluation completed" })
  @ApiResponse({ status: 400, description: "Invalid glucose value" })
  @ApiResponse({ status: 404, description: "User not found" })
  async evaluatePreSleep(@AuthUser() user: { id: string }, @Body() dto: PreSleepEvaluationDto) {
    return this.service.evaluateBeforeSleep(user.id, dto.glucose);
  }

  @Get("current-iob")
  @ApiOperation({ summary: "Get current insulin on board (IOB)" })
  @ApiResponse({ status: 200, description: "IOB calculated" })
  @ApiResponse({ status: 404, description: "User not found" })
  async getCurrentIOB(@AuthUser() user: { id: string }) {
    const iob = await this.service.getCurrentIOB(user.id);
    return { iob };
  }
}
