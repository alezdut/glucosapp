import { ApiProperty } from "@nestjs/swagger";
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  Max,
  IsObject,
  ValidateNested,
  ValidateIf,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  Validate,
  Matches,
} from "class-validator";
import { Type } from "class-transformer";
import { parseTimeString } from "@glucosapp/utils";

/**
 * Custom validator to ensure severeHypoglycemiaThreshold < hypoglycemiaThreshold
 */
@ValidatorConstraint({ name: "isSevereHypoglycemiaLessThanHypoglycemia", async: false })
export class IsSevereHypoglycemiaLessThanHypoglycemiaConstraint
  implements ValidatorConstraintInterface
{
  validate(severeThreshold: number, args: ValidationArguments) {
    const dto = args.object as UpdateAlertSettingsDto;
    const hypoglycemiaThreshold = dto.hypoglycemiaThreshold;

    // If hypoglycemiaThreshold is not provided, we can't validate
    if (hypoglycemiaThreshold === undefined || hypoglycemiaThreshold === null) {
      return true;
    }

    // If severeHypoglycemiaThreshold is not provided, validation passes
    if (severeThreshold === undefined || severeThreshold === null) {
      return true;
    }

    return severeThreshold < hypoglycemiaThreshold;
  }

  defaultMessage(args: ValidationArguments) {
    const dto = args.object as UpdateAlertSettingsDto;
    return `El umbral de hipoglucemia severa (${args.value}) debe ser menor que el umbral de hipoglucemia (${dto.hypoglycemiaThreshold})`;
  }
}

/**
 * Custom validator to ensure quietHoursStart and quietHoursEnd form a valid range when both fields are present
 * Allows midnight crossover (e.g., 22:00 to 07:00) but ensures times are not equal
 */
@ValidatorConstraint({ name: "validateQuietHoursRange", async: false })
export class ValidateQuietHoursRangeConstraint implements ValidatorConstraintInterface {
  validate(_: string, args: ValidationArguments) {
    const dto = args.object as UpdateAlertSettingsDto;
    const quietHoursStart = dto.quietHoursStart;
    const quietHoursEnd = dto.quietHoursEnd;

    // If either field is not provided, validation passes (they're optional)
    if (
      quietHoursStart === undefined ||
      quietHoursStart === null ||
      quietHoursEnd === undefined ||
      quietHoursEnd === null
    ) {
      return true;
    }

    // Parse times to minutes for comparison using shared utility
    const startTimeMinutes = parseTimeString(quietHoursStart || "");
    const endTimeMinutes = parseTimeString(quietHoursEnd || "");

    // If parsing fails, validation fails
    if (startTimeMinutes === null || endTimeMinutes === null) {
      return false;
    }

    // Allow midnight crossover (start > end is valid, e.g., 22:00 to 07:00)
    // But disallow equal times
    return startTimeMinutes !== endTimeMinutes;
  }

  defaultMessage(args: ValidationArguments) {
    const dto = args.object as UpdateAlertSettingsDto;
    return `La hora de inicio de horas silenciosas (${dto.quietHoursStart}) debe ser diferente a la hora de fin (${dto.quietHoursEnd})`;
  }
}

/**
 * DTO for notification channels
 */
class NotificationChannelsDto {
  @ApiProperty({ description: "Dashboard notifications enabled" })
  @IsBoolean()
  dashboard!: boolean;

  @ApiProperty({ description: "Email notifications enabled" })
  @IsBoolean()
  email!: boolean;

  @ApiProperty({ description: "Push notifications enabled" })
  @IsBoolean()
  push!: boolean;
}

/**
 * DTO for alert settings response
 */
export class AlertSettingsResponseDto {
  @ApiProperty({ description: "Alert settings ID" })
  id!: string;

  @ApiProperty({ description: "User ID" })
  userId!: string;

  @ApiProperty({ description: "All alerts enabled" })
  alertsEnabled!: boolean;

  @ApiProperty({ description: "Hypoglycemia alerts enabled" })
  hypoglycemiaEnabled!: boolean;

  @ApiProperty({ description: "Hypoglycemia threshold in mg/dL", minimum: 40, maximum: 80 })
  hypoglycemiaThreshold!: number;

  @ApiProperty({ description: "Severe hypoglycemia alerts enabled" })
  severeHypoglycemiaEnabled!: boolean;

  @ApiProperty({
    description:
      "Severe hypoglycemia threshold in mg/dL (must be less than hypoglycemia threshold)",
    minimum: 30,
    maximum: 60,
  })
  severeHypoglycemiaThreshold!: number;

  @ApiProperty({ description: "Hyperglycemia alerts enabled" })
  hyperglycemiaEnabled!: boolean;

  @ApiProperty({ description: "Hyperglycemia threshold in mg/dL", minimum: 180, maximum: 400 })
  hyperglycemiaThreshold!: number;

  @ApiProperty({ description: "Persistent hyperglycemia alerts enabled" })
  persistentHyperglycemiaEnabled!: boolean;

  @ApiProperty({
    description: "Persistent hyperglycemia threshold in mg/dL",
    minimum: 180,
    maximum: 400,
  })
  persistentHyperglycemiaThreshold!: number;

  @ApiProperty({
    description: "Persistent hyperglycemia window in hours",
    minimum: 2,
    maximum: 24,
  })
  persistentHyperglycemiaWindowHours!: number;

  @ApiProperty({
    description: "Minimum readings for persistent hyperglycemia",
    minimum: 2,
    maximum: 10,
  })
  persistentHyperglycemiaMinReadings!: number;

