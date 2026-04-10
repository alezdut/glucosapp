import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
describe("navigation-service", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("queues navigation actions until the ref is ready", () => {
    const dispatch = jest.fn();
    const isReady = jest.fn(() => false);
    const navigateMock = jest.fn((params: { name: string; params?: object }) => ({
      type: "NAVIGATE",
      payload: params,
    }));

    jest.doMock("@react-navigation/native", () => ({
      CommonActions: { navigate: navigateMock },
      createNavigationContainerRef: () => ({
        isReady,
        dispatch,
      }),
    }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const navigationService =
      require("../navigation-service") as typeof import("../navigation-service");

    navigationService.navigate("Communication");
    expect(dispatch).not.toHaveBeenCalled();

    isReady.mockReturnValue(true);
    navigationService.flushPendingNavigationActions();

    expect(navigateMock).toHaveBeenCalledWith({ name: "Communication", params: undefined });
    expect(dispatch).toHaveBeenCalledWith({
      type: "NAVIGATE",
      payload: { name: "Communication", params: undefined },
    });
  });

  it("navigates immediately when the ref is ready and supports params", () => {
    const dispatch = jest.fn();
    const isReady = jest.fn(() => true);
    const navigateMock = jest.fn((params: { name: string; params?: object }) => ({
      type: "NAVIGATE",
      payload: params,
    }));

    jest.doMock("@react-navigation/native", () => ({
      CommonActions: { navigate: navigateMock },
      createNavigationContainerRef: () => ({
        isReady,
        dispatch,
      }),
    }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const navigationService =
      require("../navigation-service") as typeof import("../navigation-service");

    navigationService.navigate("Registrar", { carbohydrates: 45 });

    expect(dispatch).toHaveBeenCalledWith({
      type: "NAVIGATE",
      payload: { name: "Registrar", params: { carbohydrates: 45 } },
    });
  });

  it("does nothing when flush is called and the ref is not ready", () => {
    const dispatch = jest.fn();
    const isReady = jest.fn(() => false);
    const navigateMock = jest.fn((params: { name: string; params?: object }) => ({
      type: "NAVIGATE",
      payload: params,
    }));

    jest.doMock("@react-navigation/native", () => ({
      CommonActions: { navigate: navigateMock },
      createNavigationContainerRef: () => ({
        isReady,
        dispatch,
      }),
    }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const navigationService =
      require("../navigation-service") as typeof import("../navigation-service");

    navigationService.navigate("Appointments");
    navigationService.flushPendingNavigationActions();

    expect(dispatch).not.toHaveBeenCalled();
  });
});
