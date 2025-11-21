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
} from "class-validator";
import { Type } from "class-transformer";

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
  quietHoursStart?: string;

  @ApiProperty({ required: false, description: "Quiet hours end time (HH:mm format)" })
  @IsOptional()
  @IsString()
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
