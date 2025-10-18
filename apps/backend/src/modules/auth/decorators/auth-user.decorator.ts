import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { UserResponseDto } from "../dto/auth-response.dto";

/**
 * Extracts authenticated user from request
 * Use with @UseGuards(JwtAuthGuard) to ensure user is authenticated
 */
export const AuthUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserResponseDto => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
