import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateMealDto } from "./dto/create-meal.dto";

/**
 * Service handling meal templates
 */
@Injectable()
export class MealsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create meal template with food items
   */
  async create(userId: string, data: CreateMealDto) {
    // Calculate total carbs from food items
    const totalCarbs = data.foodItems.reduce((sum, item) => sum + item.carbs, 0);

    return this.prisma.meal.create({
      data: {
        userId,
        name: data.name,
        carbohydrates: totalCarbs,
        foodItems: {
          create: data.foodItems,
        },
      },
      include: {
        foodItems: true,
      },
    });
  }

  /**
   * Get all meal templates for user
   */
  async findAll(userId: string) {
    return this.prisma.meal.findMany({
      where: { userId },
      include: { foodItems: true },
      orderBy: { updatedAt: "desc" },
    });
  }

  /**
   * Get specific meal template
   */
  async findOne(userId: string, id: string) {
    return this.prisma.meal.findFirst({
      where: { userId, id },
      include: { foodItems: true },
    });
  }

  /**
   * Delete meal template
   */
  async delete(userId: string, id: string) {
    // First, verify the meal exists and belongs to the user
    const meal = await this.prisma.meal.findFirst({
      where: { id, userId },
    });

    if (!meal) {
      throw new NotFoundException(`Meal with ID ${id} not found`);
    }

    // Then delete using the unique id constraint
    return this.prisma.meal.delete({
      where: { id },
    });
  }
}
