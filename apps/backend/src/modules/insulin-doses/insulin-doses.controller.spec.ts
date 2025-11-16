import { Test, TestingModule } from "@nestjs/testing";
import { InsulinDosesController } from "./insulin-doses.controller";
import { InsulinDosesService } from "./insulin-doses.service";
import { createMockUserResponse } from "../../common/test-helpers/fixtures";
import { CreateInsulinDoseDto } from "./dto/create-insulin-dose.dto";
import { InsulinType } from "@glucosapp/types";

describe("InsulinDosesController", () => {
  let controller: InsulinDosesController;
  let service: InsulinDosesService;

  const mockUser = createMockUserResponse();

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InsulinDosesController],
      providers: [
        {
          provide: InsulinDosesService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<InsulinDosesController>(InsulinDosesController);
    service = module.get<InsulinDosesService>(InsulinDosesService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("create", () => {
    it("should create insulin dose", async () => {
      const createDto: CreateInsulinDoseDto = {
        units: 5,
        type: InsulinType.BOLUS,
        recordedAt: new Date().toISOString(),
      };
      const expectedResult = {
        id: "dose-1",
        userId: mockUser.id,
        units: 5,
      } as any;

      (service.create as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.create(mockUser, createDto);

      expect(result).toEqual(expectedResult);
      expect(service.create).toHaveBeenCalledWith(mockUser.id, createDto);
    });
  });
});
