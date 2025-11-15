/**
 * Password validation utilities
 */

export type PasswordStrength = "weak" | "medium" | "strong";

/**
 * Validates password strength based on character requirements
 */
export function validatePassword(pwd: string): PasswordStrength {
  const hasUpper = /[A-Z]/.test(pwd);
  const hasNumber = /\d/.test(pwd);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);
  const isLongEnough = pwd.length >= 8;

  if (hasUpper && hasNumber && hasSpecial && isLongEnough) return "strong";
  if ((hasUpper || hasNumber) && isLongEnough) return "medium";
  return "weak";
}

/**
 * Gets color for password strength indicator
 */
export function getStrengthColor(strength: PasswordStrength): string {
  if (strength === "strong") return "#22c55e";
  if (strength === "medium") return "#eab308";
  return "#ef4444";
}

/**
 * Gets progress value (0-100) for password strength
 */
export function getStrengthValue(strength: PasswordStrength): number {
  if (strength === "strong") return 100;
  if (strength === "medium") return 66;
  return 33;
}

/**
 * Gets localized label for password strength
 */
export function getStrengthLabel(strength: PasswordStrength): string {
  if (strength === "strong") return "Fuerte";
  if (strength === "medium") return "Media";
  return "Débil";
}
