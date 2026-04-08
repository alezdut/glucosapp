import React from "react";
import { act } from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { Alert } from "react-native";
import CalculatorScreen from "../CalculatorScreen";
import { renderMobile } from "../../../test/render-mobile";
import * as api from "../../lib/api";
import { useDebouncedSearch } from "../../hooks";

jest.useFakeTimers();

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock("../../lib/api", () => ({
  createApiClient: jest.fn(),
}));

jest.mock("../../hooks", () => ({
  useDebouncedSearch: jest.fn(),
}));

jest.mock("@react-navigation/native", () => ({
  useNavigation: jest.fn(() => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  })),
}));

jest.mock("../../components/ScreenHeader", () => ({
  __esModule: true,
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

jest.mock("../../components/FoodListItem", () => ({
  __esModule: true,
  default: ({
    item,
    onDelete,
    onPress,
  }: {
    item: { name: string; carbohydrates: number };
    onDelete: () => void;
    onPress?: () => void;
  }) => (
    <div>
      <button type="button" onClick={onPress}>
        {item.name}
      </button>
      <span>{item.carbohydrates.toFixed(2)} g carbohidratos</span>
      <button type="button" onClick={onDelete}>
        eliminar-{item.name}
      </button>
    </div>
  ),
}));

const mockCreateApiClient = api.createApiClient as jest.MockedFunction<typeof api.createApiClient>;
const mockUseDebouncedSearch = useDebouncedSearch as jest.MockedFunction<typeof useDebouncedSearch>;
const mockAlert = Alert.alert as jest.MockedFunction<typeof Alert.alert>;

describe("CalculatorScreen", () => {
  const mockGet = jest.fn();
  const mockPost = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateApiClient.mockReturnValue({
      GET: mockGet,
      POST: mockPost,
    } as never);
    mockUseDebouncedSearch.mockImplementation((searchFunction) => {
      const [searchQuery, setSearchQuery] = React.useState("");
      const [searchResults, setSearchResults] = React.useState<unknown[] | null>(null);
      const [isSearching, setIsSearching] = React.useState(false);

      React.useEffect(() => {
        if (!searchQuery.trim()) {
          setSearchResults(null);
          setIsSearching(false);
          return;
        }

        setIsSearching(true);
        const timeout = setTimeout(async () => {
          const results = await searchFunction(searchQuery);
          setSearchResults(results);
          setIsSearching(false);
        }, 500);

        return () => clearTimeout(timeout);
      }, [searchFunction, searchQuery]);

      return {
        searchQuery,
        setSearchQuery,
        searchResults,
        isSearching,
        searchNow: async () => {
          setIsSearching(true);
          const results = await searchFunction(searchQuery);
          setSearchResults(results);
          setIsSearching(false);
        },
        clearSearch: () => {
          setSearchQuery("");
          setSearchResults(null);
          setIsSearching(false);
        },
      };
    });
  });

  it("adds a searched food and recalculates carbohydrates when quantity changes", async () => {
    mockGet.mockResolvedValue({
      data: [{ name: "Pan", brand: "Marca", carbohydratesPer100g: 50 }],
    });

    renderMobile(<CalculatorScreen />);

    fireEvent.change(screen.getByPlaceholderText("Buscar alimento..."), {
      target: { value: "pan" },
    });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(screen.getByText("Pan")).toBeTruthy();
    });

    fireEvent.click(screen.getByText("Pan"));

    await waitFor(() => {
      expect(screen.getByText("50.00 g carbohidratos")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Pan (Marca)" }));
    fireEvent.change(screen.getByDisplayValue("100"), {
      target: { value: "150" },
    });

    expect(screen.getByText("75.00 g")).toBeTruthy();
  });

  it("shows an error alert when saving a meal template fails", async () => {
    mockGet.mockResolvedValue({
      data: [{ name: "Banana", carbohydratesPer100g: 20 }],
    });
    mockPost.mockRejectedValue(new Error("save failed"));

    renderMobile(<CalculatorScreen />);

    fireEvent.change(screen.getByPlaceholderText("Buscar alimento..."), {
      target: { value: "banana" },
    });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(screen.getByText("Banana")).toBeTruthy();
    });

    fireEvent.click(screen.getByText("Banana"));
    fireEvent.change(screen.getByPlaceholderText("Ej: Desayuno completo"), {
      target: { value: "Desayuno" },
    });
    fireEvent.click(screen.getByRole("button", { name: /guardar plato/i }));

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith("Error", "No se pudo guardar el plato");
    });
  });

  it("navigates to Registrar with prefilled carbs when calculating a built meal", async () => {
    mockGet.mockResolvedValue({
      data: [{ name: "Avena", carbohydratesPer100g: 60 }],
    });

    renderMobile(<CalculatorScreen />);

    fireEvent.change(screen.getByPlaceholderText("Buscar alimento..."), {
      target: { value: "avena" },
    });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(screen.getByText("Avena")).toBeTruthy();
    });

    fireEvent.click(screen.getByText("Avena"));
    fireEvent.click(screen.getByRole("button", { name: /calcular unidades/i }));

    expect(mockNavigate).toHaveBeenCalledWith("MainTabs", {
      screen: "Registrar",
      params: { carbohydrates: 60 },
    });
  });
});
