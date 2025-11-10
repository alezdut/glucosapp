import { UpdateProfileDto } from "../../profile/dto/update-profile.dto";

/**
 * DTO for updating patient profile by doctor
 * Reuses the same validation as user profile updates
 */
export class UpdatePatientProfileDto extends UpdateProfileDto {}
