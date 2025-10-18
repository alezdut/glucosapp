import { Controller, Post, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { MealsService } from "./meals.service";
import { CreateMealDto } from "./dto/create-meal.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthUser } from "../auth/decorators/auth-user.decorator";
import { UserResponseDto } from "../auth/dto/auth-response.dto";

/**
 * Controller handling meals endpoints
 */
@ApiTags("meals")
@Controller({ path: "meals", version: "1" })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MealsController {
  constructor(private readonly mealsService: MealsService) {}

  /**
   * Create meal
   */
  @Post()
  @ApiOperation({ summary: "Create meal" })
  @ApiResponse({ status: 201, description: "Meal created successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 400, description: "Invalid input" })
  async create(@AuthUser() user: UserResponseDto, @Body() createDto: CreateMealDto) {
    return this.mealsService.create(user.id, createDto);
  }
}
