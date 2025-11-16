import { Test, TestingModule } from "@nestjs/testing";
import { SensorReadingsController } from "./sensor-readings.controller";
import { SensorReadingsService } from "./sensor-readings.service";
import { createMockUserResponse } from "../../common/test-helpers/fixtures";
import { CreateSensorReadingDto } from "./dto/create-sensor-reading.dto";
import { BatchCreateSensorReadingsDto } from "./dto/batch-create-sensor-readings.dto";
import { ExportReadingsQueryDto, ExportFormat } from "./dto/export-readings-query.dto";
import { Response } from "express";

describe("SensorReadingsController", () => {
  let controller: SensorReadingsController;
  let service: SensorReadingsService;

  const mockUser = createMockUserResponse();

  beforeEach(async () => {
    const mockService = {
      createReading: jest.fn(),
      batchCreateReadings: jest.fn(),
      exportReadings: jest.fn(),
      getLatestReading: jest.fn(),
      getStatistics: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SensorReadingsController],
      providers: [
        {
          provide: SensorReadingsService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<SensorReadingsController>(SensorReadingsController);
    service = module.get<SensorReadingsService>(SensorReadingsService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("createReading", () => {
    it("should create sensor reading", async () => {
      const createDto: CreateSensorReadingDto = {
        glucose: 120,
        recordedAt: new Date().toISOString(),
      };
      const expectedResult = {
        id: "reading-1",
        userId: mockUser.id,
      } as any;

      (service.createReading as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.createReading(mockUser, createDto);

      expect(result).toEqual(expectedResult);
      expect(service.createReading).toHaveBeenCalledWith(mockUser.id, createDto);
    });
  });

  describe("batchCreateReadings", () => {
    it("should batch create readings", async () => {
      const batchDto: BatchCreateSensorReadingsDto = {
        readings: [
          {
            glucose: 120,
            recordedAt: new Date().toISOString(),
          },
        ],
      };
      const expectedResult = {
        created: 1,
        skipped: 0,
        total: 1,
      };

      (service.batchCreateReadings as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.batchCreateReadings(mockUser, batchDto);

      expect(result).toEqual(expectedResult);
      expect(service.batchCreateReadings).toHaveBeenCalledWith(mockUser.id, batchDto);
    });
  });

  describe("exportReadings", () => {
    it("should export readings as JSON", async () => {
      const query: ExportReadingsQueryDto = {
        format: ExportFormat.JSON,
      };
      const expectedResult = [
        {
          id: "reading-1",
          glucose: 120,
          recordedAt: new Date().toISOString(),
        },
      ];
      const mockResponse = {
        setHeader: jest.fn(),
      } as unknown as Response;

      (service.exportReadings as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.exportReadings(mockUser, query, mockResponse);

      expect(result).toEqual(expectedResult);
      expect(service.exportReadings).toHaveBeenCalledWith(mockUser.id, query);
    });

    it("should export readings as CSV with headers", async () => {
      const query: ExportReadingsQueryDto = {
        format: ExportFormat.CSV,
      };
      const csvData = "recordedAt,glucose_mgdl,source,isHistorical\n2024-01-01,120,MANUAL,false";
      const mockResponse = {
        setHeader: jest.fn(),
      } as unknown as Response;

      (service.exportReadings as jest.Mock).mockResolvedValue(csvData);

      const result = await controller.exportReadings(mockUser, query, mockResponse);

      expect(result).toBe(csvData);
      expect(mockResponse.setHeader).toHaveBeenCalledWith("Content-Type", "text/csv");
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "Content-Disposition",
        expect.stringContaining("attachment"),
      );
    });
  });

  describe("getLatestReading", () => {
    it("should return latest reading", async () => {
      const expectedResult = {
        id: "reading-1",
        recordedAt: new Date(),
      } as any;

      (service.getLatestReading as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.getLatestReading(mockUser);

      expect(result).toEqual(expectedResult);
      expect(service.getLatestReading).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe("getStatistics", () => {
    it("should return statistics with default days", async () => {
      const expectedResult = {
        totalReadings: 100,
        averageGlucose: 120,
        minGlucose: 80,
        maxGlucose: 180,
      };

      (service.getStatistics as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.getStatistics(mockUser);

      expect(result).toEqual(expectedResult);
      expect(service.getStatistics).toHaveBeenCalledWith(mockUser.id, 30);
    });

    it("should return statistics with custom days", async () => {
      const expectedResult = {
        totalReadings: 50,
        averageGlucose: 115,
        minGlucose: 85,
        maxGlucose: 170,
      };

      (service.getStatistics as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.getStatistics(mockUser, "15");

      expect(result).toEqual(expectedResult);
      expect(service.getStatistics).toHaveBeenCalledWith(mockUser.id, 15);
    });
  });
});
