/**
 * @glucosapp/auth-utils
 * Shared authentication utilities for web and mobile applications
 */

export {
  getTokenExpiration,
  isTokenExpiringSoon,
  isTokenExpired,
  getTimeUntilExpiration,
  type JwtPayload,
} from "./token-utils";
