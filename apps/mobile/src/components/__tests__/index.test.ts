import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
jest.mock("../Button", () => ({
  __esModule: true,
  default: "ButtonMock",
}));

jest.mock("../DateTimePicker", () => ({
  CustomDateTimePicker: "CustomDateTimePickerMock",
}));

jest.mock("../DateRangeCalendar", () => ({
  DateRangeCalendar: "DateRangeCalendarMock",
}));

jest.mock("../DateRangePicker", () => ({
  DateRangePicker: "DateRangePickerMock",
}));

jest.mock("../FoodListItem", () => ({
  __esModule: true,
  default: "FoodListItemMock",
}));

jest.mock("../GlucoseChart", () => ({
  GlucoseChart: "GlucoseChartMock",
}));

jest.mock("../HistoryListItem", () => ({
  HistoryListItem: "HistoryListItemMock",
}));

jest.mock("../ScreenHeader", () => ({
  __esModule: true,
  default: "ScreenHeaderMock",
}));

jest.mock("../TextInput", () => ({
  __esModule: true,
  default: "TextInputMock",
}));

describe("components index exports", () => {
  it("re-exports component modules", () => {
    const exports = require("../index");

    expect(exports.Button).toBe("ButtonMock");
    expect(exports.CustomDateTimePicker).toBe("CustomDateTimePickerMock");
    expect(exports.DateRangeCalendar).toBe("DateRangeCalendarMock");
    expect(exports.DateRangePicker).toBe("DateRangePickerMock");
    expect(exports.FoodListItem).toBe("FoodListItemMock");
    expect(exports.GlucoseChart).toBe("GlucoseChartMock");
    expect(exports.HistoryListItem).toBe("HistoryListItemMock");
    expect(exports.ScreenHeader).toBe("ScreenHeaderMock");
    expect(exports.TextInput).toBe("TextInputMock");
  });
});
