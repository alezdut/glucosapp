import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import mockReact from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { Alert } from "react-native";
import HistoryScreen from "../HistoryScreen";
import { renderMobile } from "../../../test/render-mobile";
import * as reactQuery from "@tanstack/react-query";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { createApiClient } from "../../lib/api";

const mockRefetchLogs = jest.fn();
const mockRefetchSensors = jest.fn();

let mockLogEntriesData: unknown[] | undefined = [];
let mockSensorReadingsData: unknown[] | undefined = [];
let mockLogEntriesError: unknown = null;
let mockSensorReadingsError: unknown = null;
let mockLogEntriesLoading = false;
let mockSensorReadingsLoading = false;
let mockRefetchingLogs = false;
let mockRefetchingSensors = false;

const mockScrollToIndex = jest.fn();

jest.mock("react-native", () => {
  const actual = jest.requireActual("react-native");

  return {
    ...actual,
    FlatList: mockReact.forwardRef(
      (
        {
          data,
          renderItem,
          ListEmptyComponent,
          onScrollToIndexFailed,
        }: {
          data?: Array<unknown>;
          renderItem?: (args: unknown) => React.ReactNode;
          ListEmptyComponent?: React.ReactNode | (() => React.ReactNode);
          onScrollToIndexFailed?: (info: { index: number }) => void;
        },
        ref: React.Ref<{ scrollToIndex: (options: unknown) => void }>,
      ) => {
        mockReact.useImperativeHandle(ref, () => ({
          scrollToIndex: mockScrollToIndex,
        }));

        if (!data || data.length === 0) {
          return (
            <>
              {typeof ListEmptyComponent === "function" ? (
                <>{ListEmptyComponent()}</>
              ) : (
                <>{ListEmptyComponent}</>
              )}
              <button onClick={() => onScrollToIndexFailed?.({ index: 0 })}>scroll-failed</button>
            </>
          );
        }

        return (
          <>
            <button onClick={() => onScrollToIndexFailed?.({ index: 0 })}>scroll-failed</button>
            {data.map((item, index) => (
              <mockReact.Fragment key={(item as { id?: string })?.id ?? index}>
                {renderItem?.({ item, index } as never)}
              </mockReact.Fragment>
            ))}
          </>
        );
      },
    ),
    RefreshControl: () => null,
  };
});

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (callback: () => void) => {
    mockReact.useEffect(() => {
      callback();
    }, [callback]);
  },
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("expo-file-system", () => ({
  documentDirectory: "file:///documents/",
  cacheDirectory: "file:///cache/",
  writeAsStringAsync: jest.fn(),
  EncodingType: { UTF8: "utf8" },
}));

jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn(),
}));

jest.mock("../../lib/api", () => ({
  createApiClient: jest.fn(),
}));

jest.mock("../../components", () => ({
  ScreenHeader: ({ title }: { title: string }) => <span>{title}</span>,
  DateRangePicker: () => <span>date-range-picker</span>,
  HistoryListItem: ({
    entry,
    isExpanded,
    onToggle,
  }: {
    entry: { id: string };
    isExpanded: boolean;
    onToggle: () => void;
  }) => (
    <button onClick={onToggle}>
      {entry.id}-{isExpanded ? "expanded" : "collapsed"}
    </button>
  ),
}));

jest.mock("@tanstack/react-query", () => {
  const actual = jest.requireActual("@tanstack/react-query");

  return {
    ...actual,
    useQuery: jest.fn(),
  };
});

const mockUseQuery = reactQuery.useQuery as jest.MockedFunction<typeof reactQuery.useQuery>;
const mockWriteAsStringAsync = FileSystem.writeAsStringAsync as jest.MockedFunction<
  typeof FileSystem.writeAsStringAsync
>;
const mockIsAvailableAsync = Sharing.isAvailableAsync as jest.MockedFunction<
  typeof Sharing.isAvailableAsync
