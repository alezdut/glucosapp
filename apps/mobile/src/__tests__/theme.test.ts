import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { Platform } from "react-native";
import { getPlatformTheme, theme } from "../theme";

describe("mobile theme", () => {
  it("returns iOS platform configuration when Platform.OS is ios", () => {
    Platform.OS = "ios";

    const platformTheme = getPlatformTheme();

    expect(platformTheme.platformConfig).toEqual(theme.platform.ios);
    expect(platformTheme.colors.tabBarBackground).toBe(theme.platform.ios.tabBarBackground);
    expect(platformTheme.colors.tabBarIconActive).toBe(theme.platform.ios.tabBarIconActive);
    expect(platformTheme.colors.tabBarIconInactive).toBe(theme.platform.ios.tabBarIconInactive);
  });

  it("returns Android platform configuration when Platform.OS is android", () => {
    Platform.OS = "android";

    const platformTheme = getPlatformTheme();

    expect(platformTheme.platformConfig).toEqual(theme.platform.android);
    expect(platformTheme.colors.tabBarBackground).toBe(theme.platform.android.tabBarBackground);
    expect(platformTheme.colors.tabBarIconActive).toBe(theme.platform.android.tabBarIconActive);
    expect(platformTheme.colors.tabBarIconInactive).toBe(theme.platform.android.tabBarIconInactive);
  });
});
