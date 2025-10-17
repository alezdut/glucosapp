import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateMealDto } from "./dto/create-meal.dto";

/**
 * Service handling meals
 */
@Injectable()
export class MealsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create meal
   */
  async create(userId: string, data: CreateMealDto) {
    return this.prisma.meal.create({
      data: {
        userId,
        name: data.name,
        carbohydrates: data.carbohydrates,
        recordedAt: data.recordedAt ? new Date(data.recordedAt) : new Date(),
      },
    });
  }
}
