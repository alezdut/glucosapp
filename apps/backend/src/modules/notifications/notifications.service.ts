import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RegisterPushDeviceDto } from "./dto/register-push-device.dto";

type PushPayloadType =
  | "message"
  | "appointment_created"
  | "appointment_updated"
  | "appointment_reminder";

type PushRoute = "Communication" | "Appointments";

export interface PushNotificationPayload {
  type: PushPayloadType;
  entityId: string;
  title: string;
  body: string;
  route: PushRoute;
  meta?: Record<string, string>;
}

type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data: PushNotificationPayload;
  sound: "default";
  priority: "high";
  channelId: string;
};

type ExpoPushTicket = {
  status: "ok" | "error";
  id?: string;
  details?: {
    error?: string;
  };
  message?: string;
};

type ExpoPushResponse = {
  data?: ExpoPushTicket[];
  errors?: Array<{ message?: string }>;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly expoPushUrl = "https://exp.host/--/api/v2/push/send";

  constructor(private readonly prisma: PrismaService) {}

  private isValidExpoPushToken(token: string): boolean {
    return /^ExponentPushToken\[[A-Za-z0-9+/=_-]+\]$/.test(token);
  }

  private truncateBody(body: string, maxLength: number = 140): string {
    const trimmed = body.trim();
    if (trimmed.length <= maxLength) {
      return trimmed;
    }
    return `${trimmed.slice(0, maxLength - 1)}…`;
  }

  private async syncPushPreference(userId: string, pushEnabled: boolean) {
    const existingSettings = await this.prisma.alertSettings.findUnique({
      where: { userId },
    });

    const currentChannels =
      existingSettings?.notificationChannels &&
      typeof existingSettings.notificationChannels === "object" &&
      !Array.isArray(existingSettings.notificationChannels)
        ? (existingSettings.notificationChannels as {
            dashboard?: boolean;
            email?: boolean;
            push?: boolean;
          })
        : { dashboard: true, email: false, push: false };

    const nextChannels = {
      dashboard: currentChannels.dashboard ?? true,
      email: currentChannels.email ?? false,
      push: pushEnabled,
    };

    await this.prisma.alertSettings.upsert({
      where: { userId },
      update: {
        notificationChannels: nextChannels,
      },
      create: {
        userId,
        alertsEnabled: true,
        hypoglycemiaEnabled: true,
        hypoglycemiaThreshold: 70,
        severeHypoglycemiaEnabled: true,
        severeHypoglycemiaThreshold: 54,
        hyperglycemiaEnabled: true,
        hyperglycemiaThreshold: 250,
        persistentHyperglycemiaEnabled: true,
        persistentHyperglycemiaThreshold: 250,
        persistentHyperglycemiaWindowHours: 4,
        persistentHyperglycemiaMinReadings: 2,
        notificationChannels: nextChannels,
        dailySummaryEnabled: true,
        dailySummaryTime: "08:00",
        quietHoursEnabled: false,
        quietHoursStart: null,
        quietHoursEnd: null,
        criticalAlertsIgnoreQuietHours: false,
        notificationFrequency: "IMMEDIATE",
      },
    });
  }

  async registerPushDevice(userId: string, dto: RegisterPushDeviceDto): Promise<void> {
    if (!this.isValidExpoPushToken(dto.expoPushToken)) {
      this.logger.warn(`Rejected invalid Expo push token registration for user ${userId}`);
      return;
    }

    await this.prisma.pushDevice.upsert({
      where: { expoPushToken: dto.expoPushToken },
      update: {
        userId,
        platform: dto.platform,
        deviceId: dto.deviceId,
        isActive: true,
        lastSeenAt: new Date(),
      },
      create: {
        userId,
        expoPushToken: dto.expoPushToken,
        platform: dto.platform,
        deviceId: dto.deviceId,
        isActive: true,
        lastSeenAt: new Date(),
      },
    });

    await this.syncPushPreference(userId, true);
    this.logger.log(`Registered Expo push token for user ${userId}`);
  }

  async unregisterPushDevice(userId: string, expoPushToken: string): Promise<void> {
    await this.prisma.pushDevice.updateMany({
      where: {
        userId,
        expoPushToken,
      },
      data: {
        isActive: false,
        lastSeenAt: new Date(),
      },
    });

    const activeDevices = await this.prisma.pushDevice.count({
      where: {
        userId,
        isActive: true,
      },
    });

    if (activeDevices === 0) {
      await this.syncPushPreference(userId, false);
    }

    this.logger.log(`Unregistered Expo push token for user ${userId}`);
  }

  async sendToUser(userId: string, payload: PushNotificationPayload): Promise<void> {
    const settings = await this.prisma.alertSettings.findUnique({
      where: { userId },
      select: { notificationChannels: true },
    });

    const channels =
      settings?.notificationChannels &&
      typeof settings.notificationChannels === "object" &&
      !Array.isArray(settings.notificationChannels)
        ? (settings.notificationChannels as { push?: boolean })
        : null;

    if (channels?.push === false) {
      this.logger.log(`Skipping push for user ${userId}: push channel disabled`);
      return;
    }

    const devices = await this.prisma.pushDevice.findMany({
      where: {
        userId,
        isActive: true,
      },
      select: {
        expoPushToken: true,
      },
    });

    if (devices.length === 0) {
      this.logger.log(`Skipping push for user ${userId}: no active devices`);
      return;
    }

    const messages: ExpoPushMessage[] = devices
      .map((device) => device.expoPushToken)
      .filter((token) => this.isValidExpoPushToken(token))
      .map((token) => ({
        to: token,
        title: payload.title,
        body: this.truncateBody(payload.body),
        data: payload,
        sound: "default",
        priority: "high",
        channelId: "default",
      }));

    if (messages.length === 0) {
      this.logger.warn(`Skipping push for user ${userId}: no valid Expo tokens`);
      return;
    }

    try {
      const response = await fetch(this.expoPushUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(messages),
      });

      if (!response.ok) {
        this.logger.error(`Expo push request failed for user ${userId}: ${response.status}`);
        return;
      }

      const result = (await response.json()) as ExpoPushResponse;
      const tickets = result.data ?? [];
      const invalidTokens = tickets.flatMap((ticket, index) =>
        ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered"
          ? [messages[index]?.to]
          : [],
      );

      if (invalidTokens.length > 0) {
        await this.prisma.pushDevice.updateMany({
          where: {
            expoPushToken: { in: invalidTokens },
          },
          data: {
            isActive: false,
          },
        });
        this.logger.warn(
          `Deactivated ${invalidTokens.length} invalid Expo push token(s) for user ${userId}`,
        );
      }

      const failedCount = tickets.filter((ticket) => ticket.status === "error").length;
      if (failedCount > 0) {
        this.logger.warn(`Expo push returned ${failedCount} error ticket(s) for user ${userId}`);
      } else {
        this.logger.log(`Sent ${messages.length} Expo push notification(s) to user ${userId}`);
      }
    } catch (error) {
      this.logger.error(
        `Expo push delivery failed for user ${userId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  createMessagePayload(input: {
    messageId: string;
    senderName: string;
    body: string;
    doctorId?: string;
  }): PushNotificationPayload {
    return {
      type: "message",
      entityId: input.messageId,
      title: input.senderName,
      body: this.truncateBody(input.body),
      route: "Communication",
      meta: {
        messageId: input.messageId,
        ...(input.doctorId ? { doctorId: input.doctorId } : {}),
      },
    };
  }

  createAppointmentPayload(input: {
    type: "appointment_created" | "appointment_updated" | "appointment_reminder";
    appointmentId: string;
    message: string;
  }): PushNotificationPayload {
    return {
      type: input.type,
      entityId: input.appointmentId,
      title: "Citas",
      body: input.message,
      route: "Appointments",
      meta: {
        appointmentId: input.appointmentId,
      },
    };
  }
}
