import { Module } from "@nestjs/common";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";
import { CommonModule } from "../../common/common.module";
import { DoctorPatientModule } from "../doctor-patient/doctor-patient.module";

@Module({
  imports: [CommonModule, DoctorPatientModule],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
