import { Test, TestingModule } from "@nestjs/testing";
import { AlertsController } from "./alerts.controller";
import { AlertsService } from "./alerts.service";
import { createMockUserResponse } from "../../common/test-helpers/fixtures";

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
      const expectedResult = [];

      (service.findAll as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.findAll(mockUser);

      expect(result).toEqual(expectedResult);
      expect(service.findAll).toHaveBeenCalledWith(mockUser.id, 50);
    });

    it("should return all alerts with custom limit", async () => {
      const expectedResult = [];

      (service.findAll as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.findAll(mockUser, "20");

      expect(result).toEqual(expectedResult);
      expect(service.findAll).toHaveBeenCalledWith(mockUser.id, 20);
    });
  });

  describe("getCritical", () => {
    it("should return critical alerts", async () => {
      const expectedResult = [];

      (service.getCritical as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.getCritical(mockUser);

      expect(result).toEqual(expectedResult);
      expect(service.getCritical).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe("getRecent", () => {
    it("should return recent alerts with default limit", async () => {
      const expectedResult = [];

      (service.getRecent as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.getRecent(mockUser);

      expect(result).toEqual(expectedResult);
      expect(service.getRecent).toHaveBeenCalledWith(mockUser.id, 10);
    });

    it("should return recent alerts with custom limit", async () => {
      const expectedResult = [];

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
});
