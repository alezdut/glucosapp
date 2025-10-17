import { Controller, Get, Patch, Body, UseGuards, Req } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { ProfileService } from "./profile.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { ProfileResponseDto } from "./dto/profile-response.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Request } from "express";

/**
 * Controller handling profile endpoints
 */
@ApiTags("profile")
@Controller({ path: "profile", version: "1" })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  /**
   * Get current user profile
   */
  @Get()
  @ApiOperation({ summary: "Get current user profile" })
  @ApiResponse({
    status: 200,
    description: "User profile data",
    type: ProfileResponseDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getProfile(@Req() req: Request): Promise<ProfileResponseDto> {
    const user = req.user as any;
    return this.profileService.getProfile(user.id);
  }

  /**
   * Update user profile
   */
  @Patch()
  @ApiOperation({ summary: "Update user profile" })
  @ApiResponse({
    status: 200,
    description: "Profile updated successfully",
    type: ProfileResponseDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 400, description: "Invalid input" })
  async updateProfile(
    @Req() req: Request,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    const user = req.user as any;
    return this.profileService.updateProfile(user.id, updateProfileDto);
  }
}
