import mockReact from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import RegistrarScreen from "../RegistrarScreen";
import { renderMobile } from "../../../test/render-mobile";
import { mobileFixtures } from "../../../test/fixtures";
import * as api from "../../lib/api";
import * as hooks from "../../hooks";

jest.mock("../../lib/api", () => ({
  createApiClient: jest.fn(),
}));

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (callback: () => void) => {
    mockReact.useEffect(() => {
      callback();
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
  const navigation = {
    navigate: jest.fn(),
    setParams: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateApiClient.mockReturnValue({
      GET: mockGet,
      POST: jest.fn().mockResolvedValue({ data: {} }),
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
});
