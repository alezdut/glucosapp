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
      findMine: jest.fn(),
      confirm: jest.fn(),
      cancel: jest.fn(),
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
    it("should return appointments with query filters", async () => {
      const expectedResult: any[] = [];
      const query = { includePast: true, patientId: "patient-123" };

      (service.findAll as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.findAll(mockUser, query);

      expect(result).toEqual(expectedResult);
      expect(service.findAll).toHaveBeenCalledWith(mockUser.id, query);
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

  describe("findMine", () => {
    it("should return patient appointments", async () => {
      const expectedResult: any[] = [];

      (service.findMine as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.findMine(mockUser, "true");

      expect(result).toEqual(expectedResult);
      expect(service.findMine).toHaveBeenCalledWith(mockUser.id, true);
    });
  });

  describe("confirm", () => {
    it("should confirm appointment", async () => {
      const expectedResult = { id: "apt-1", status: "CONFIRMED" } as any;

      (service.confirm as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.confirm(mockUser, "apt-1");

      expect(result).toEqual(expectedResult);
      expect(service.confirm).toHaveBeenCalledWith(mockUser.id, "apt-1");
    });
  });

  describe("cancel", () => {
    it("should cancel appointment", async () => {
      const expectedResult = { id: "apt-1", status: "CANCELLED" } as any;

      (service.cancel as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.cancel(mockUser, "apt-1");

      expect(result).toEqual(expectedResult);
      expect(service.cancel).toHaveBeenCalledWith(mockUser.id, "apt-1");
    });
  });
});
