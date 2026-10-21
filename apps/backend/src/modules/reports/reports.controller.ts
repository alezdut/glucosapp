import { Controller, Post, Body, UseGuards, Res, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import type { Response } from "express";
import { ReportsService } from "./reports.service";
import {
  GenerateIndividualReportDto,
  GenerateGroupReportDto,
  ReportFormat,
} from "./dto/generate-report.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthUser } from "../auth/decorators/auth-user.decorator";
import type { UserResponseDto } from "../auth/dto/auth-response.dto";

/**
 * Controller for reports endpoints
 */
@ApiTags("reports")
@Controller({ path: "reports", version: "1" })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * Generate individual patient report
   */
  @Post("individual")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Generate individual patient report" })
  @ApiResponse({ status: 200, description: "Report generated successfully" })
  @ApiResponse({ status: 403, description: "Forbidden - Patient not assigned to doctor" })
  @ApiResponse({ status: 404, description: "Patient not found" })
  async generateIndividualReport(
    @AuthUser() user: UserResponseDto,
    @Body() dto: GenerateIndividualReportDto,
    @Res() res: Response,
  ) {
    const report = await this.reportsService.generateIndividualReport(user.id, dto);

    if (dto.format === ReportFormat.PDF) {
      const filename = `reporte_paciente_${dto.patientId}_${new Date().toISOString().split("T")[0]}.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      return res.send(report);
    } else {
      const filename = `reporte_paciente_${dto.patientId}_${new Date().toISOString().split("T")[0]}.csv`;
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      return res.send(report);
    }
  }

  /**
   * Generate group report for multiple patients
   */
  @Post("group")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Generate group report for multiple patients" })
  @ApiResponse({ status: 200, description: "Report generated successfully" })
  @ApiResponse({ status: 404, description: "No patients found matching criteria" })
  async generateGroupReport(
    @AuthUser() user: UserResponseDto,
    @Body() dto: GenerateGroupReportDto,
    @Res() res: Response,
  ) {
    const report = await this.reportsService.generateGroupReport(user.id, dto);

    if (dto.format === ReportFormat.PDF) {
      const filename = `reporte_grupal_${new Date().toISOString().split("T")[0]}.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      return res.send(report);
    } else {
      const filename = `reporte_grupal_${new Date().toISOString().split("T")[0]}.csv`;
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      return res.send(report);
    }
  }
}
