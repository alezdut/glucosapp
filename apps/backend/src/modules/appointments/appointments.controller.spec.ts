import { Test, TestingModule } from "@nestjs/testing";
import { AppointmentsController } from "./appointments.controller";
import { AppointmentsService } from "./appointments.service";
import { createMockUserResponse } from "../../common/test-helpers/fixtures";
import { CreateAppointmentDto } from "./dto/create-appointment.dto";
import { UpdateAppointmentDto } from "./dto/update-appointment.dto";

describe("AppointmentsController", () => {
  let controller: AppointmentsController;
  let service: AppointmentsService;

  const mockUser = createMockUserResponse();

  beforeEach(async () => {
    const mockService = {
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppointmentsController],
      providers: [
        {
          provide: AppointmentsService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<AppointmentsController>(AppointmentsController);
    service = module.get<AppointmentsService>(AppointmentsService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("findAll", () => {
    it("should return appointments without past by default", async () => {
      const expectedResult = [];

      (service.findAll as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.findAll(mockUser);

      expect(result).toEqual(expectedResult);
      expect(service.findAll).toHaveBeenCalledWith(mockUser.id, false);
    });

    it("should return appointments including past when includePast is true", async () => {
      const expectedResult = [];

      (service.findAll as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.findAll(mockUser, "true");

      expect(result).toEqual(expectedResult);
      expect(service.findAll).toHaveBeenCalledWith(mockUser.id, true);
    });
  });

  describe("create", () => {
    it("should create appointment", async () => {
      const createDto: CreateAppointmentDto = {
        patientId: "patient-123",
        scheduledAt: new Date().toISOString(),
      };
      const expectedResult = {
        id: "apt-1",
        doctorId: mockUser.id,
        patientId: createDto.patientId,
      } as any;

      (service.create as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.create(mockUser, createDto);

      expect(result).toEqual(expectedResult);
      expect(service.create).toHaveBeenCalledWith(mockUser.id, createDto);
    });
  });

  describe("update", () => {
    it("should update appointment", async () => {
      const appointmentId = "apt-1";
      const updateDto: UpdateAppointmentDto = {
        status: "CONFIRMED",
      };
      const expectedResult = {
        id: appointmentId,
        status: "CONFIRMED",
      } as any;

      (service.update as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.update(mockUser, appointmentId, updateDto);

      expect(result).toEqual(expectedResult);
      expect(service.update).toHaveBeenCalledWith(mockUser.id, appointmentId, updateDto);
    });
  });

  describe("remove", () => {
    it("should delete appointment", async () => {
      const appointmentId = "apt-1";
      const expectedResult = { message: "Appointment deleted successfully" };

      (service.remove as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.remove(mockUser, appointmentId);

      expect(result).toEqual(expectedResult);
      expect(service.remove).toHaveBeenCalledWith(mockUser.id, appointmentId);
    });
  });
});