>;
const mockShareAsync = Sharing.shareAsync as jest.MockedFunction<typeof Sharing.shareAsync>;
const mockCreateApiClient = createApiClient as jest.MockedFunction<typeof createApiClient>;

describe("HistoryScreen", () => {
  const alertSpy = jest.spyOn(Alert, "alert");

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy.mockImplementation(jest.fn());

    mockLogEntriesData = [];
    mockSensorReadingsData = [];
    mockLogEntriesError = null;
    mockSensorReadingsError = null;
    mockLogEntriesLoading = false;
    mockSensorReadingsLoading = false;
    mockRefetchingLogs = false;
    mockRefetchingSensors = false;
    mockScrollToIndex.mockReset();

    mockUseQuery.mockImplementation(({ queryKey }) => {
      if (queryKey[0] === "logEntries") {
        return {
          data: mockLogEntriesData,
          isLoading: mockLogEntriesLoading,
          error: mockLogEntriesError,
          refetch: mockRefetchLogs,
          isRefetching: mockRefetchingLogs,
        } as never;
      }

      if (queryKey[0] === "sensorReadings") {
        return {
          data: mockSensorReadingsData,
          isLoading: mockSensorReadingsLoading,
          error: mockSensorReadingsError,
          refetch: mockRefetchSensors,
          isRefetching: mockRefetchingSensors,
        } as never;
      }

      return {
        data: undefined,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isRefetching: false,
      } as never;
    });
  });

  it("shows loading copy while history data is resolving", () => {
    mockLogEntriesLoading = true;
    mockSensorReadingsLoading = true;

    renderMobile(<HistoryScreen />);

    expect(screen.getByText("Cargando historial...")).toBeTruthy();
  });

  it("shows error state and retries both queries", () => {
    mockLogEntriesError = new Error("failed");

    renderMobile(<HistoryScreen />);

    expect(screen.getByText("Error al cargar el historial")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(mockRefetchLogs).toHaveBeenCalled();
    expect(mockRefetchSensors).toHaveBeenCalled();
  });

  it("shows empty state and alerts when exporting or sharing without data", () => {
    renderMobile(<HistoryScreen />);

    expect(screen.getByText("No hay registros")).toBeTruthy();
    expect(screen.getByText("date-range-picker")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Exportar/i }));
    fireEvent.click(screen.getByRole("button", { name: /Compartir/i }));

    expect(alertSpy).toHaveBeenCalledWith("Sin datos", "No hay registros para exportar", [
      { text: "OK" },
    ]);
    expect(alertSpy).toHaveBeenCalledWith("Sin datos", "No hay registros para compartir", [
      { text: "OK" },
    ]);
  });

  it("exports CSV when there is data", async () => {
    mockLogEntriesData = [
      {
        id: "entry-1",
        recordedAt: "2026-04-10T12:00:00.000Z",
        glucose: 120,
      },
    ];
    mockSensorReadingsData = [];

    renderMobile(<HistoryScreen />);

    fireEvent.click(screen.getByRole("button", { name: /Exportar/i }));

    await waitFor(() => {
      expect(mockWriteAsStringAsync).toHaveBeenCalled();
    });

    expect(alertSpy).toHaveBeenCalledWith(
      "Éxito",
      expect.stringContaining("Archivo exportado exitosamente"),
      [{ text: "OK" }],
    );
  });

  it("shows unavailable sharing alert when the device cannot share files", async () => {
    mockLogEntriesData = [
      {
        id: "entry-1",
        recordedAt: "2026-04-10T12:00:00.000Z",
        glucose: 120,
      },
    ];
    mockIsAvailableAsync.mockResolvedValue(false);

    renderMobile(<HistoryScreen />);

    fireEvent.click(screen.getByRole("button", { name: /Compartir/i }));

    await waitFor(() => {
      expect(mockIsAvailableAsync).toHaveBeenCalled();
    });

    expect(alertSpy).toHaveBeenCalledWith(
      "No disponible",
      "La función de compartir no está disponible en este dispositivo",
      [{ text: "OK" }],
    );
  });

  it("shares CSV when data exists and sharing is available", async () => {
    mockLogEntriesData = [
      {
        id: "entry-1",
        recordedAt: "2026-04-10T12:00:00.000Z",
        glucose: 120,
      },
    ];
    mockSensorReadingsData = [];
    mockIsAvailableAsync.mockResolvedValue(true);

    renderMobile(<HistoryScreen />);

    fireEvent.click(screen.getByRole("button", { name: /Compartir/i }));

    await waitFor(() => {
      expect(mockWriteAsStringAsync).toHaveBeenCalled();
      expect(mockShareAsync).toHaveBeenCalled();
    });
  });

  it("shows export error alert when writing CSV fails", async () => {
    mockLogEntriesData = [
      {
        id: "entry-1",
        recordedAt: "2026-04-10T12:00:00.000Z",
        glucose: 120,
      },
    ];
    mockWriteAsStringAsync.mockRejectedValueOnce(new Error("disk full"));

    renderMobile(<HistoryScreen />);

    fireEvent.click(screen.getByRole("button", { name: /Exportar/i }));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Error", "No se pudo exportar el archivo", [
        { text: "OK" },
      ]);
    });
  });

  it("runs log entries queryFn and throws when API returns error", async () => {
    mockCreateApiClient.mockReturnValue({
      GET: jest.fn().mockResolvedValue({ error: { message: "boom" } }),
    } as never);

    renderMobile(<HistoryScreen />);

    const logEntriesQuery = mockUseQuery.mock.calls.find(
      ([options]) => options.queryKey[0] === "logEntries",
    )?.[0];

    await expect(logEntriesQuery?.queryFn?.()).rejects.toThrow("Failed to fetch log entries");
  });

  it("runs sensor readings queryFn and returns empty array on API error", async () => {
    mockCreateApiClient.mockReturnValue({
      GET: jest.fn().mockResolvedValue({ error: { message: "no sensors" } }),
    } as never);

    renderMobile(<HistoryScreen />);

    const sensorsQuery = mockUseQuery.mock.calls.find(
      ([options]) => options.queryKey[0] === "sensorReadings",
    )?.[0];

    await expect(sensorsQuery?.queryFn?.()).resolves.toEqual([]);
  });

  it("toggles expanded item and triggers delayed scroll", async () => {
    jest.useFakeTimers();

    mockLogEntriesData = [
      {
        id: "entry-1",
        recordedAt: "2026-04-10T12:00:00.000Z",
        glucose: 120,
      },
    ];

    renderMobile(<HistoryScreen />);

    fireEvent.click(screen.getByRole("button", { name: "entry-1-collapsed" }));
    jest.runOnlyPendingTimers();

    expect(mockScrollToIndex).toHaveBeenCalledWith({
      index: 0,
      animated: true,
      viewPosition: 0.1,
    });

    fireEvent.click(screen.getByRole("button", { name: "entry-1-expanded" }));
    jest.runOnlyPendingTimers();

    expect(screen.getByRole("button", { name: "entry-1-collapsed" })).toBeTruthy();

    jest.useRealTimers();
  });

  it("retries scroll when onScrollToIndexFailed is triggered", () => {
    jest.useFakeTimers();

    mockLogEntriesData = [
      {
        id: "entry-1",
        recordedAt: "2026-04-10T12:00:00.000Z",
        glucose: 120,
      },
    ];

    renderMobile(<HistoryScreen />);

    fireEvent.click(screen.getByRole("button", { name: "scroll-failed" }));
    jest.runOnlyPendingTimers();

    expect(mockScrollToIndex).toHaveBeenCalledWith({
      index: 0,
      animated: true,
      viewPosition: 0.1,
    });

    jest.useRealTimers();
  });
});
