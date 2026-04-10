import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import {
  getScanTabOptions,
  getTabBarScreenOptions,
  scanTabOptions,
  tabBarScreenOptions,
} from "../screenOptions";
import { getPlatformTheme } from "../../theme";

jest.mock("../../theme", () => ({
  getPlatformTheme: jest.fn(() => ({
    platformConfig: {
      tabBarBackground: "#111111",
      tabBarBorder: "#222222",
      tabBarBorderWidth: 2,
      tabBarPaddingBottom: 12,
      tabBarPaddingTop: 8,
      tabBarHeight: 90,
      tabBarShadow: { shadowColor: "#000", elevation: 4 },
      tabBarIconActive: "#00FF00",
      tabBarIconInactive: "#999999",
    },
  })),
}));

const mockGetPlatformTheme = getPlatformTheme as jest.MockedFunction<typeof getPlatformTheme>;

describe("screenOptions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPlatformTheme.mockReturnValue({
      platformConfig: {
        tabBarBackground: "#111111",
        tabBarBorder: "#222222",
        tabBarBorderWidth: 2,
        tabBarPaddingBottom: 12,
        tabBarPaddingTop: 8,
        tabBarHeight: 90,
        tabBarShadow: { shadowColor: "#000", elevation: 4 },
        tabBarIconActive: "#00FF00",
        tabBarIconInactive: "#999999",
      },
    } as never);
  });

  it("builds tab bar options from platform theme", () => {
    const options = getTabBarScreenOptions();

    expect(options.headerShown).toBe(false);
    expect(options.tabBarStyle).toEqual({
      backgroundColor: "#111111",
      borderTopColor: "#222222",
      borderTopWidth: 2,
      paddingBottom: 12,
      paddingTop: 8,
      height: 90,
      shadowColor: "#000",
      elevation: 4,
    });
    expect(options.tabBarActiveTintColor).toBe("#00FF00");
    expect(options.tabBarInactiveTintColor).toBe("#999999");
    expect(options.tabBarLabelStyle).toEqual({ fontSize: 12, fontWeight: "500" });
  });

  it("builds scan tab options and keeps backward-compatible exports", () => {
    const options = getScanTabOptions();

    expect(options.tabBarLabelStyle).toEqual({
      fontSize: 12,
      fontWeight: "600",
      color: "#00FF00",
    });

    expect(tabBarScreenOptions.tabBarActiveTintColor).toBe("#00FF00");
    expect(scanTabOptions.tabBarLabelStyle.color).toBe("#00FF00");
  });
});
