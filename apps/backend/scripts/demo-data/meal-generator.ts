/**
 * Meal generation logic for demo data
 */

import { randomChoice, randomFloat, randomInt } from "./utils";

export type MealType = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";

export interface MealTemplate {
  name: string;
  carbs: number;
  type: MealType;
}

// Breakfast templates (30-60g carbs)
const BREAKFAST_TEMPLATES: MealTemplate[] = [
  { name: "Tostadas con mermelada", carbs: 45, type: "BREAKFAST" },
  { name: "Cereales con leche", carbs: 50, type: "BREAKFAST" },
  { name: "Medialunas", carbs: 55, type: "BREAKFAST" },
  { name: "Yogur con granola", carbs: 38, type: "BREAKFAST" },
  { name: "Pan tostado con queso", carbs: 42, type: "BREAKFAST" },
  { name: "Avena con frutas", carbs: 48, type: "BREAKFAST" },
  { name: "Panqueques", carbs: 60, type: "BREAKFAST" },
  { name: "Tostadas con palta", carbs: 35, type: "BREAKFAST" },
];

// Lunch templates (50-80g carbs)
const LUNCH_TEMPLATES: MealTemplate[] = [
  { name: "Milanesa con puré", carbs: 65, type: "LUNCH" },
  { name: "Pasta con salsa", carbs: 75, type: "LUNCH" },
  { name: "Arroz con pollo", carbs: 70, type: "LUNCH" },
  { name: "Pizza (2 porciones)", carbs: 80, type: "LUNCH" },
  { name: "Empanadas (3 unidades)", carbs: 72, type: "LUNCH" },
  { name: "Ensalada con pan", carbs: 50, type: "LUNCH" },
  { name: "Sándwich completo", carbs: 58, type: "LUNCH" },
  { name: "Hamburguesa", carbs: 62, type: "LUNCH" },
  { name: "Guiso de lentejas", carbs: 68, type: "LUNCH" },
  { name: "Ravioles", carbs: 78, type: "LUNCH" },
];

// Dinner templates (40-70g carbs)
const DINNER_TEMPLATES: MealTemplate[] = [
  { name: "Pollo con ensalada y pan", carbs: 45, type: "DINNER" },
  { name: "Pescado con arroz", carbs: 55, type: "DINNER" },
  { name: "Tortilla de papa", carbs: 48, type: "DINNER" },
  { name: "Sopa y tostadas", carbs: 42, type: "DINNER" },
  { name: "Tarta de verduras", carbs: 52, type: "DINNER" },
  { name: "Carne con papas", carbs: 58, type: "DINNER" },
  { name: "Ensalada César", carbs: 38, type: "DINNER" },
  { name: "Wraps de pollo", carbs: 50, type: "DINNER" },
  { name: "Risotto", carbs: 65, type: "DINNER" },
  { name: "Pizza (1 porción)", carbs: 40, type: "DINNER" },
];

// Snack templates (15-30g carbs)
const SNACK_TEMPLATES: MealTemplate[] = [
  { name: "Fruta", carbs: 20, type: "SNACK" },
  { name: "Galletitas", carbs: 25, type: "SNACK" },
  { name: "Alfajor", carbs: 30, type: "SNACK" },
  { name: "Barrita de cereal", carbs: 22, type: "SNACK" },
  { name: "Yogur", carbs: 18, type: "SNACK" },
  { name: "Tostadas con dulce", carbs: 28, type: "SNACK" },
  { name: "Banana", carbs: 25, type: "SNACK" },
  { name: "Manzana", carbs: 15, type: "SNACK" },
];

export interface GeneratedMeal {
  name: string;
  carbs: number;
  type: MealType;
  timestamp: Date;
}

/**
 * Generate a meal for a specific meal type with some variation in carbs
 */
export function generateMeal(mealType: MealType, timestamp: Date): GeneratedMeal {
  let templates: MealTemplate[];

  switch (mealType) {
    case "BREAKFAST":
      templates = BREAKFAST_TEMPLATES;
      break;
    case "LUNCH":
      templates = LUNCH_TEMPLATES;
      break;
    case "DINNER":
      templates = DINNER_TEMPLATES;
      break;
    case "SNACK":
      templates = SNACK_TEMPLATES;
      break;
  }

  const template = randomChoice(templates);

  // Add ±10% variation to carbs
  const variation = randomFloat(-0.1, 0.1);
  const carbs = Math.round(template.carbs * (1 + variation));

  return {
    name: template.name,
    carbs,
    type: mealType,
    timestamp,
  };
}

/**
 * Determine meal type based on time of day
 */
export function getMealTypeForTime(hour: number): MealType {
  if (hour >= 6 && hour < 10) return "BREAKFAST";
  if (hour >= 12 && hour < 15) return "LUNCH";
  if (hour >= 19 && hour < 22) return "DINNER";
  return "SNACK";
}

/**
 * Generate meal times for a day
 * Returns array of hours when meals should occur
 */
export function generateMealTimes(mealsPerDay: number): number[] {
  const times: number[] = [];

  // Always include main meals
  times.push(7 + randomFloat(-0.5, 0.5)); // Breakfast ~7am
  times.push(13 + randomFloat(-0.5, 0.5)); // Lunch ~1pm
  times.push(20 + randomFloat(-0.5, 0.5)); // Dinner ~8pm

  // Add snacks if needed
  if (mealsPerDay > 3) {
    const extraMeals = mealsPerDay - 3;

    // Morning snack
    if (extraMeals >= 1) {
      times.push(10 + randomFloat(-0.5, 0.5));
    }

    // Afternoon snack
    if (extraMeals >= 2) {
      times.push(17 + randomFloat(-0.5, 0.5));
    }
  }

  return times.sort((a, b) => a - b).slice(0, mealsPerDay);
}

/**
 * Generate all meals for a day
 */
export function generateDailyMeals(date: Date, mealsPerDay: number): GeneratedMeal[] {
  const mealTimes = generateMealTimes(mealsPerDay);
  const meals: GeneratedMeal[] = [];

  for (const mealHour of mealTimes) {
    const hours = Math.floor(mealHour);
    const minutes = Math.round((mealHour - hours) * 60);

    const timestamp = new Date(date);
    timestamp.setHours(hours, minutes, 0, 0);

    const mealType = getMealTypeForTime(hours);
    const meal = generateMeal(mealType, timestamp);
    meals.push(meal);
  }

  return meals;
}
