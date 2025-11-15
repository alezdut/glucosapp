import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateInsulinDoseDto } from "./dto/create-insulin-dose.dto";

/**
 * Service handling insulin doses
 */
@Injectable()
export class InsulinDosesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create insulin dose
   */
  async create(userId: string, data: CreateInsulinDoseDto) {
    return this.prisma.insulinDose.create({
      data: {
        userId,
        units: data.units,
        type: data.type,
        recordedAt: data.recordedAt ? new Date(data.recordedAt) : new Date(),
      },
    });
  }
}
