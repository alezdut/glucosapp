import { Test, TestingModule } from "@nestjs/testing";
import { DoctorPatientController } from "./doctor-patient.controller";
import { DoctorPatientService } from "./doctor-patient.service";
import { createMockUserResponse } from "../../common/test-helpers/fixtures";
import { CreateDoctorPatientDto } from "./dto/create-doctor-patient.dto";
import { GetPatientsQueryDto } from "./dto/get-patients-query.dto";
import { SearchPatientsDto } from "./dto/search-patients.dto";
import { UpdatePatientProfileDto } from "./dto/update-patient-profile.dto";

describe("DoctorPatientController", () => {
  let controller: DoctorPatientController;
  let service: DoctorPatientService;

  const mockUser = createMockUserResponse();

  beforeEach(async () => {
    const mockService = {
      getPatients: jest.fn(),
      searchGlobalPatients: jest.fn(),
      assignPatient: jest.fn(),
      getPatientDetails: jest.fn(),
      removePatient: jest.fn(),
      getPatientMeals: jest.fn(),
      getPatientLogEntries: jest.fn(),
      getPatientProfile: jest.fn(),
      updatePatientProfile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DoctorPatientController],
      providers: [
        {
          provide: DoctorPatientService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<DoctorPatientController>(DoctorPatientController);
    service = module.get<DoctorPatientService>(DoctorPatientService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getPatients", () => {
    it("should return patients list", async () => {
      const query: GetPatientsQueryDto = {};
      const expectedResult = [];

      (service.getPatients as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.getPatients(mockUser, query);

      expect(result).toEqual(expectedResult);
      expect(service.getPatients).toHaveBeenCalledWith(mockUser.id, query);
    });
  });

  describe("searchGlobalPatients", () => {
    it("should search for patients", async () => {
      const query: SearchPatientsDto = { q: "John" };
      const expectedResult = [];

      (service.searchGlobalPatients as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.searchGlobalPatients(mockUser, query);

      expect(result).toEqual(expectedResult);
      expect(service.searchGlobalPatients).toHaveBeenCalledWith(mockUser.id, query);
    });
  });

  describe("assignPatient", () => {
    it("should assign patient to doctor", async () => {
      const createDto: CreateDoctorPatientDto = { patientId: "patient-123" };
      const expectedResult = {
        id: "relation-123",
        doctorId: mockUser.id,
        patientId: createDto.patientId,
        createdAt: new Date().toISOString(),
        patient: {} as any,
      };

      (service.assignPatient as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.assignPatient(mockUser, createDto);

      expect(result).toEqual(expectedResult);
      expect(service.assignPatient).toHaveBeenCalledWith(mockUser.id, createDto);
    });
  });

  describe("getPatientDetails", () => {
    it("should return patient details", async () => {
      const patientId = "patient-123";
      const expectedResult = {
        id: patientId,
        email: "patient@example.com",
      } as any;

      (service.getPatientDetails as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.getPatientDetails(mockUser, patientId);

      expect(result).toEqual(expectedResult);
      expect(service.getPatientDetails).toHaveBeenCalledWith(mockUser.id, patientId);
    });
  });

  describe("removePatient", () => {
    it("should remove patient", async () => {
      const patientId = "patient-123";
      const expectedResult = { message: "Patient removed successfully" };

      (service.removePatient as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.removePatient(mockUser, patientId);

      expect(result).toEqual(expectedResult);
      expect(service.removePatient).toHaveBeenCalledWith(mockUser.id, patientId);
    });
  });

  describe("getPatientProfile", () => {
    it("should return patient profile", async () => {
      const patientId = "patient-123";
      const expectedResult = {
        id: patientId,
        email: "patient@example.com",
      } as any;

      (service.getPatientProfile as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.getPatientProfile(mockUser, patientId);

      expect(result).toEqual(expectedResult);
      expect(service.getPatientProfile).toHaveBeenCalledWith(mockUser.id, patientId);
    });
  });

  describe("updatePatientProfile", () => {
    it("should update patient profile", async () => {
      const patientId = "patient-123";
      const updateDto: UpdatePatientProfileDto = {
        targetGlucose: 110,
      };
      const expectedResult = {
        id: patientId,
        targetGlucose: 110,
      } as any;

      (service.updatePatientProfile as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.updatePatientProfile(mockUser, patientId, updateDto);

      expect(result).toEqual(expectedResult);
      expect(service.updatePatientProfile).toHaveBeenCalledWith(mockUser.id, patientId, updateDto);
    });
  });
});
