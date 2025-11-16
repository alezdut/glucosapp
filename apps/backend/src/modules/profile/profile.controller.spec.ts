import { Test, TestingModule } from "@nestjs/testing";
import { ProfileController } from "./profile.controller";
import { ProfileService } from "./profile.service";
import { createMockUserResponse } from "../../common/test-helpers/fixtures";
import { UpdateProfileDto } from "./dto/update-profile.dto";

describe("ProfileController", () => {
  let controller: ProfileController;
  let service: ProfileService;

  const mockUser = createMockUserResponse();

  beforeEach(async () => {
    const mockService = {
      getProfile: jest.fn(),
      getAssignedDoctor: jest.fn(),
      updateProfile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfileController],
      providers: [
        {
          provide: ProfileService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<ProfileController>(ProfileController);
    service = module.get<ProfileService>(ProfileService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getProfile", () => {
    it("should return user profile", async () => {
      const expectedResult = {
        id: mockUser.id,
        email: mockUser.email,
      } as any;

      (service.getProfile as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.getProfile(mockUser);

      expect(result).toEqual(expectedResult);
      expect(service.getProfile).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe("getAssignedDoctor", () => {
    it("should return assigned doctor", async () => {
      const expectedResult = {
        id: "relation-123",
        doctorId: "doctor-123",
        patientId: mockUser.id,
      } as any;

      (service.getAssignedDoctor as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.getAssignedDoctor(mockUser);

      expect(result).toEqual(expectedResult);
      expect(service.getAssignedDoctor).toHaveBeenCalledWith(mockUser.id);
    });

    it("should return null if no doctor assigned", async () => {
      (service.getAssignedDoctor as jest.Mock).mockResolvedValue(null);

      const result = await controller.getAssignedDoctor(mockUser);

      expect(result).toBeNull();
    });
  });

  describe("updateProfile", () => {
    it("should update profile", async () => {
      const updateDto: UpdateProfileDto = {
        weight: 75,
        targetGlucose: 110,
      };
      const expectedResult = {
        id: mockUser.id,
        weight: 75,
        targetGlucose: 110,
      } as any;

      (service.updateProfile as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.updateProfile(mockUser, updateDto);

      expect(result).toEqual(expectedResult);
      expect(service.updateProfile).toHaveBeenCalledWith(mockUser.id, updateDto);
    });
  });
});
