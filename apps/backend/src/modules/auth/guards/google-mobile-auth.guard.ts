import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/**
 * Guard for Google OAuth authentication (Mobile)
 */
@Injectable()
export class GoogleMobileAuthGuard extends AuthGuard("google-mobile") {}
