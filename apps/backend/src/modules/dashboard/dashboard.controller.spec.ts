import { Test, TestingModule } from "@nestjs/testing";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";
import { AlertsService } from "../alerts/alerts.service";
import { createMockUserResponse } from "../../common/test-helpers/fixtures";
import { GetStatsQueryDto } from "./dto/get-stats-query.dto";
import { GetRecentAlertsQueryDto } from "./dto/get-recent-alerts-query.dto";
import { GetPatientStatsQueryDto } from "./dto/get-patient-stats-query.dto";

describe("DashboardController", () => {
  let controller: DashboardController;
  let dashboardService: DashboardService;
  let alertsService: AlertsService;

  const mockUser = createMockUserResponse();

  beforeEach(async () => {
    const mockDashboardService = {
      getSummary: jest.fn(),
      getGlucoseEvolution: jest.fn(),
      getInsulinStats: jest.fn(),
      getMealStats: jest.fn(),
      getPatientGlucoseEvolution: jest.fn(),
      getPatientInsulinStats: jest.fn(),
    };
    const mockAlertsService = {
      getRecent: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        {
          provide: DashboardService,
          useValue: mockDashboardService,
        },
        {
          provide: AlertsService,
          useValue: mockAlertsService,
        },
      ],
    }).compile();

    controller = module.get<DashboardController>(DashboardController);
    dashboardService = module.get<DashboardService>(DashboardService);
    alertsService = module.get<AlertsService>(AlertsService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getSummary", () => {
    it("should return dashboard summary", async () => {
      const expectedResult = {
        activePatients: 5,
        criticalAlerts: 2,
        upcomingAppointments: 3,
      };

      (dashboardService.getSummary as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.getSummary(mockUser);

      expect(result).toEqual(expectedResult);
      expect(dashboardService.getSummary).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe("getGlucoseEvolution", () => {
    it("should return glucose evolution data", async () => {
      const expectedResult = { data: [] };

      (dashboardService.getGlucoseEvolution as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.getGlucoseEvolution(mockUser);

      expect(result).toEqual(expectedResult);
      expect(dashboardService.getGlucoseEvolution).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe("getInsulinStats", () => {
    it("should return insulin stats with default days", async () => {
      const query: GetStatsQueryDto = {};
      const expectedResult = {
        averageDose: 25.5,
        unit: "unidades/día",
        days: 30,
      };

      (dashboardService.getInsulinStats as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.getInsulinStats(mockUser, query);

      expect(result).toEqual(expectedResult);
      expect(dashboardService.getInsulinStats).toHaveBeenCalledWith(mockUser.id, 30);
    });

    it("should return insulin stats with custom days", async () => {
      const query: GetStatsQueryDto = { days: 15 };
      const expectedResult = {
        averageDose: 25.5,
        unit: "unidades/día",
        days: 15,
      };

      (dashboardService.getInsulinStats as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.getInsulinStats(mockUser, query);

      expect(result).toEqual(expectedResult);
      expect(dashboardService.getInsulinStats).toHaveBeenCalledWith(mockUser.id, 15);
    });
  });

  describe("getMealStats", () => {
    it("should return meal stats", async () => {
      const query: GetStatsQueryDto = {};
      const expectedResult = {
        totalMeals: 45,
        unit: "comidas",
        description: "Sus pacientes registraron 45 comidas el mes pasado.",
      };

      (dashboardService.getMealStats as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.getMealStats(mockUser, query);

      expect(result).toEqual(expectedResult);
      expect(dashboardService.getMealStats).toHaveBeenCalledWith(mockUser.id, 30);
    });
  });

  describe("getRecentAlerts", () => {
    it("should return recent alerts with default limit", async () => {
      const query: GetRecentAlertsQueryDto = {};
      const expectedResult = [];

      (alertsService.getRecent as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.getRecentAlerts(mockUser, query);

      expect(result).toEqual(expectedResult);
      expect(alertsService.getRecent).toHaveBeenCalledWith(mockUser.id, 10);
    });

    it("should return recent alerts with custom limit", async () => {
      const query: GetRecentAlertsQueryDto = { limit: 20 };
      const expectedResult = [];

      (alertsService.getRecent as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.getRecentAlerts(mockUser, query);

      expect(result).toEqual(expectedResult);
      expect(alertsService.getRecent).toHaveBeenCalledWith(mockUser.id, 20);
    });
  });

  describe("getPatientGlucoseEvolution", () => {
    it("should return patient glucose evolution with default months", async () => {
      const patientId = "patient-123";
      const query: GetPatientStatsQueryDto = {};
      const expectedResult = { data: [] };

      (dashboardService.getPatientGlucoseEvolution as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.getPatientGlucoseEvolution(mockUser, patientId, query);

      expect(result).toEqual(expectedResult);
      expect(dashboardService.getPatientGlucoseEvolution).toHaveBeenCalledWith(
        mockUser.id,
        patientId,
        12,
      );
    });
  });

  describe("getPatientInsulinStats", () => {
    it("should return patient insulin stats", async () => {
      const patientId = "patient-123";
      const query: GetPatientStatsQueryDto = {};
      const expectedResult = { data: [] };

      (dashboardService.getPatientInsulinStats as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.getPatientInsulinStats(mockUser, patientId, query);

      expect(result).toEqual(expectedResult);
      expect(dashboardService.getPatientInsulinStats).toHaveBeenCalledWith(
        mockUser.id,
        patientId,
        12,
      );
    });
  });
});
