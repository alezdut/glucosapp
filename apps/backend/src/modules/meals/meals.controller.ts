import { Controller, Post, Get, Delete, Body, Param, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { MealsService } from "./meals.service";
import { CreateMealDto } from "./dto/create-meal.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthUser } from "../auth/decorators/auth-user.decorator";
import { UserResponseDto } from "../auth/dto/auth-response.dto";

/**
 * Controller handling meal template endpoints
 */
@ApiTags("meals")
@Controller({ path: "meals", version: "1" })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MealsController {
  constructor(private readonly mealsService: MealsService) {}

  /**
   * Create meal template
   */
  @Post()
  @ApiOperation({ summary: "Create meal template with food items" })
  @ApiResponse({ status: 201, description: "Meal template created successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 400, description: "Invalid input" })
  async create(@AuthUser() user: UserResponseDto, @Body() createDto: CreateMealDto) {
    return this.mealsService.create(user.id, createDto);
  }

  /**
   * Get all meal templates
   */
  @Get()
  @ApiOperation({ summary: "Get all meal templates for current user" })
  @ApiResponse({ status: 200, description: "List of meal templates" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async findAll(@AuthUser() user: UserResponseDto) {
    return this.mealsService.findAll(user.id);
  }

  /**
   * Get specific meal template
   */
  @Get(":id")
  @ApiOperation({ summary: "Get specific meal template" })
  @ApiResponse({ status: 200, description: "Meal template details" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Meal template not found" })
  async findOne(@AuthUser() user: UserResponseDto, @Param("id") id: string) {
    return this.mealsService.findOne(user.id, id);
  }

  /**
   * Delete meal template
   */
  @Delete(":id")
  @ApiOperation({ summary: "Delete meal template" })
  @ApiResponse({ status: 200, description: "Meal template deleted successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Meal template not found" })
  async delete(@AuthUser() user: UserResponseDto, @Param("id") id: string) {
    return this.mealsService.delete(user.id, id);
  }
}
