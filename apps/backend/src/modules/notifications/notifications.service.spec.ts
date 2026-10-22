import { Logger } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../../prisma/prisma.service";
import { createMockPrismaService } from "../../common/test-helpers/prisma.mock";
import { NotificationsService } from "./notifications.service";

describe("NotificationsService", () => {
  let service: NotificationsService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: PrismaService,
          useValue: createMockPrismaService(),
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    prismaService = module.get<PrismaService>(PrismaService);
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("registers a push device and enables the push channel", async () => {
    (prismaService.pushDevice.upsert as jest.Mock).mockResolvedValue({});
    (prismaService.alertSettings.findUnique as jest.Mock).mockResolvedValue(null);
    (prismaService.alertSettings.upsert as jest.Mock).mockResolvedValue({});

    await service.registerPushDevice("patient-1", {
      expoPushToken: "ExponentPushToken[abc123]",
      platform: "ios",
      deviceId: "device-1",
    });

    expect(prismaService.pushDevice.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { expoPushToken: "ExponentPushToken[abc123]" },
      }),
    );
    expect(prismaService.alertSettings.upsert).toHaveBeenCalled();
  });

  it("unregisters a push device and disables push when no active devices remain", async () => {
    (prismaService.pushDevice.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prismaService.pushDevice.count as jest.Mock).mockResolvedValue(0);
    (prismaService.alertSettings.findUnique as jest.Mock).mockResolvedValue({
      notificationChannels: { dashboard: true, email: false, push: true },
    });
    (prismaService.alertSettings.upsert as jest.Mock).mockResolvedValue({});

    await service.unregisterPushDevice("patient-1", "ExponentPushToken[abc123]");

    expect(prismaService.pushDevice.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "patient-1", expoPushToken: "ExponentPushToken[abc123]" },
      }),
    );
    expect(prismaService.alertSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          notificationChannels: expect.objectContaining({ push: false }),
        }),
      }),
    );
  });

  it("skips push delivery when the user disabled push notifications", async () => {
    (prismaService.alertSettings.findUnique as jest.Mock).mockResolvedValue({
      notificationChannels: { dashboard: true, email: false, push: false },
    });

    await service.sendToUser("patient-1", {
      type: "message",
      entityId: "msg-1",
      title: "Doctor",
      body: "Hola",
      route: "Communication",
    });

    expect(prismaService.pushDevice.findMany).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("deactivates invalid Expo tokens after delivery", async () => {
    (prismaService.alertSettings.findUnique as jest.Mock).mockResolvedValue({
      notificationChannels: { dashboard: true, email: false, push: true },
    });
    (prismaService.pushDevice.findMany as jest.Mock).mockResolvedValue([
      { expoPushToken: "ExponentPushToken[abc123]" },
    ]);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            status: "error",
            details: { error: "DeviceNotRegistered" },
          },
        ],
      }),
    });

    await service.sendToUser("patient-1", {
      type: "appointment_reminder",
      entityId: "apt-1",
      title: "Citas",
      body: "Recordatorio de cita",
      route: "Appointments",
    });

    expect(global.fetch).toHaveBeenCalled();
    expect(prismaService.pushDevice.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { expoPushToken: { in: ["ExponentPushToken[abc123]"] } },
        data: { isActive: false },
      }),
    );
  });

  it("logs a warning when Expo returns a non-fatal push error ticket", async () => {
    const warnSpy = jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);

    (prismaService.alertSettings.findUnique as jest.Mock).mockResolvedValue({
      notificationChannels: { dashboard: true, email: false, push: true },
    });
    (prismaService.pushDevice.findMany as jest.Mock).mockResolvedValue([
      { expoPushToken: "ExponentPushToken[abc123]" },
    ]);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            status: "error",
            details: { error: "MessageRateExceeded" },
          },
        ],
      }),
    });

    await service.sendToUser("patient-1", {
      type: "message",
      entityId: "msg-2",
      title: "Doctor",
      body: "Hola",
      route: "Communication",
    });

    expect(warnSpy).toHaveBeenCalledWith("Expo push returned 1 error ticket(s) for user patient-1");
    expect(prismaService.pushDevice.updateMany).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});
