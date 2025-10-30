import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Scan, Activity, Nfc } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { theme } from "../theme";
import {
  parseLibreNfcData,
  generateMockLibreData,
  type LibreSensorData,
} from "../utils/libreNfcParser";
import { createApiClient } from "../lib/api";
import { ScreenHeader, GlucoseChart } from "../components";

// Importación condicional de NFC Manager
// En Expo Go esto no estará disponible, por lo que usaremos mocks
let NfcManager: any = null;
let NfcTech: any = null;

try {
  const nfcModule = require("react-native-nfc-manager");
  NfcManager = nfcModule.default || nfcModule;
  NfcTech = nfcModule.NfcTech;
} catch (error) {
  // NFC no disponible (Expo Go)
  console.log("NFC Manager not available - will use mock data");
}

/**
 * NFCScanScreen - Scan FreeStyle Libre sensor and display glucose data
 */
const NFCScanScreen = () => {
  const navigation = useNavigation();
  const [isScanning, setIsScanning] = useState(false);
  const [sensorData, setSensorData] = useState<LibreSensorData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isNfcAvailable, setIsNfcAvailable] = useState(false);
  const [targetRange, setTargetRange] = useState<{ min: number; max: number } | null>(null);

  /**
   * Check if NFC is available on mount
   */
  useEffect(() => {
    checkNfcAvailability();
    fetchUserProfile();
  }, []);

  /**
   * Fetch user profile to get target glucose range
   */
  const fetchUserProfile = async () => {
    try {
      const client = createApiClient();
      const response = await client.GET("/profile", {});

      if (response.data && !response.error) {
        const profile = response.data as any;
        console.log("Profile data received:", {
          minTargetGlucose: profile.minTargetGlucose,
          maxTargetGlucose: profile.maxTargetGlucose,
        });

        setTargetRange({
          min: profile.minTargetGlucose || 70,
          max: profile.maxTargetGlucose || 180,
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      // Use default range if fetch fails
      setTargetRange({ min: 70, max: 180 });
    }
  };

  const checkNfcAvailability = async () => {
    if (!NfcManager) {
      setIsNfcAvailable(false);
      return;
    }

    try {
      const supported = await NfcManager.isSupported();
      setIsNfcAvailable(supported);
    } catch (error) {
      setIsNfcAvailable(false);
    }
  };

  /**
   * Initialize NFC manager
   */
  const initializeNfc = async (): Promise<boolean> => {
    try {
      const isSupported = await NfcManager.isSupported();
      if (!isSupported) {
        Alert.alert("NFC no disponible", "Tu dispositivo no soporta NFC");
        return false;
      }
      await NfcManager.start();
      return true;
    } catch (error) {
      console.error("Error initializing NFC:", error);
      Alert.alert("Error", "No se pudo inicializar NFC");
      return false;
    }
  };

  /**
   * Read FreeStyle Libre sensor via NFC (or use mock data)
   */
  const handleScanSensor = async () => {
    setIsScanning(true);
    setSensorData(null);

    // Si NFC no está disponible (Expo Go), usar datos mock directamente
    if (!isNfcAvailable || !NfcManager) {
      // Simulamos un pequeño delay para que se vea realista
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const mockData = generateMockLibreData();
      setSensorData(mockData);
      setIsScanning(false);

      // Guardar automáticamente los datos mock
      await saveNewReadings(mockData);

      Alert.alert(
        "Modo Simulación",
        `Usando datos de prueba.\nGlucosa actual: ${mockData.currentGlucose} mg/dL\n\n` +
          "Para usar NFC real, instala un development build con:\n" +
          "npx expo run:ios --device",
        [{ text: "Entendido" }],
      );
      return;
    }

    // Intentar escaneo NFC real
    try {
      const nfcAvailable = await initializeNfc();
      if (!nfcAvailable) {
        setIsScanning(false);
        return;
      }

      // Request NFC technology (ISO15693 for FreeStyle Libre)
      await NfcManager.requestTechnology(NfcTech.Iso15693);

      // Read NFC tag
      const tag: any = await NfcManager.getTag();

      if (!tag) {
        throw new Error("No se detectó ningún sensor");
      }

      // Read multiple blocks from sensor memory
      // FreeStyle Libre 1 requires reading blocks 0-43 (344 bytes total)
      const blocks: number[] = [];

      // Read blocks 0-43
      for (let blockNumber = 0; blockNumber < 43; blockNumber++) {
        try {
          const blockData = await NfcManager.iso15693HandlerAndroid.readSingleBlock({
            flags: 0x02, // High data rate
            blockNumber,
          });

          if (blockData) {
            blocks.push(...blockData);
          }
        } catch (blockError) {
          console.warn(`Failed to read block ${blockNumber}:`, blockError);
        }
      }

      if (blocks.length < 344) {
        throw new Error("Datos incompletos del sensor");
      }

      // Parse sensor data
      const parsedData = parseLibreNfcData(blocks);
      setSensorData(parsedData);

      // Guardar automáticamente
      await saveNewReadings(parsedData);

      Alert.alert("Escaneo exitoso", `Glucosa actual: ${parsedData.currentGlucose} mg/dL`);
    } catch (error) {
      console.error("Error scanning sensor:", error);

      // Ofrecer datos mock si falla el escaneo
      Alert.alert(
        "Error al escanear",
        "No se pudo leer el sensor.\n¿Deseas usar datos simulados para probar la funcionalidad?",
        [
          {
            text: "Cancelar",
            style: "cancel",
          },
          {
            text: "Usar datos simulados",
            onPress: async () => {
              const mockData = generateMockLibreData();
              setSensorData(mockData);
              // Guardar automáticamente
              await saveNewReadings(mockData);
            },
          },
        ],
      );
    } finally {
      setIsScanning(false);
      // Cleanup NFC
      try {
        if (NfcManager) {
          await NfcManager.cancelTechnologyRequest();
        }
      } catch (cleanupError) {
        console.warn("Error cleaning up NFC:", cleanupError);
      }
    }
  };

  /**
   * Save new readings to backend (automatically called after scan)
   * Only saves readings that are newer than the last saved reading
   */
  const saveNewReadings = async (data: LibreSensorData) => {
    setIsSaving(true);

    try {
      const client = createApiClient();

      // Get the latest saved reading
      const latestResponse = await client.GET("/sensor-readings/latest", {});

      let lastSavedTimestamp: Date | null = null;
      if (latestResponse.data && !latestResponse.error) {
        const latest = latestResponse.data as any;
        if (latest?.recordedAt) {
          lastSavedTimestamp = new Date(latest.recordedAt);
          console.log("Last saved reading:", lastSavedTimestamp.toISOString());
        }
      }

      // Filter readings to only include new ones (after last saved timestamp)
      const allReadings = [
        // Current reading
        {
          glucose: data.currentGlucose,
          timestamp: new Date(),
          isHistorical: false,
        },
        // Historical readings
        ...data.historicalReadings.map((reading) => ({
          glucose: reading.glucose,
          timestamp: reading.timestamp,
          isHistorical: true,
        })),
      ];

      // Filter to only new readings
      const newReadings = lastSavedTimestamp
        ? allReadings.filter((reading) => reading.timestamp > lastSavedTimestamp)
        : allReadings;

      if (newReadings.length === 0) {
        console.log("No new readings to save");
        return; // Silently skip if no new readings
      }

      // Prepare for API
      const readingsToSave = newReadings.map((reading) => ({
        glucose: reading.glucose,
        recordedAt: reading.timestamp.toISOString(),
        source: "LIBRE_NFC" as const,
        isHistorical: reading.isHistorical,
      }));

      console.log(`Saving ${readingsToSave.length} new readings...`);

      // Send to backend (backend will encrypt the glucose values)
      const response = await client.POST("/sensor-readings/batch", {
        readings: readingsToSave,
      });

      if (response.error) {
        throw new Error("Error al guardar lecturas");
      }

      const result = response.data as any;
      const savedCount = result?.created || readingsToSave.length;

      console.log(`Successfully saved ${savedCount} readings`);
    } catch (error) {
      console.error("Error saving readings:", error);
      // Silently fail - don't interrupt the user experience
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.contentWrapper}>
        <ScreenHeader title="Escanear Sensor" onBack={() => navigation.goBack()} />

        {/* Scan Button - SIEMPRE ARRIBA */}
        {!sensorData && (
          <View
            style={[
              styles.scanSection,
              {
                marginTop: theme.spacing.xl,
                marginBottom: theme.spacing.lg,
                flex: undefined,
                justifyContent: "flex-start",
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.scanButton, isScanning && styles.scanButtonActive]}
              onPress={handleScanSensor}
              disabled={isScanning}
              accessibilityRole="button"
              accessibilityLabel="Escanear sensor por NFC"
              activeOpacity={0.85}
            >
              {isScanning ? (
                <ActivityIndicator size="large" color={theme.colors.background} />
              ) : (
                <Nfc size={48} color={theme.colors.background} strokeWidth={2} />
              )}
            </TouchableOpacity>
            <Text style={styles.scanInstructions}>
              {isScanning
                ? isNfcAvailable
                  ? "Acerca el sensor a la parte superior del teléfono..."
                  : "Generando datos de prueba..."
                : isNfcAvailable
                  ? "Toca el botón y acerca tu sensor FreeStyle Libre"
                  : "Modo simulación: Toca para generar datos de prueba"}
            </Text>
          </View>
        )}

        {/* Current Glucose Display */}
        {sensorData && (
          <>
            <View style={styles.currentGlucoseSection}>
              <Activity size={28} color={theme.colors.primary} />
              <Text style={styles.currentGlucoseValue}>{sensorData.currentGlucose}</Text>
              <Text style={styles.currentGlucoseUnit}>mg/dL</Text>
              <Text style={styles.currentGlucoseLabel}>Glucosa Actual</Text>
            </View>

            {/* Divider */}
            <View style={styles.divider} />
          </>
        )}

        {/* Glucose Chart */}
        {sensorData && sensorData.historicalReadings.length > 0 && (
          <View style={styles.chartSection}>
            <GlucoseChart
              data={sensorData.historicalReadings}
              targetRange={targetRange || undefined}
              title="Historial (últimas 8 horas)"
              showTargetRangeSubtitle
              height={theme.chartDimensions.compactHeight}
              inline
            />
          </View>
        )}

        {/* Auto-save indicator */}
        {isSaving && (
          <View style={styles.savingIndicator}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.savingText}>Guardando...</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentWrapper: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  scanSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scanButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.md,
    shadowColor: theme.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  scanButtonActive: {
    backgroundColor: theme.colors.primary + "CC",
  },
  scanInstructions: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: "center",
    maxWidth: 280,
  },
  currentGlucoseSection: {
    alignItems: "center",
    paddingVertical: theme.spacing.xl,
  },
  currentGlucoseValue: {
    fontSize: 56,
    fontWeight: "bold",
    color: theme.colors.primary,
    marginTop: theme.spacing.xs,
  },
  currentGlucoseUnit: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  currentGlucoseLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.lg,
    opacity: 0.5,
  },
  chartSection: {
    flex: 1,
    alignSelf: "stretch",
  },
  savingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  savingText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontStyle: "italic",
  },
});

export default NFCScanScreen;
