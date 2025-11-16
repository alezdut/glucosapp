import { Test, TestingModule } from "@nestjs/testing";
import { LogEntriesController } from "./log-entries.controller";
import { LogEntriesService } from "./log-entries.service";
import { createMockUserResponse } from "../../common/test-helpers/fixtures";
import { CreateLogEntryDto } from "./dto/create-log-entry.dto";
import { QueryLogEntriesDto } from "./dto/query-log-entries.dto";

describe("LogEntriesController", () => {
  let controller: LogEntriesController;
  let service: LogEntriesService;

  const mockUser = createMockUserResponse();

  beforeEach(async () => {
    const mockService = {
      findAll: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LogEntriesController],
      providers: [
        {
          provide: LogEntriesService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<LogEntriesController>(LogEntriesController);
    service = module.get<LogEntriesService>(LogEntriesService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("findAll", () => {
    it("should return log entries", async () => {
      const query: QueryLogEntriesDto = {};
      const expectedResult = [];

      (service.findAll as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.findAll(mockUser, query);

      expect(result).toEqual(expectedResult);
      expect(service.findAll).toHaveBeenCalledWith(mockUser.id, undefined, undefined);
    });

    it("should filter by date range", async () => {
      const query: QueryLogEntriesDto = {
        startDate: "2024-01-01",
        endDate: "2024-01-31",
      };
      const expectedResult = [];

      (service.findAll as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.findAll(mockUser, query);

      expect(result).toEqual(expectedResult);
      expect(service.findAll).toHaveBeenCalledWith(mockUser.id, query.startDate, query.endDate);
    });
  });

  describe("create", () => {
    it("should create log entry", async () => {
      const createDto: CreateLogEntryDto = {
        glucoseMgdl: 120,
        insulinUnits: 5,
        insulinType: "BOLUS",
        carbohydrates: 50,
      };
      const expectedResult = {
        id: "log-1",
        userId: mockUser.id,
      } as any;

      (service.create as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.create(mockUser, createDto);

      expect(result).toEqual(expectedResult);
      expect(service.create).toHaveBeenCalledWith(mockUser.id, createDto);
    });
  });
});
