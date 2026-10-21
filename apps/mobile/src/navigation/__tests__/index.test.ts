import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
jest.mock("../RootNavigator", () => ({
  __esModule: true,
  default: "RootNavigatorMock",
}));

jest.mock("../TabNavigator", () => ({
  __esModule: true,
  default: "TabNavigatorMock",
}));

jest.mock("../AuthNavigator", () => ({
  __esModule: true,
  default: "AuthNavigatorMock",
}));

jest.mock("../types", () => ({
  __esModule: true,
  profileRoute: "profileRouteMock",
}));

jest.mock("../screenOptions", () => ({
  __esModule: true,
  createTabScreenOptions: "createTabScreenOptionsMock",
}));

describe("navigation index exports", () => {
  it("re-exports navigation modules", () => {
    const exports = require("../index");

    expect(exports.default).toBeUndefined();
    expect(exports.RootNavigator).toBe("RootNavigatorMock");
    expect(exports.TabNavigator).toBe("TabNavigatorMock");
    expect(exports.AuthNavigator).toBe("AuthNavigatorMock");
    expect(exports.profileRoute).toBe("profileRouteMock");
    expect(exports.createTabScreenOptions).toBe("createTabScreenOptionsMock");
  });
});
