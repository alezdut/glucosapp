import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class RegisterPushDeviceDto {
  @ApiProperty({ example: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]" })
  @IsString()
  expoPushToken!: string;

  @ApiProperty({ example: "ios" })
  @IsString()
  platform!: string;

  @ApiProperty({ required: false, example: "device-installation-id" })
  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class UnregisterPushDeviceDto {
  @ApiProperty({ example: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]" })
  @IsString()
  expoPushToken!: string;
}
