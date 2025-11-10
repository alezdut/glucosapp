import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { AppointmentsService } from "./appointments.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthUser } from "../auth/decorators/auth-user.decorator";
import { UserResponseDto } from "../auth/dto/auth-response.dto";
import { CreateAppointmentDto } from "./dto/create-appointment.dto";
import { UpdateAppointmentDto } from "./dto/update-appointment.dto";
import { AppointmentResponseDto } from "./dto/appointment-response.dto";

/**
 * Controller handling appointments
 */
@ApiTags("appointments")
@Controller({ path: "appointments", version: "1" })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  /**
   * Get all appointments for the authenticated doctor
   */
  @Get()
  @ApiOperation({ summary: "Get all appointments" })
  @ApiResponse({
    status: 200,
    description: "Appointments retrieved successfully",
    type: [AppointmentResponseDto],
  })
  @ApiResponse({ status: 403, description: "Forbidden - Only doctors can access" })
  async findAll(
    @AuthUser() user: UserResponseDto,
    @Query("includePast") includePast?: string,
  ): Promise<AppointmentResponseDto[]> {
    return this.appointmentsService.findAll(user.id, includePast === "true");
  }

  /**
   * Create a new appointment
   */
  @Post()
  @ApiOperation({ summary: "Create appointment" })
  @ApiResponse({
    status: 201,
    description: "Appointment created successfully",
    type: AppointmentResponseDto,
  })
  @ApiResponse({ status: 403, description: "Forbidden - Only doctors can access" })
  @ApiResponse({ status: 404, description: "Patient not assigned to doctor" })
  async create(
    @AuthUser() user: UserResponseDto,
    @Body() createDto: CreateAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentsService.create(user.id, createDto);
  }

  /**
   * Update an appointment
   */
  @Put(":id")
  @ApiOperation({ summary: "Update appointment" })
  @ApiResponse({
    status: 200,
    description: "Appointment updated successfully",
    type: AppointmentResponseDto,
  })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "Appointment not found" })
  async update(
    @AuthUser() user: UserResponseDto,
    @Param("id") id: string,
    @Body() updateDto: UpdateAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentsService.update(user.id, id, updateDto);
  }

  /**
   * Delete an appointment
   */
  @Delete(":id")
  @ApiOperation({ summary: "Delete appointment" })
  @ApiResponse({ status: 200, description: "Appointment deleted successfully" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "Appointment not found" })
  async remove(
    @AuthUser() user: UserResponseDto,
    @Param("id") id: string,
  ): Promise<{ message: string }> {
    return this.appointmentsService.remove(user.id, id);
  }
}
