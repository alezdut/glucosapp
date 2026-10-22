import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import mockReact from "react";
import { act } from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import RegistrarScreen from "../RegistrarScreen";
import { renderMobile } from "../../../test/render-mobile";
import { mobileFixtures } from "../../../test/fixtures";
import * as api from "../../lib/api";
import * as hooks from "../../hooks";

let mockFocusCleanup: (() => void) | undefined;
let mockTriggerFocusEffect: (() => void) | undefined;

const mockTriggerBlur = () => {
  mockFocusCleanup?.();
};

const mockTriggerFocus = () => {
  mockTriggerFocusEffect?.();
};

jest.mock("../../lib/api", () => ({
  createApiClient: jest.fn(),
}));

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (callback: () => void) => {
    mockReact.useEffect(() => {
      mockTriggerFocusEffect = () => {
        const cleanup = callback();
        mockFocusCleanup = typeof cleanup === "function" ? cleanup : undefined;
      };

      mockTriggerFocusEffect();

      return () => {
        mockFocusCleanup?.();
      };
    }, [callback]);
  },
}));

jest.mock("../../components", () => ({
  TextInput: ({
    label,
    value,
    onChangeText,
    placeholder,
  }: {
    label: string;
    value?: string;
    onChangeText?: (value: string) => void;
    placeholder?: string;
  }) => (
    <label>
      <span>{label}</span>
      <input
        aria-label={label}
        placeholder={placeholder}
        value={value ?? ""}
        onChange={(event) => onChangeText?.(event.target.value)}
      />
    </label>
  ),
  CustomDateTimePicker: () => null,
}));

