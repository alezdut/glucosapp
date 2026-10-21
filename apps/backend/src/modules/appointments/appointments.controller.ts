import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { AppointmentsService } from "./appointments.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthUser } from "../auth/decorators/auth-user.decorator";
import { UserResponseDto } from "../auth/dto/auth-response.dto";
import { CreateAppointmentDto } from "./dto/create-appointment.dto";
import { UpdateAppointmentDto } from "./dto/update-appointment.dto";
import { AppointmentResponseDto } from "./dto/appointment-response.dto";
import { GetAppointmentsQueryDto } from "./dto/get-appointments-query.dto";
import { CalendarDayResponseDto } from "./dto/calendar-day-response.dto";

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
    @Query() query: GetAppointmentsQueryDto,
  ): Promise<AppointmentResponseDto[]> {
    return this.appointmentsService.findAll(user.id, query);
  }

  @Get("calendar")
  @ApiOperation({ summary: "Get monthly appointment summary for calendar view" })
  @ApiResponse({
    status: 200,
    description: "Calendar summary retrieved successfully",
    type: [CalendarDayResponseDto],
  })
  async getCalendarSummary(
    @AuthUser() user: UserResponseDto,
    @Query("month") month: string,
  ): Promise<CalendarDayResponseDto[]> {
    return this.appointmentsService.getCalendarSummary(user.id, month);
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

  @Get("my")
  @ApiOperation({ summary: "Get all appointments for the authenticated patient" })
  @ApiResponse({
    status: 200,
    description: "Patient appointments retrieved successfully",
    type: [AppointmentResponseDto],
  })
  @ApiResponse({ status: 403, description: "Forbidden - Only patients can access" })
  async findMine(
    @AuthUser() user: UserResponseDto,
    @Query("includePast") includePast?: string,
  ): Promise<AppointmentResponseDto[]> {
    return this.appointmentsService.findMine(user.id, includePast === "true");
  }

  @Put(":id/confirm")
  @ApiOperation({ summary: "Confirm an appointment as patient" })
  @ApiResponse({
    status: 200,
    description: "Appointment confirmed successfully",
    type: AppointmentResponseDto,
  })
  async confirm(
    @AuthUser() user: UserResponseDto,
    @Param("id") id: string,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentsService.confirm(user.id, id);
  }

  @Put(":id/cancel")
  @ApiOperation({ summary: "Cancel an appointment as patient" })
  @ApiResponse({
    status: 200,
    description: "Appointment cancelled successfully",
    type: AppointmentResponseDto,
  })
  async cancel(
    @AuthUser() user: UserResponseDto,
    @Param("id") id: string,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentsService.cancel(user.id, id);
  }
}