  @ApiProperty({ description: "Notification channels", type: NotificationChannelsDto })
  notificationChannels!: NotificationChannelsDto;

  @ApiProperty({ description: "Daily summary enabled" })
  dailySummaryEnabled!: boolean;

  @ApiProperty({ description: "Daily summary time (HH:mm format)" })
  dailySummaryTime!: string;

  @ApiProperty({ description: "Quiet hours enabled" })
  quietHoursEnabled!: boolean;

  @ApiProperty({ description: "Quiet hours start time (HH:mm format)", required: false })
  quietHoursStart?: string;

  @ApiProperty({ description: "Quiet hours end time (HH:mm format)", required: false })
  quietHoursEnd?: string;

  @ApiProperty({
    description:
      "If true, critical alerts (SEVERE_HYPOGLYCEMIA) ignore quiet hours for email notifications",
  })
  criticalAlertsIgnoreQuietHours!: boolean;

  @ApiProperty({
    description: "Notification frequency",
    enum: ["IMMEDIATE", "DAILY", "WEEKLY"],
  })
  notificationFrequency!: string;

  @ApiProperty({ description: "Created at timestamp" })
  createdAt!: string;

  @ApiProperty({ description: "Updated at timestamp" })
  updatedAt!: string;
}

/**
 * DTO for updating alert settings
 */
export class UpdateAlertSettingsDto {
  @ApiProperty({ required: false, description: "All alerts enabled" })
  @IsOptional()
  @IsBoolean()
  alertsEnabled?: boolean;

  @ApiProperty({ required: false, description: "Hypoglycemia alerts enabled" })
  @IsOptional()
  @IsBoolean()
  hypoglycemiaEnabled?: boolean;

  @ApiProperty({
    required: false,
    description: "Hypoglycemia threshold in mg/dL",
    minimum: 40,
    maximum: 80,
  })
  @IsOptional()
  @IsInt()
  @Min(40)
  @Max(80)
  hypoglycemiaThreshold?: number;

  @ApiProperty({ required: false, description: "Severe hypoglycemia alerts enabled" })
  @IsOptional()
  @IsBoolean()
  severeHypoglycemiaEnabled?: boolean;

  @ApiProperty({
    required: false,
    description:
      "Severe hypoglycemia threshold in mg/dL (must be less than hypoglycemia threshold)",
    minimum: 30,
    maximum: 60,
  })
  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(60)
  @Validate(IsSevereHypoglycemiaLessThanHypoglycemiaConstraint)
  severeHypoglycemiaThreshold?: number;

  @ApiProperty({ required: false, description: "Hyperglycemia alerts enabled" })
  @IsOptional()
  @IsBoolean()
  hyperglycemiaEnabled?: boolean;

  @ApiProperty({
    required: false,
    description: "Hyperglycemia threshold in mg/dL",
    minimum: 180,
    maximum: 400,
  })
  @IsOptional()
  @IsInt()
  @Min(180)
  @Max(400)
  hyperglycemiaThreshold?: number;

  @ApiProperty({ required: false, description: "Persistent hyperglycemia alerts enabled" })
  @IsOptional()
  @IsBoolean()
  persistentHyperglycemiaEnabled?: boolean;

  @ApiProperty({
    required: false,
    description: "Persistent hyperglycemia threshold in mg/dL",
    minimum: 180,
    maximum: 400,
  })
  @IsOptional()
  @IsInt()
  @Min(180)
  @Max(400)
  persistentHyperglycemiaThreshold?: number;

  @ApiProperty({
    required: false,
    description: "Persistent hyperglycemia window in hours",
    minimum: 2,
    maximum: 24,
  })
  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(24)
  persistentHyperglycemiaWindowHours?: number;

  @ApiProperty({
    required: false,
    description: "Minimum readings for persistent hyperglycemia",
    minimum: 2,
    maximum: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(10)
  persistentHyperglycemiaMinReadings?: number;

  @ApiProperty({
    required: false,
    description: "Notification channels",
    type: NotificationChannelsDto,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => NotificationChannelsDto)
  notificationChannels?: NotificationChannelsDto;

  @ApiProperty({ required: false, description: "Daily summary enabled" })
  @IsOptional()
  @IsBoolean()
  dailySummaryEnabled?: boolean;

  @ApiProperty({ required: false, description: "Daily summary time (HH:mm format)" })
  @IsOptional()
  @IsString()
  dailySummaryTime?: string;

  @ApiProperty({ required: false, description: "Quiet hours enabled" })
  @IsOptional()
  @IsBoolean()
  quietHoursEnabled?: boolean;

  @ApiProperty({ required: false, description: "Quiet hours start time (HH:mm format)" })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, {
    message: "quietHoursStart must be in HH:mm format (e.g., 22:00)",
  })
  quietHoursStart?: string;

  @ApiProperty({ required: false, description: "Quiet hours end time (HH:mm format)" })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, {
    message: "quietHoursEnd must be in HH:mm format (e.g., 07:00)",
  })
  @Validate(ValidateQuietHoursRangeConstraint)
  quietHoursEnd?: string;

  @ApiProperty({
    required: false,
    description:
      "If true, critical alerts (SEVERE_HYPOGLYCEMIA) ignore quiet hours for email notifications",
  })
  @IsOptional()
  @IsBoolean()
  criticalAlertsIgnoreQuietHours?: boolean;

  @ApiProperty({
    required: false,
    description: "Notification frequency",
    enum: ["IMMEDIATE", "DAILY", "WEEKLY"],
  })
  @IsOptional()
  @IsString()
  notificationFrequency?: string;
}
