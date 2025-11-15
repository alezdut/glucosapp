import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/**
 * Guard for Google OAuth authentication
 */
@Injectable()
export class GoogleAuthGuard extends AuthGuard("google") {}
