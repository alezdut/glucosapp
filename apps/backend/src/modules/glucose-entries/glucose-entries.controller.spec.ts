import { Test, TestingModule } from "@nestjs/testing";
import { GlucoseEntriesController } from "./glucose-entries.controller";
import { GlucoseEntriesService } from "./glucose-entries.service";
import { createMockUserResponse } from "../../common/test-helpers/fixtures";
import { CreateGlucoseEntryDto } from "./dto/create-glucose-entry.dto";

describe("GlucoseEntriesController", () => {
  let controller: GlucoseEntriesController;
  let service: GlucoseEntriesService;

  const mockUser = createMockUserResponse();

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GlucoseEntriesController],
      providers: [
        {
          provide: GlucoseEntriesService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<GlucoseEntriesController>(GlucoseEntriesController);
    service = module.get<GlucoseEntriesService>(GlucoseEntriesService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("create", () => {
    it("should create glucose entry", async () => {
      const createDto: CreateGlucoseEntryDto = {
        mgdl: 120,
        note: "Test entry",
      };
      const expectedResult = {
        id: "entry-1",
        userId: mockUser.id,
        mgdl: 120,
      } as any;

      (service.create as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.create(mockUser, createDto);

      expect(result).toEqual(expectedResult);
      expect(service.create).toHaveBeenCalledWith(mockUser.id, createDto);
    });
  });
});
