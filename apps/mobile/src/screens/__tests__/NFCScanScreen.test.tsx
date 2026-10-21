import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import mockReact from "react";
import { act } from "react";
import { screen, waitFor } from "@testing-library/react";
import { Alert } from "react-native";
import NFCScanScreen from "../NFCScanScreen";
import { renderMobile } from "../../../test/render-mobile";
import * as reactQuery from "@tanstack/react-query";
import { createApiClient } from "../../lib/api";
import { generateMockLibreData } from "../../utils/libreNfcParser";

const invalidateQueries = jest.fn();
const mockGet = jest.fn();
const mockPost = jest.fn();

jest.mock("react-native", () => {
  const actual = jest.requireActual("react-native");

  class AnimatedValue {
    value: number;

    constructor(value: number) {
      this.value = value;
    }

    setValue(next: number) {
      this.value = next;
    }

    stopAnimation() {
      return undefined;
    }
  }

  const animation = {
    start: (cb?: () => void) => cb?.(),
    stop: jest.fn(),
  };

  return {
    ...actual,
    Animated: {
      ...actual.Animated,
      Value: AnimatedValue,
      timing: jest.fn(() => animation),
      sequence: jest.fn(() => animation),
      parallel: jest.fn(() => animation),
      loop: jest.fn(() => animation),
      View: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    },
  };
});

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ goBack: jest.fn() }),
  useFocusEffect: (callback: () => void) => {
    mockReact.useEffect(() => {
      callback();
    }, [callback]);
  },
}));

jest.mock("@tanstack/react-query", () => {
  const actual = jest.requireActual("@tanstack/react-query");

  return {
    ...actual,
    useQueryClient: jest.fn(),
  };
});

jest.mock("../../lib/api", () => ({
  createApiClient: jest.fn(() => ({
    GET: mockGet,
    POST: mockPost,
  })),
}));

jest.mock("../../utils/libreNfcParser", () => ({
  parseLibreNfcData: jest.fn(),
  generateMockLibreData: jest.fn(() => ({
    currentGlucose: 123,
    trend: "stable",
    historicalReadings: [
      {
        glucose: 118,
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
      },
    ],
  })),
}));

jest.mock("../../components", () => ({
  ScreenHeader: ({ title }: { title: string }) => <span>{title}</span>,
  GlucoseChart: ({
    data,
    targetRange,
  }: {
    data: unknown[];
    targetRange?: { min: number; max: number };
  }) => (
    <span>
      mock-nfc-chart-{data.length}-target-
      {targetRange ? `${targetRange.min}-${targetRange.max}` : "none"}
    </span>
  ),
}));

const mockUseQueryClient = reactQuery.useQueryClient as jest.MockedFunction<
  typeof reactQuery.useQueryClient
>;
const mockCreateApiClient = createApiClient as jest.MockedFunction<typeof createApiClient>;
const mockGenerateMockLibreData = generateMockLibreData as jest.MockedFunction<
  typeof generateMockLibreData
>;

describe("NFCScanScreen", () => {
  const alertSpy = jest.spyOn(Alert, "alert");
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  const renderScreen = async () => {
    renderMobile(<NFCScanScreen />);
    await act(async () => {
      await Promise.resolve();
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    alertSpy.mockImplementation(jest.fn());
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    mockUseQueryClient.mockReturnValue({
      invalidateQueries,
    } as never);
    mockCreateApiClient.mockClear();

    mockGet.mockImplementation((path: string) => {
      if (path === "/profile") {
        return Promise.resolve({ data: { minTargetGlucose: 80, maxTargetGlucose: 140 } });
      }
      if (path === "/sensor-readings/export") {
        return Promise.resolve({ data: [] });
      }
      if (path === "/sensor-readings/latest") {
        return Promise.resolve({ data: null });
      }
      return Promise.resolve({ data: null });
    });
    mockPost.mockImplementation(() => Promise.resolve({ data: { created: 1 } }));
    mockGenerateMockLibreData.mockImplementation(() => ({
      currentGlucose: 123,
      trend: "stable",
      historicalReadings: [
        {
          glucose: 118,
          timestamp: new Date(Date.now() - 30 * 60 * 1000),
        },
      ],
    }));
  });

  afterEach(() => {
    jest.useRealTimers();
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("shows simulation-ready instructions when NFC manager is unavailable", async () => {
    await renderScreen();

    expect(screen.getByText("Escanear Sensor")).toBeTruthy();
    expect(screen.getByText("Modo simulación: empezará automáticamente")).toBeTruthy();
  });

  it("auto-runs simulation and renders glucose result", async () => {
    await renderScreen();

    await act(async () => {
      jest.advanceTimersByTime(3200);
    });

    await waitFor(() => {
      expect(screen.getByText("123")).toBeTruthy();
      expect(screen.getByText("Glucosa Actual")).toBeTruthy();
      expect(screen.getByText(/mock-nfc-chart-/)).toBeTruthy();
    });

    expect(alertSpy).toHaveBeenCalledWith(
      "Modo Simulación",
      expect.stringContaining("Usando datos de prueba"),
      [{ text: "Entendido" }],
    );
  });

  it("uses default target range when profile fetch fails", async () => {
    mockGet.mockImplementation((path: string) => {
      if (path === "/profile") {
        return Promise.reject(new Error("profile down"));
      }
      if (path === "/sensor-readings/export") {
        return Promise.resolve({ data: [] });
      }
      if (path === "/sensor-readings/latest") {
        return Promise.resolve({ data: null });
      }
      return Promise.resolve({ data: null });
    });

    await renderScreen();

    await act(async () => {
      jest.advanceTimersByTime(3200);
    });

    await waitFor(() => {
      expect(screen.getByText(/target-70-180/)).toBeTruthy();
    });
  });

  it("does not POST when there are no new readings to save", async () => {
    mockGet.mockImplementation((path: string) => {
      if (path === "/profile") {
        return Promise.resolve({ data: { minTargetGlucose: 85, maxTargetGlucose: 145 } });
      }
      if (path === "/sensor-readings/export") {
        return Promise.resolve({ data: [] });
      }
      if (path === "/sensor-readings/latest") {
        return Promise.resolve({ data: { recordedAt: "2099-01-01T00:00:00.000Z" } });
      }
      return Promise.resolve({ data: null });
    });

    await renderScreen();

    await act(async () => {
      jest.advanceTimersByTime(3200);
    });

    await waitFor(() => {
      expect(screen.getByText("123")).toBeTruthy();
    });

    expect(mockPost).not.toHaveBeenCalled();
    expect(invalidateQueries).not.toHaveBeenCalled();
  });

  it("handles save errors without invalidating statistics", async () => {
    mockPost.mockResolvedValue({ error: { message: "save failed" } });

    await renderScreen();

    await act(async () => {
      jest.advanceTimersByTime(3200);
    });

    await waitFor(() => {
      expect(screen.getByText("123")).toBeTruthy();
    });

    expect(mockPost).toHaveBeenCalled();
    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});
