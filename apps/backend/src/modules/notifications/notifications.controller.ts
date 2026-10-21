import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthUser } from "../auth/decorators/auth-user.decorator";
import { UserResponseDto } from "../auth/dto/auth-response.dto";
import { NotificationsService } from "./notifications.service";
import { RegisterPushDeviceDto, UnregisterPushDeviceDto } from "./dto/register-push-device.dto";

@ApiTags("push")
@Controller({ path: "push", version: "1" })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post("register")
  @ApiOperation({ summary: "Register or refresh a mobile push token" })
  @ApiResponse({ status: 201, description: "Push token registered successfully" })
  async register(
    @AuthUser() user: UserResponseDto,
    @Body() dto: RegisterPushDeviceDto,
  ): Promise<{ success: true }> {
    await this.notificationsService.registerPushDevice(user.id, dto);
    return { success: true };
  }

  @Post("unregister")
  @ApiOperation({ summary: "Unregister a mobile push token" })
  @ApiResponse({ status: 200, description: "Push token unregistered successfully" })
  async unregister(
    @AuthUser() user: UserResponseDto,
    @Body() dto: UnregisterPushDeviceDto,
  ): Promise<{ success: true }> {
    await this.notificationsService.unregisterPushDevice(user.id, dto.expoPushToken);
    return { success: true };
  }
}
