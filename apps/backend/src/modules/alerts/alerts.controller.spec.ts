import { Test, TestingModule } from "@nestjs/testing";
import { AlertsController } from "./alerts.controller";
import { AlertsService } from "./alerts.service";
import { createMockUserResponse } from "../../common/test-helpers/fixtures";
import { UpdateAlertSettingsDto } from "./dto/alert-settings.dto";

describe("AlertsController", () => {
  let controller: AlertsController;
  let service: AlertsService;

  const mockUser = createMockUserResponse();

  beforeEach(async () => {
    const mockService = {
      findAll: jest.fn(),
      getCritical: jest.fn(),
      getRecent: jest.fn(),
      acknowledge: jest.fn(),
      getAlertSettings: jest.fn(),
      updateAlertSettings: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlertsController],
      providers: [
        {
          provide: AlertsService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<AlertsController>(AlertsController);
    service = module.get<AlertsService>(AlertsService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("findAll", () => {
    it("should return all alerts with default limit", async () => {
      const expectedResult: any[] = [];

      (service.findAll as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.findAll(mockUser);

      expect(result).toEqual(expectedResult);
      expect(service.findAll).toHaveBeenCalledWith(mockUser.id, 50);
    });

    it("should return all alerts with custom limit", async () => {
      const expectedResult: any[] = [];

      (service.findAll as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.findAll(mockUser, "20");

      expect(result).toEqual(expectedResult);
      expect(service.findAll).toHaveBeenCalledWith(mockUser.id, 20);
    });
  });

  describe("getCritical", () => {
    it("should return critical alerts", async () => {
      const expectedResult: any[] = [];

      (service.getCritical as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.getCritical(mockUser);

      expect(result).toEqual(expectedResult);
      expect(service.getCritical).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe("getRecent", () => {
    it("should return recent alerts with default limit", async () => {
      const expectedResult: any[] = [];

      (service.getRecent as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.getRecent(mockUser);

      expect(result).toEqual(expectedResult);
      expect(service.getRecent).toHaveBeenCalledWith(mockUser.id, 10);
    });

    it("should return recent alerts with custom limit", async () => {
      const expectedResult: any[] = [];

      (service.getRecent as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.getRecent(mockUser, "15");

      expect(result).toEqual(expectedResult);
      expect(service.getRecent).toHaveBeenCalledWith(mockUser.id, 15);
    });
  });

  describe("acknowledge", () => {
    it("should acknowledge alert", async () => {
      const alertId = "alert-123";
      const expectedResult = {
        id: alertId,
        acknowledged: true,
      } as any;

      (service.acknowledge as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.acknowledge(mockUser, alertId);

      expect(result).toEqual(expectedResult);
      expect(service.acknowledge).toHaveBeenCalledWith(mockUser.id, alertId);
    });
  });

  describe("getAlertSettings", () => {
    it("should return alert settings for current user", async () => {
      const expectedResult = {
        id: "settings-123",
        userId: mockUser.id,
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
        notificationChannels: {
          dashboard: true,
          email: false,
          push: false,
        },
        dailySummaryEnabled: true,
        dailySummaryTime: "08:00",
        quietHoursEnabled: false,
        quietHoursStart: undefined,
        quietHoursEnd: undefined,
        notificationFrequency: "IMMEDIATE",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      } as any;

      (service.getAlertSettings as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.getAlertSettings(mockUser);

      expect(result).toEqual(expectedResult);
      expect(service.getAlertSettings).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe("updateAlertSettings", () => {
    it("should update alert settings successfully", async () => {
      const updateDto: UpdateAlertSettingsDto = {
        alertsEnabled: true,
        hypoglycemiaEnabled: true,
        hypoglycemiaThreshold: 75,
        severeHypoglycemiaEnabled: true,
        severeHypoglycemiaThreshold: 50,
        hyperglycemiaEnabled: true,
        hyperglycemiaThreshold: 240,
        persistentHyperglycemiaEnabled: true,
        persistentHyperglycemiaThreshold: 240,
        persistentHyperglycemiaWindowHours: 6,
        persistentHyperglycemiaMinReadings: 3,
        notificationChannels: {
          dashboard: true,
          email: true,
          push: false,
        },
        dailySummaryEnabled: true,
        dailySummaryTime: "09:00",
        quietHoursEnabled: true,
        quietHoursStart: "22:00",
        quietHoursEnd: "07:00",
        notificationFrequency: "DAILY",
      };

      const expectedResult = {
        id: "settings-123",
        userId: mockUser.id,
        ...updateDto,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      } as any;

      (service.updateAlertSettings as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.updateAlertSettings(mockUser, updateDto);

      expect(result).toEqual(expectedResult);
      expect(service.updateAlertSettings).toHaveBeenCalledWith(mockUser.id, updateDto);
    });

    it("should update partial alert settings", async () => {
      const updateDto: UpdateAlertSettingsDto = {
        hypoglycemiaThreshold: 80,
        hyperglycemiaThreshold: 260,
      };

      const expectedResult = {
        id: "settings-123",
        userId: mockUser.id,
        alertsEnabled: true,
        hypoglycemiaEnabled: true,
        hypoglycemiaThreshold: 80,
        severeHypoglycemiaEnabled: true,
        severeHypoglycemiaThreshold: 54,
        hyperglycemiaEnabled: true,
        hyperglycemiaThreshold: 260,
        persistentHyperglycemiaEnabled: true,
        persistentHyperglycemiaThreshold: 250,
        persistentHyperglycemiaWindowHours: 4,
        persistentHyperglycemiaMinReadings: 2,
        notificationChannels: {
          dashboard: true,
          email: false,
          push: false,
        },
        dailySummaryEnabled: true,
        dailySummaryTime: "08:00",
        quietHoursEnabled: false,
        notificationFrequency: "IMMEDIATE",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      } as any;

      (service.updateAlertSettings as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.updateAlertSettings(mockUser, updateDto);

      expect(result).toEqual(expectedResult);
      expect(service.updateAlertSettings).toHaveBeenCalledWith(mockUser.id, updateDto);
    });
  });
});
