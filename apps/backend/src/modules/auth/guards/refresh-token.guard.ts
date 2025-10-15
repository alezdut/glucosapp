import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/**
 * Guard for refresh token validation
 */
@Injectable()
export class RefreshTokenGuard extends AuthGuard("jwt-refresh") {}
