import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import mockReact from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { Alert } from "react-native";
import ScanScreen from "../ScanScreen";
import { renderMobile } from "../../../test/render-mobile";
import { analyzeImage } from "@glucosapp/api-client";
import * as ImageManipulator from "expo-image-manipulator";
import * as MediaLibrary from "expo-media-library";

const mockTakePictureAsync = jest.fn();
const mockRequestCameraPermission = jest.fn();
const mockRequestMediaPermission = jest.fn();

let mockCameraPermission: { granted: boolean } | null = { granted: true };
let mockMediaPermission: { granted: boolean } | null = { granted: true };

jest.mock("expo-camera", () => ({
  CameraView: mockReact.forwardRef(function CameraViewMock(_props, ref) {
    mockReact.useImperativeHandle(
      ref,
      () => ({
        takePictureAsync: mockTakePictureAsync,
      }),
      [],
    );
    return mockReact.createElement("div", { "data-testid": "camera-view" });
  }),
  useCameraPermissions: jest.fn(() => [mockCameraPermission, mockRequestCameraPermission]),
}));

jest.mock("expo-image-manipulator", () => ({
  SaveFormat: { JPEG: "jpeg" },
  manipulateAsync: jest.fn(),
}));

jest.mock("expo-media-library", () => ({
  usePermissions: jest.fn(() => [mockMediaPermission, mockRequestMediaPermission]),
  saveToLibraryAsync: jest.fn(),
}));

jest.mock("@glucosapp/api-client", () => ({
  analyzeImage: jest.fn(),
}));

const mockAnalyzeImage = analyzeImage as jest.MockedFunction<typeof analyzeImage>;
const mockManipulateAsync = ImageManipulator.manipulateAsync as jest.MockedFunction<
  typeof ImageManipulator.manipulateAsync
>;
const mockSaveToLibraryAsync = MediaLibrary.saveToLibraryAsync as jest.MockedFunction<
  typeof MediaLibrary.saveToLibraryAsync
>;

describe("ScanScreen", () => {
  const alertSpy = jest.spyOn(Alert, "alert");

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy.mockImplementation(jest.fn());
    mockCameraPermission = { granted: true };
    mockMediaPermission = { granted: true };

    mockTakePictureAsync.mockResolvedValue({
      uri: "file:///raw.jpg",
    });

    mockRequestMediaPermission.mockResolvedValue({ status: "denied" });

    mockManipulateAsync
      .mockResolvedValueOnce({ uri: "file:///resized.jpg", width: 1200, height: 1000 } as never)
      .mockResolvedValueOnce({ uri: "file:///cropped.jpg", width: 800, height: 800 } as never);

    mockAnalyzeImage.mockResolvedValue({
      label: "Manzana",
      confidence: 0.91,
      carbs_per_100g: 14,
      name: "Apple",
      brand: "Genérica",
    } as never);
  });

  it("requests camera access when permission is denied", () => {
    mockCameraPermission = { granted: false };

    renderMobile(<ScanScreen />);

    expect(screen.getByText("Necesitamos acceso a la cámara para escanear")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Permitir Cámara" }));

    expect(mockRequestCameraPermission).toHaveBeenCalled();
  });

  it("renders an empty container when camera permission state is not ready", () => {
    mockCameraPermission = null;

    renderMobile(<ScanScreen />);

    expect(screen.queryByTestId("camera-view")).toBeNull();
    expect(screen.queryByText("Necesitamos acceso a la cámara para escanear")).toBeNull();
  });

  it("captures, analyzes, and shows the analysis result", async () => {
    renderMobile(<ScanScreen />);

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(mockTakePictureAsync).toHaveBeenCalledWith({ quality: 0.8, base64: false });
      expect(mockAnalyzeImage).toHaveBeenCalledWith(
        "file:///cropped.jpg",
        "http://192.168.1.37:8000",
      );
    });

    expect(mockSaveToLibraryAsync).toHaveBeenCalledWith("file:///cropped.jpg");
    expect(screen.getByText("Resultado del Análisis")).toBeTruthy();
    expect(screen.getByText("Alimento: Manzana")).toBeTruthy();
    expect(screen.getByText("Confianza: 91.0%")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Escanear Otra Vez" }));
    expect(screen.queryByText("Resultado del Análisis")).toBeNull();
  });

  it("does not analyze when camera returns no URI", async () => {
    mockTakePictureAsync.mockResolvedValue({ uri: undefined });

    renderMobile(<ScanScreen />);

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(mockTakePictureAsync).toHaveBeenCalled();
    });

    expect(mockManipulateAsync).not.toHaveBeenCalled();
    expect(mockAnalyzeImage).not.toHaveBeenCalled();
  });

  it("requests media permission on demand and saves photo when permission is granted", async () => {
    mockMediaPermission = { granted: false };
    mockRequestMediaPermission.mockResolvedValue({ status: "granted" });

    renderMobile(<ScanScreen />);

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(mockRequestMediaPermission).toHaveBeenCalled();
      expect(mockSaveToLibraryAsync).toHaveBeenCalledWith("file:///cropped.jpg");
      expect(mockAnalyzeImage).toHaveBeenCalled();
    });
  });

  it("shows an alert when image analysis fails", async () => {
    mockAnalyzeImage.mockRejectedValue(new Error("analysis failed"));

    renderMobile(<ScanScreen />);

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Error", "No se pudo analizar la imagen");
    });
  });

  it("shows an error alert when taking a picture fails", async () => {
    mockTakePictureAsync.mockRejectedValue(new Error("camera failed"));

    renderMobile(<ScanScreen />);

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Error", "No se pudo tomar la foto");
    });
  });
});
