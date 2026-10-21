import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
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

jest.mock("../../components/Button", () => ({
  __esModule: true,
  default: ({ title, onPress }: { title: string; onPress: () => void }) => (
    <button type="button" onClick={onPress}>
      {title}
    </button>
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

  it("shows search alert when backend search returns an error object", async () => {
    mockGet.mockResolvedValue({ error: { message: "search failed" } });

    renderMobile(<CalculatorScreen />);

    fireEvent.change(screen.getByPlaceholderText("Buscar alimento..."), {
      target: { value: "fallo" },
    });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith("Error", "No se pudo buscar alimentos");
    });
  });

  it("shows validation alerts for save and calculate when meal has no foods", async () => {
    renderMobile(<CalculatorScreen />);

    fireEvent.change(screen.getByPlaceholderText("Ej: Desayuno completo"), {
      target: { value: "Almuerzo" },
    });

    fireEvent.click(screen.getByRole("button", { name: /guardar plato/i }));
    fireEvent.click(screen.getByRole("button", { name: /guardar y calcular unidades/i }));

    expect(mockAlert).toHaveBeenCalledWith("Error", "Agrega al menos un alimento");
  });

  it("saves and resets the meal, then navigates after confirming success", async () => {
    mockGet.mockResolvedValue({
      data: [{ name: "Yogur", carbohydratesPer100g: 10 }],
    });
    mockPost.mockResolvedValue({ data: { id: "meal-1" } });

    renderMobile(<CalculatorScreen />);

    fireEvent.change(screen.getByPlaceholderText("Buscar alimento..."), {
      target: { value: "yogur" },
    });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(screen.getByText("Yogur")).toBeTruthy();
    });

    fireEvent.click(screen.getByText("Yogur"));
    fireEvent.change(screen.getByPlaceholderText("Ej: Desayuno completo"), {
      target: { value: "Merienda" },
    });

    fireEvent.click(screen.getByRole("button", { name: /guardar plato/i }));

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith(
        "Éxito",
        "Plato guardado exitosamente",
        expect.any(Array),
      );
    });

    const successButtons = mockAlert.mock.calls.find(([title]) => title === "Éxito")?.[2] as
      | Array<{ text: string; onPress?: () => void }>
      | undefined;

    await act(async () => {
      await successButtons?.[0]?.onPress?.();
    });

    expect(mockNavigate).toHaveBeenCalledWith("MainTabs", {
      screen: "Inicio",
      params: { screen: "Home" },
    });
  });

  it("shows validation error when selecting a food with invalid quantity", async () => {
    mockGet.mockResolvedValue({
      data: [{ name: "Arroz", carbohydratesPer100g: 28 }],
    });

    renderMobile(<CalculatorScreen />);

    fireEvent.change(screen.getByDisplayValue("100"), {
      target: { value: "-1" },
    });

    fireEvent.change(screen.getByPlaceholderText("Buscar alimento..."), {
      target: { value: "arroz" },
    });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(screen.getByText("Arroz")).toBeTruthy();
    });

    fireEvent.change(screen.getByDisplayValue("100"), {
      target: { value: "-1" },
    });

    fireEvent.click(screen.getByText("Arroz"));

    expect(mockAlert).toHaveBeenCalledWith("Error", "Ingresa una cantidad válida");
  });

  it("edits and deletes a selected food, resetting edit state", async () => {
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
    fireEvent.click(screen.getByRole("button", { name: "Pan (Marca)" }));

    fireEvent.change(screen.getByDisplayValue("100"), {
      target: { value: "200" },
    });

    expect(screen.getByText("100.00 g carbohidratos")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "eliminar-Pan (Marca)" }));

    expect(screen.queryByRole("button", { name: "Pan (Marca)" })).toBeNull();
    expect(screen.getByDisplayValue("100")).toBeTruthy();
  });

  it("increments and decrements quantity while editing", async () => {
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
    fireEvent.click(screen.getByRole("button", { name: "Avena" }));

    fireEvent.click(screen.getByRole("button", { name: "Plus" }));
    expect(screen.getByDisplayValue("110")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Minus" }));
    expect(screen.getByDisplayValue("100")).toBeTruthy();

    fireEvent.change(screen.getByDisplayValue("100"), {
      target: { value: "10" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Minus" }));
    expect(screen.getByDisplayValue("10")).toBeTruthy();
  });
});