jest.mock("../../components/ScreenHeader", () => ({
  __esModule: true,
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

jest.mock("../../hooks", () => ({
  useRealTimeDoseCalculation: jest.fn(),
  useRealTimeCorrectionCalculation: jest.fn(),
  useDebouncedValidation: jest.fn(),
}));

const mockCreateApiClient = api.createApiClient as jest.MockedFunction<typeof api.createApiClient>;
const mockUseRealTimeDoseCalculation = hooks.useRealTimeDoseCalculation as jest.MockedFunction<
  typeof hooks.useRealTimeDoseCalculation
>;
const mockUseRealTimeCorrectionCalculation =
  hooks.useRealTimeCorrectionCalculation as jest.MockedFunction<
    typeof hooks.useRealTimeCorrectionCalculation
  >;
const mockUseDebouncedValidation = hooks.useDebouncedValidation as jest.MockedFunction<
  typeof hooks.useDebouncedValidation
>;

describe("RegistrarScreen", () => {
  const mockGet = jest.fn();
  const mockPost = jest.fn();
  const navigation = {
    navigate: jest.fn(),
    setParams: jest.fn(),
  };
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    mockPost.mockResolvedValue({ data: {} });
    mockCreateApiClient.mockReturnValue({
      GET: mockGet,
      POST: mockPost,
    } as never);
    mockUseDebouncedValidation.mockReturnValue({
      validation: { isValid: true, message: undefined, severity: "warning" },
      isValidating: false,
    });
    mockUseRealTimeDoseCalculation.mockReturnValue({
      doseResult: mobileFixtures.mealDose,
      error: null,
      isLoading: false,
      isCalculating: false,
      lastCalculationTime: 0,
      hasValidData: true,
      refetch: jest.fn(),
    });
    mockUseRealTimeCorrectionCalculation.mockReturnValue({
      doseResult: mobileFixtures.correctionDose,
      error: null,
      isLoading: false,
      isCalculating: false,
      lastCalculationTime: 0,
      hasValidData: true,
      refetch: jest.fn(),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    consoleErrorSpy.mockRestore();
    mockFocusCleanup = undefined;
    mockTriggerFocusEffect = undefined;
  });

  it("shows a loading state while the patient profile is being fetched", () => {
    mockGet.mockReturnValue(new Promise(() => undefined));

    renderMobile(
      <RegistrarScreen
        navigation={navigation as never}
        route={{ key: "Registrar", name: "Registrar", params: undefined } as never}
      />,
    );

    expect(screen.getByText("Cargando perfil...")).toBeTruthy();
  });

  it("prefills carbohydrates from navigation params and applies the profile target", async () => {
    mockGet.mockResolvedValue({ data: mobileFixtures.userProfile });

    renderMobile(
      <RegistrarScreen
        navigation={navigation as never}
        route={{ key: "Registrar", name: "Registrar", params: { carbohydrates: 42 } } as never}
      />,
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("42")).toBeTruthy();
    });

    expect(navigation.setParams).toHaveBeenCalledWith({ carbohydrates: undefined });
    expect(screen.getByPlaceholderText("110")).toBeTruthy();
  });

  it("switches to fasting mode, hides carbs, and clears a manually edited target", async () => {
    mockGet.mockResolvedValue({ data: mobileFixtures.userProfile });

    renderMobile(
      <RegistrarScreen
        navigation={navigation as never}
        route={{ key: "Registrar", name: "Registrar", params: undefined } as never}
      />,
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Ej: 60")).toBeTruthy();
    });

    fireEvent.change(screen.getByPlaceholderText("110"), {
      target: { value: "95" },
    });
    fireEvent.click(screen.getByRole("button", { name: /ayuno/i }));

    expect(screen.queryByPlaceholderText("Ej: 60")).toBeNull();
    expect(screen.getByText("Corregir glucosa (opcional)")).toBeTruthy();
    expect((screen.getByLabelText("Corregir glucosa (opcional)") as HTMLInputElement).value).toBe(
      "",
    );
  });

  it("navigates to the calculator from the carbs helper button", async () => {
    mockGet.mockResolvedValue({ data: mobileFixtures.userProfile });

    renderMobile(
      <RegistrarScreen
        navigation={navigation as never}
        route={{ key: "Registrar", name: "Registrar", params: undefined } as never}
      />,
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Ej: 60")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /calculator/i }));

    expect(navigation.navigate).toHaveBeenCalledWith("Calculator");
  });

  it("falls back to generic defaults when loading the profile fails", async () => {
    mockGet.mockResolvedValue({ error: { message: "profile failed" } });

    renderMobile(
      <RegistrarScreen
        navigation={navigation as never}
        route={{ key: "Registrar", name: "Registrar", params: undefined } as never}
      />,
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Ej: 100")).toBeTruthy();
    });

    expect(screen.queryByText("Cargando perfil...")).toBeNull();
  });

  it("shows the real-time calculation indicator while a meal dose is being calculated", async () => {
    mockGet.mockResolvedValue({ data: mobileFixtures.userProfile });
    mockUseRealTimeDoseCalculation.mockReturnValue({
      doseResult: null,
      error: null,
      isLoading: false,
      isCalculating: true,
      lastCalculationTime: 0,
      hasValidData: true,
      refetch: jest.fn(),
    });

    renderMobile(
      <RegistrarScreen
        navigation={navigation as never}
        route={{ key: "Registrar", name: "Registrar", params: undefined } as never}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Calculando...")).toBeTruthy();
    });
  });

  it("clears the fasting target and hides calculation context when the user resets it", async () => {
    mockGet.mockResolvedValue({ data: mobileFixtures.userProfile });

    renderMobile(
      <RegistrarScreen
        navigation={navigation as never}
        route={{ key: "Registrar", name: "Registrar", params: undefined } as never}
      />,
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Ej: 60")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /ayuno/i }));
    fireEvent.change(screen.getByLabelText("Corregir glucosa (opcional)"), {
      target: { value: "95" },
    });

    expect(screen.getByText("Contexto Adicional")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Corregir glucosa (opcional)"), {
      target: { value: "" },
    });

    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(screen.queryByText("Contexto Adicional")).toBeNull();
    expect(screen.queryByText("Cálculo de Unidades")).toBeNull();
  });

  it("sends fasting entries without correction as regular records", async () => {
    mockGet.mockResolvedValue({ data: mobileFixtures.userProfile });

    renderMobile(
      <RegistrarScreen
        navigation={navigation as never}
        route={{ key: "Registrar", name: "Registrar", params: undefined } as never}
      />,
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Ej: 60")).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText("Nivel de Glucosa actual"), {
      target: { value: "140" },
    });
    fireEvent.click(screen.getByRole("button", { name: /ayuno/i }));
    fireEvent.click(screen.getByRole("button", { name: /^registrar$/i }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalled();
    });

    expect(mockPost).toHaveBeenCalledWith(
      "/log-entries",
      expect.objectContaining({
        mealType: undefined,
        insulinUnits: 0,
      }),
    );
  });

  it("resets fasting correction values when leaving and re-entering without saving", async () => {
    mockGet.mockResolvedValue({ data: mobileFixtures.userProfile });
    mockUseRealTimeDoseCalculation.mockReturnValue({
      doseResult: null,
      error: null,
      isLoading: false,
      isCalculating: false,
      lastCalculationTime: 0,
      hasValidData: false,
      refetch: jest.fn(),
    });

    renderMobile(
      <RegistrarScreen
        navigation={navigation as never}
        route={{ key: "Registrar", name: "Registrar", params: undefined } as never}
      />,
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Ej: 60")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /ayuno/i }));
    fireEvent.change(screen.getByLabelText("Corregir glucosa (opcional)"), {
      target: { value: "95" },
    });

    expect(screen.getByText("Cálculo de Unidades")).toBeTruthy();
    expect(screen.getByText(/Corrección:/i)).toBeTruthy();

    act(() => {
      mockTriggerBlur();
      mockTriggerFocus();
    });

    expect(screen.getByPlaceholderText("Ej: 60")).toBeTruthy();
    expect(screen.queryByLabelText("Corregir glucosa (opcional)")).toBeNull();
    expect(screen.queryByText(/IOB restado:/i)).toBeNull();
    expect(screen.queryByText(/Corrección:/i)).toBeNull();
  });

  it("shows 0.0 U after returning to registrar without saving a 250 to 100 correction", async () => {
    mockGet.mockResolvedValue({ data: mobileFixtures.userProfile });
    mockUseRealTimeDoseCalculation.mockReturnValue({
      doseResult: null,
      error: null,
      isLoading: false,
      isCalculating: false,
      lastCalculationTime: 0,
      hasValidData: false,
      refetch: jest.fn(),
    });
    mockUseRealTimeCorrectionCalculation.mockReturnValue({
      doseResult: mobileFixtures.correctionDose,
      error: null,
      isLoading: false,
      isCalculating: false,
      lastCalculationTime: 0,
      hasValidData: true,
      refetch: jest.fn(),
    });

    renderMobile(
      <RegistrarScreen
        navigation={navigation as never}
        route={{ key: "Registrar", name: "Registrar", params: undefined } as never}
      />,
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Ej: 60")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /ayuno/i }));
    fireEvent.change(screen.getByLabelText("Nivel de Glucosa actual"), {
      target: { value: "250" },
    });
    fireEvent.change(screen.getByLabelText("Corregir glucosa (opcional)"), {
      target: { value: "100" },
    });

    expect(screen.getByText("Cálculo de Unidades")).toBeTruthy();
    expect(screen.getByText(/Corrección:/i)).toBeTruthy();

    mockUseRealTimeCorrectionCalculation.mockReturnValue({
      doseResult: null,
      error: null,
      isLoading: false,
      isCalculating: false,
      lastCalculationTime: 0,
      hasValidData: false,
      refetch: jest.fn(),
    });

    act(() => {
      mockTriggerBlur();
      mockTriggerFocus();
    });

    expect(screen.getByPlaceholderText("Ej: 60")).toBeTruthy();
    expect(screen.getByText("0.0 U")).toBeTruthy();
  });
});
