import { Test, TestingModule } from "@nestjs/testing";
import { AlertsController } from "./alerts.controller";
import { AlertsService } from "./alerts.service";
import { createMockUserResponse } from "../../common/test-helpers/fixtures";
import { UpdateAlertSettingsDto } from "./dto/alert-settings.dto";
import { GetAlertsQueryDto } from "./dto/get-alerts-query.dto";
import { AlertSeverity } from "@prisma/client";

describe("AlertsController", () => {
  let controller: AlertsController;
  let service: AlertsService;

  const mockUser = createMockUserResponse();

  beforeEach(async () => {
    const mockService = {
      findAllWithFilters: jest.fn(),
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

  describe("findAll (unified endpoint with filters)", () => {
    it("should return all alerts with default filters", async () => {
      const expectedResult: any[] = [];
      const query: GetAlertsQueryDto = {};

      (service.findAllWithFilters as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.findAll(mockUser, query);

      expect(result).toEqual(expectedResult);
      expect(service.findAllWithFilters).toHaveBeenCalledWith(mockUser.id, {
        limit: undefined,
        acknowledged: undefined,
        severity: undefined,
        sinceHours: undefined,
        patientId: undefined,
      });
    });

    it("should return alerts with limit filter", async () => {
      const expectedResult: any[] = [];
      const query: GetAlertsQueryDto = { limit: 20 };

      (service.findAllWithFilters as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.findAll(mockUser, query);

      expect(result).toEqual(expectedResult);
      expect(service.findAllWithFilters).toHaveBeenCalledWith(mockUser.id, {
        limit: 20,
        acknowledged: undefined,
        severity: undefined,
        sinceHours: undefined,
        patientId: undefined,
      });
    });

    it("should return unacknowledged alerts", async () => {
      const expectedResult: any[] = [];
      const query: GetAlertsQueryDto = { acknowledged: false };

      (service.findAllWithFilters as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.findAll(mockUser, query);

      expect(result).toEqual(expectedResult);
      expect(service.findAllWithFilters).toHaveBeenCalledWith(mockUser.id, {
        limit: undefined,
        acknowledged: false,
        severity: undefined,
        sinceHours: undefined,
        patientId: undefined,
      });
    });

    it("should return acknowledged alerts", async () => {
      const expectedResult: any[] = [];
      const query: GetAlertsQueryDto = { acknowledged: true };

      (service.findAllWithFilters as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.findAll(mockUser, query);

      expect(result).toEqual(expectedResult);
      expect(service.findAllWithFilters).toHaveBeenCalledWith(mockUser.id, {
        limit: undefined,
        acknowledged: true,
        severity: undefined,
        sinceHours: undefined,
        patientId: undefined,
      });
    });

    it("should return alerts filtered by single severity", async () => {
      const expectedResult: any[] = [];
      const query: GetAlertsQueryDto = { severity: [AlertSeverity.CRITICAL] };

      (service.findAllWithFilters as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.findAll(mockUser, query);

      expect(result).toEqual(expectedResult);
      expect(service.findAllWithFilters).toHaveBeenCalledWith(mockUser.id, {
        limit: undefined,
        acknowledged: undefined,
        severity: [AlertSeverity.CRITICAL],
        sinceHours: undefined,
        patientId: undefined,
      });
    });

    it("should return alerts filtered by multiple severities", async () => {
      const expectedResult: any[] = [];
      const query: GetAlertsQueryDto = {
        severity: [AlertSeverity.CRITICAL, AlertSeverity.HIGH],
      };

      (service.findAllWithFilters as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.findAll(mockUser, query);

      expect(result).toEqual(expectedResult);
      expect(service.findAllWithFilters).toHaveBeenCalledWith(mockUser.id, {
        limit: undefined,
        acknowledged: undefined,
        severity: [AlertSeverity.CRITICAL, AlertSeverity.HIGH],
        sinceHours: undefined,
        patientId: undefined,
      });
    });

    it("should return alerts from last N hours", async () => {
      const expectedResult: any[] = [];
      const query: GetAlertsQueryDto = { sinceHours: 24 };

      (service.findAllWithFilters as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.findAll(mockUser, query);

      expect(result).toEqual(expectedResult);
      expect(service.findAllWithFilters).toHaveBeenCalledWith(mockUser.id, {
        limit: undefined,
        acknowledged: undefined,
        severity: undefined,
        sinceHours: 24,
        patientId: undefined,
      });
    });

    it("should return alerts for specific patient", async () => {
      const expectedResult: any[] = [];
      const patientId = "patient-123";
      const query: GetAlertsQueryDto = { patientId };

      (service.findAllWithFilters as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.findAll(mockUser, query);

      expect(result).toEqual(expectedResult);
      expect(service.findAllWithFilters).toHaveBeenCalledWith(mockUser.id, {
        limit: undefined,
        acknowledged: undefined,
        severity: undefined,
        sinceHours: undefined,
        patientId,
      });
    });

    it("should return alerts with combined filters (critical alerts use case)", async () => {
      const expectedResult: any[] = [];
      const query: GetAlertsQueryDto = {
        acknowledged: false,
        severity: [AlertSeverity.CRITICAL, AlertSeverity.HIGH],
      };

      (service.findAllWithFilters as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.findAll(mockUser, query);

      expect(result).toEqual(expectedResult);
      expect(service.findAllWithFilters).toHaveBeenCalledWith(mockUser.id, {
        limit: undefined,
        acknowledged: false,
        severity: [AlertSeverity.CRITICAL, AlertSeverity.HIGH],
        sinceHours: undefined,
        patientId: undefined,
      });
    });

    it("should return alerts with combined filters (recent alerts use case)", async () => {
      const expectedResult: any[] = [];
      const query: GetAlertsQueryDto = {
        sinceHours: 24,
        limit: 10,
      };

      (service.findAllWithFilters as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.findAll(mockUser, query);

      expect(result).toEqual(expectedResult);
      expect(service.findAllWithFilters).toHaveBeenCalledWith(mockUser.id, {
        limit: 10,
        acknowledged: undefined,
        severity: undefined,
        sinceHours: 24,
        patientId: undefined,
      });
    });

    it("should return alerts with all filters combined", async () => {
      const expectedResult: any[] = [];
      const patientId = "patient-123";
      const query: GetAlertsQueryDto = {
        limit: 50,
        acknowledged: false,
        severity: [AlertSeverity.CRITICAL],
        sinceHours: 12,
        patientId,
      };

      (service.findAllWithFilters as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.findAll(mockUser, query);

      expect(result).toEqual(expectedResult);
      expect(service.findAllWithFilters).toHaveBeenCalledWith(mockUser.id, {
        limit: 50,
        acknowledged: false,
        severity: [AlertSeverity.CRITICAL],
        sinceHours: 12,
        patientId,
      });
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
