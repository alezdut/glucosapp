import { Controller, Post, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { InsulinDosesService } from "./insulin-doses.service";
import { CreateInsulinDoseDto } from "./dto/create-insulin-dose.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthUser } from "../auth/decorators/auth-user.decorator";
import { UserResponseDto } from "../auth/dto/auth-response.dto";

/**
 * Controller handling insulin doses endpoints
 */
@ApiTags("insulin-doses")
@Controller({ path: "insulin-doses", version: "1" })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InsulinDosesController {
  constructor(private readonly insulinDosesService: InsulinDosesService) {}

  /**
   * Create insulin dose
   */
  @Post()
  @ApiOperation({ summary: "Create insulin dose" })
  @ApiResponse({ status: 201, description: "Dose created successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 400, description: "Invalid input" })
  async create(@AuthUser() user: UserResponseDto, @Body() createDto: CreateInsulinDoseDto) {
    return this.insulinDosesService.create(user.id, createDto);
  }
}
