// Mock the mdi-insulin-algorithm package globally
jest.mock("@glucosapp/mdi-insulin-algorithm", () => ({
  calculateDose: jest.fn(),
  calculateBreakfastDose: jest.fn(),
  calculateLunchDose: jest.fn(),
  calculateDinnerDose: jest.fn(),
  calculateCorrectionDose: jest.fn(),
  evaluatePreSleep: jest.fn(),
  calculateBetweenMealCorrection: jest.fn(),
  calculateIOB: jest.fn(),
  configure: jest.fn(),
}));
