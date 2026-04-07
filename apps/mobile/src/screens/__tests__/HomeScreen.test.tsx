import React from "react";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import HomeScreen from "../HomeScreen";
import { renderMobile } from "../../../test/render-mobile";
import { mobileFixtures } from "../../../test/fixtures";
import * as api from "../../lib/api";

const mockNavigate = jest.fn();
const mockParentNavigate = jest.fn();

jest.mock("../../lib/api", () => ({
  createApiClient: jest.fn(),
}));

jest.mock("@react-navigation/native", () => ({
  useNavigation: jest.fn(() => ({
    navigate: mockNavigate,
    getParent: () => ({ navigate: mockParentNavigate }),
  })),
}));

const mockCreateApiClient = api.createApiClient as jest.MockedFunction<typeof api.createApiClient>;

describe("HomeScreen", () => {
  const mockGet = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateApiClient.mockReturnValue({
      GET: mockGet,
    } as never);
  });

  it("shows a loading state while statistics are resolving", () => {
    mockGet.mockReturnValue(new Promise(() => undefined));

    renderMobile(<HomeScreen />);

    expect(screen.getByTestId("activity-indicator")).toBeTruthy();
  });

  it("renders an error message if statistics loading fails", async () => {
    mockGet.mockResolvedValue({ error: { status: 500 } });

    renderMobile(<HomeScreen />);

    await waitFor(() => {
      expect(screen.getByText("Error al cargar estadísticas")).toBeTruthy();
    });
  });

  it("renders key metrics and navigates to critical flows", async () => {
    mockGet.mockResolvedValue({ data: mobileFixtures.statistics });

    renderMobile(<HomeScreen />);

    await waitFor(() => {
      expect(screen.getByText("128 mg/dL")).toBeTruthy();
    });

    expect(screen.getByText("21 U")).toBeTruthy();
    expect(screen.getByText("14 comidas")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /calcular carbohidratos/i }));
    fireEvent.click(screen.getByRole("button", { name: /ver historial/i }));
    fireEvent.click(screen.getByRole("button", { name: /escanear sensor por nfc/i }));

    expect(mockNavigate).toHaveBeenCalledWith("Calculator");
    expect(mockParentNavigate).toHaveBeenCalledWith("Historial");
    expect(mockNavigate).toHaveBeenCalledWith("NFCScan");
  });
});
