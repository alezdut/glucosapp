import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";
import * as MediaLibrary from "expo-media-library";
import { analyzeImage, AnalyzeResponse } from "@glucosapp/api-client";
import { theme } from "../theme";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const overlaySize = Math.min(screenWidth * 0.7, screenHeight * 0.4);

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResponse | null>(null);
  const cameraRef = useRef<CameraView>(null);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Necesitamos acceso a la cámara para escanear</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Permitir Cámara</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleTakePicture = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (photo?.uri) {
        await handleAnalyzeImage(photo.uri);
      }
    } catch (error) {
      console.error("Error taking picture:", error);
      Alert.alert("Error", "No se pudo tomar la foto");
    }
  };

  const handleAnalyzeImage = async (imageUri: string) => {
    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      // Resize to standard width
      const targetWidth = 800;
      const resized = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: targetWidth } }],
        { compress: 1, format: ImageManipulator.SaveFormat.JPEG },
      );

      // Calculate center crop coordinates
      const cropSize = 800;
      const originX = resized.width > cropSize ? (resized.width - cropSize) / 2 : 0;
      const originY = resized.height > cropSize ? (resized.height - cropSize) / 2 : 0;

      // Crop from center to square
      const croppedImage = await ImageManipulator.manipulateAsync(
        resized.uri,
        [
          {
            crop: {
              originX,
              originY,
              width: Math.min(cropSize, resized.width),
              height: Math.min(cropSize, resized.height),
            },
          },
        ],
        {
          compress: 0.8,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: false,
        },
      );

      // Save image to device photo library
      if (mediaPermission?.granted) {
        try {
          await MediaLibrary.saveToLibraryAsync(croppedImage.uri);
          console.log("Image saved to photo library");
        } catch (saveError) {
          console.warn("Failed to save image:", saveError);
        }
      } else {
        // Request permission if not granted
        const { status } = await requestMediaPermission();
        if (status === "granted") {
          try {
            await MediaLibrary.saveToLibraryAsync(croppedImage.uri);
            console.log("Image saved to photo library");
          } catch (saveError) {
            console.warn("Failed to save image:", saveError);
          }
        }
      }

      // TODO: Replace with actual image analysis service URL
      // For physical devices, use your computer's LAN IP address instead of localhost
      const baseUrl = "http://192.168.1.37:8000"; // Replace with your actual LAN IP
      const result = await analyzeImage(croppedImage.uri, baseUrl);
      console.log(result);
      setAnalysisResult(result);
    } catch (error) {
      console.error("Analysis error:", error);
      Alert.alert("Error", "No se pudo analizar la imagen");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRetake = () => {
    setAnalysisResult(null);
  };

  if (isAnalyzing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Analizando imagen...</Text>
      </View>
    );
  }

  if (analysisResult) {
    return (
      <View style={styles.resultContainer}>
        <Text style={styles.resultTitle}>Resultado del Análisis</Text>
        <View style={styles.resultCard}>
          <Text style={styles.resultLabel}>Alimento: {analysisResult.label}</Text>
          <Text style={styles.resultConfidence}>
            Confianza: {(analysisResult.confidence * 100).toFixed(1)}%
          </Text>
          {analysisResult.carbs_per_100g && (
            <Text style={styles.resultNutrition}>
              Carbohidratos: {analysisResult.carbs_per_100g}g por 100g
            </Text>
          )}
          {analysisResult.name && (
            <Text style={styles.resultName}>Nombre: {analysisResult.name}</Text>
          )}
          {analysisResult.brand && (
            <Text style={styles.resultBrand}>Marca: {analysisResult.brand}</Text>
          )}
        </View>
        <TouchableOpacity style={styles.button} onPress={handleRetake}>
          <Text style={styles.buttonText}>Escanear Otra Vez</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        ratio="4:3" // fuerza la cámara wide estándar
        zoom={0} // asegura que no haga crop ni seleccione la ultra wide
        autofocus="on" // opcional: para que enfoque automáticamente
      />

      {/* Overlay with translucent background */}
      <View style={styles.overlay}>
        {/* Top section */}
        <View style={styles.overlaySection} />

        {/* Middle section with scan area */}
        <View style={styles.middleSection}>
          <View style={styles.overlaySection} />
          <View style={styles.scanArea}>
            <View style={styles.scanFrame} />
          </View>
          <View style={styles.overlaySection} />
        </View>

        {/* Bottom section */}
        <View style={styles.overlaySection} />
      </View>

      {/* Capture button */}
      <View style={styles.captureContainer}>
        <TouchableOpacity style={styles.captureButton} onPress={handleTakePicture}>
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  overlaySection: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  middleSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  scanArea: {
    width: overlaySize,
    height: overlaySize,
    justifyContent: "center",
    alignItems: "center",
  },
  scanFrame: {
    width: overlaySize * 0.8,
    height: overlaySize * 0.8,
    borderWidth: 2,
    borderColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: "transparent",
  },
  captureContainer: {
    position: "absolute",
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.background,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: theme.colors.primary,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary,
  },
  message: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.text,
    textAlign: "center",
    marginBottom: theme.spacing.lg,
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
  },
  buttonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.md,
    fontWeight: "bold",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.lg,
    color: theme.colors.text,
  },
  resultContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
    justifyContent: "center",
  },
  resultTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: "bold",
    color: theme.colors.text,
    textAlign: "center",
    marginBottom: theme.spacing.lg,
  },
  resultCard: {
    backgroundColor: theme.colors.card,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  resultLabel: {
    fontSize: theme.fontSize.lg,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  resultConfidence: {
    fontSize: theme.fontSize.md,
    color: theme.colors.secondary,
    marginBottom: theme.spacing.sm,
  },
  resultNutrition: {
    fontSize: theme.fontSize.md,
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  resultName: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  resultBrand: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
  },
});
