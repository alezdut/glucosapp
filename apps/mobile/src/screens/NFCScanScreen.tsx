import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { Animated, Easing } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Scan, Activity, Nfc } from "lucide-react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
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
  const [chartReadings, setChartReadings] = useState<Array<{ timestamp: Date; glucose: number }>>(
    [],
  );
  const [hasScanned, setHasScanned] = useState(false);
  const simulationPulse = useRef(new Animated.Value(1)).current;
  const rippleScales = [
    useRef(new Animated.Value(0.6)).current,
    useRef(new Animated.Value(0.6)).current,
    useRef(new Animated.Value(0.6)).current,
  ];
  const rippleOpacities = [
    useRef(new Animated.Value(0.2)).current,
    useRef(new Animated.Value(0.2)).current,
    useRef(new Animated.Value(0.2)).current,
  ];

  // Start/stop pulsing + ripple animations while scanning (real o simulado)
  useEffect(() => {
    if (isScanning) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(simulationPulse, {
            toValue: 1.15,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(simulationPulse, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      // AirDrop-like staggered ripples
      const startRipple = (scale: Animated.Value, opacity: Animated.Value, delay: number) => {
        const animate = () => {
          scale.setValue(0.5);
          opacity.setValue(0.2);
          const duration = 2200;
          Animated.parallel([
            Animated.timing(scale, {
              toValue: 4.5,
              duration,
              easing: Easing.out(Easing.cubic),
              delay,
              useNativeDriver: true,
            }),
            Animated.sequence([
              // Start: low opacity when small
              Animated.timing(opacity, {
                toValue: 0.2,
                duration: 0,
                delay,
                useNativeDriver: true,
              }),
              // Rise to medium opacity in first third
              Animated.timing(opacity, {
                toValue: 0.6,
                duration: duration / 3,
                easing: Easing.in(Easing.ease),
                useNativeDriver: true,
              }),
              // Hold medium opacity in middle third
              Animated.timing(opacity, {
                toValue: 0.6,
                duration: duration / 3,
                useNativeDriver: true,
              }),
              // Fade out in last third
              Animated.timing(opacity, {
                toValue: 0.0,
                duration: duration / 3,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
              }),
              // Reset for next loop
              Animated.timing(opacity, {
                toValue: 0.2,
                duration: 0,
                useNativeDriver: true,
              }),
            ]),
          ]).start(() => animate());
        };
        animate();
      };
      startRipple(rippleScales[0], rippleOpacities[0], 0);
      startRipple(rippleScales[1], rippleOpacities[1], 600);
      startRipple(rippleScales[2], rippleOpacities[2], 1200);
      return () => {
        loop.stop();
        simulationPulse.setValue(1);
        rippleScales.forEach((s) => s.stopAnimation());
        rippleOpacities.forEach((o) => o.stopAnimation());
      };
    }
  }, [isScanning, simulationPulse]);

  /**
   * Build a uniform 5-min cadence time series across the last 8 hours.
   * Uses last known glucose (carry-forward) after the first known point.
   * The last point always uses endDate (now) to ensure correct positioning.
   */
  const getUniformSeries = (
    source: Array<{ timestamp: Date; glucose: number }>,
    startDate: Date,
    endDate: Date,
  ): Array<{ timestamp: Date; glucose: number }> => {
    if (!source || source.length === 0) {
      return [];
    }

    const sorted = [...source].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const result: Array<{ timestamp: Date; glucose: number }> = [];

    let cursorIdx = 0;
    let lastKnown: number | null = null;
    const endTimestamp = endDate.getTime();
    const startTimestamp = startDate.getTime();

    // Find the most recent glucose value (from the last reading in source)
    const lastSourceReading = sorted[sorted.length - 1];
    const mostRecentGlucose = lastSourceReading ? lastSourceReading.glucose : null;

    // Generate uniform series: points every 5 minutes from startDate up to (but not including) endDate
    // The last point will be exactly at endDate
    const fiveMinInMs = 5 * 60 * 1000;
    let currentTime = startTimestamp;

    // Round currentTime down to nearest 5-minute slot
    currentTime = Math.floor(currentTime / fiveMinInMs) * fiveMinInMs;

    while (currentTime < endTimestamp - fiveMinInMs) {
      // Advance cursor to find the most recent reading up to currentTime
      while (cursorIdx < sorted.length && sorted[cursorIdx].timestamp.getTime() <= currentTime) {
        lastKnown = sorted[cursorIdx].glucose;
        cursorIdx++;
      }

      if (lastKnown !== null) {
        result.push({ timestamp: new Date(currentTime), glucose: lastKnown });
      }

      currentTime += fiveMinInMs;
    }

    // ALWAYS add the final point at endDate (now) with the most recent glucose value
    // This ensures the chart shows the current reading at the rightmost position
    if (mostRecentGlucose !== null) {
      result.push({
        timestamp: endDate, // Always use endDate (now) for the last point
        glucose: mostRecentGlucose,
      });
    } else if (lastKnown !== null) {
      // Fallback: use last known value if no recent reading
      result.push({
        timestamp: endDate,
        glucose: lastKnown,
      });
    }

    return result;
  };

  /**
   * Check if NFC is available on mount
   */
  useEffect(() => {
    checkNfcAvailability();
    fetchUserProfile();
    fetchLatestReadings();
  }, []);

  // Refrescar lecturas desde DB al enfocar la pantalla
  useFocusEffect(
    React.useCallback(() => {
      fetchLatestReadings();
    }, []),
  );

  // Auto-scan al entrar: simulado si NFC no disponible, real si disponible
  useEffect(() => {
    if (!hasScanned && !isScanning) {
      if (!NfcManager || isNfcAvailable === false) {
        const id = setTimeout(() => {
          handleScanSensor();
        }, 100);
        return () => clearTimeout(id);
      }
      if (isNfcAvailable) {
        const id = setTimeout(() => {
          handleScanSensor();
        }, 100);
        return () => clearTimeout(id);
      }
    }
  }, [isNfcAvailable, hasScanned, isScanning]);

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

  /**
   * Fetch latest readings from backend to always show up-to-date chart
   */
  const fetchLatestReadings = async () => {
    try {
      const client = createApiClient();
      // Últimas 8 horas
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 8 * 60 * 60 * 1000);
      const eightHoursAgo = startDate.getTime();

      const response = await client.GET("/sensor-readings/export", {
        params: {
          query: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          },
        },
      });

      if (response.error || !response.data) {
        return;
      }

      const items = (response.data as any[])
        .filter((it) => typeof it?.glucose === "number" && it?.recordedAt)
        .map((it) => ({
          glucose: it.glucose as number,
          timestamp: new Date(it.recordedAt as string),
        }))
        // Seguridad adicional: limitar estrictamente a 8 horas por si el backend devuelve más
        .filter((it) => it.timestamp.getTime() >= eightHoursAgo)
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      setChartReadings(items);
    } catch (error) {
      console.log("Error fetching latest readings", error);
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
    if (isScanning) return;
    setIsScanning(true);
    setSensorData(null);

    // Si NFC no está disponible (Expo Go), usar datos mock con animación y delay de 3s
    if (!isNfcAvailable || !NfcManager) {
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const mockData = generateMockLibreData();
      setSensorData(mockData);
      setHasScanned(true);
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
      setHasScanned(true);

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
              setHasScanned(true);
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
      // Refrescar el gráfico con datos de la base
      // Pequeño delay para asegurar que la DB haya actualizado
      setTimeout(() => {
        fetchLatestReadings();
      }, 500);
    } catch (error) {
      console.error("Error saving readings:", error);
      // Silently fail - don't interrupt the user experience
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Global top ripples (AirDrop-style) */}
      {isScanning && (
        <View style={styles.globalRippleOverlay} pointerEvents="none">
          {rippleScales.map((scale, i) => (
            <Animated.View
              key={i}
              style={[
                styles.rippleCircle,
                {
                  transform: [{ scale }],
                  opacity: rippleOpacities[i],
                },
              ]}
            />
          ))}
        </View>
      )}
      <View style={styles.contentWrapper}>
        <ScreenHeader title="Escanear Sensor" onBack={() => navigation.goBack()} />

        {/* Scan Button - SIEMPRE ARRIBA */}
        {!sensorData && (
          <View
            style={[
              styles.scanSection,
              {
                marginTop: theme.spacing.sm,
                marginBottom: theme.spacing.lg,
                flex: undefined,
                justifyContent: "flex-start",
              },
            ]}
          >
            {/* Center NFC icon for focus indication */}
            <Animated.View
              style={{
                transform: [{ scale: isScanning ? simulationPulse : (1 as unknown as number) }],
                marginBottom: theme.spacing.xl,
              }}
            >
              <Nfc size={64} color={theme.colors.primary} strokeWidth={2} />
            </Animated.View>
            <Text style={styles.scanInstructions}>
              {isScanning
                ? isNfcAvailable
                  ? "Acerca el sensor a la parte superior del teléfono..."
                  : "Simulando escaneo NFC..."
                : isNfcAvailable
                  ? "Preparado para escanear automáticamente. Acerca tu sensor"
                  : "Modo simulación: empezará automáticamente"}
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

        {/* Glucose Chart (preferir lecturas desde DB) */}
        {hasScanned &&
          (chartReadings.length > 0 ||
            (sensorData && sensorData.historicalReadings.length > 0)) && (
            <View style={styles.chartSection}>
              {(() => {
                const now = new Date();
                const start = new Date(now.getTime() - 8 * 60 * 60 * 1000);

                // Construir fuente de datos: preferir DB, sino usar sensorData
                let source: Array<{ timestamp: Date; glucose: number }> = [];

                if (chartReadings.length > 0) {
                  source = [...chartReadings];
                } else if (sensorData) {
                  source = [
                    ...sensorData.historicalReadings.filter(
                      (r) => r.timestamp.getTime() >= start.getTime(),
                    ),
                  ];
                }

                // SIEMPRE incluir/reemplazar con la lectura actual si está disponible
                // Esta debe tener prioridad sobre cualquier lectura de la DB
                if (sensorData && sensorData.currentGlucose !== undefined) {
                  // Remover cualquier lectura muy reciente (dentro de los últimos 5 minutos) para evitar conflictos
                  // Esto asegura que la lectura actual siempre sea la única lectura reciente
                  const fiveMinutesAgo = now.getTime() - 5 * 60 * 1000;
                  source = source.filter((r) => r.timestamp.getTime() < fiveMinutesAgo);

                  // Agregar la lectura actual con timestamp exacto (tiempo actual)
                  // Este será siempre el último punto del gráfico
                  source.push({
                    timestamp: new Date(now.getTime()), // Asegurar timestamp exacto
                    glucose: sensorData.currentGlucose,
                  });

                  // Re-ordenar por timestamp
                  source.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
                }

                const uniform = getUniformSeries(source, start, now);

                return (
                  <GlucoseChart
                    data={uniform}
                    targetRange={targetRange || undefined}
                    title="Historial (últimas 8 horas)"
                    showTargetRangeSubtitle
                    height={theme.chartDimensions.compactHeight}
                    inline
                  />
                );
              })()}
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
    position: "relative",
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
  waveOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 260,
    overflow: "hidden",
    zIndex: 10,
  },
  globalWaveOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 260,
    overflow: "hidden",
    zIndex: 30,
  },
  globalRippleOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 260,
    alignItems: "center",
    justifyContent: "flex-start",
    zIndex: 30,
  },
  rippleCircle: {
    position: "absolute",
    top: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 3,
    borderColor: theme.colors.primary + "80",
    backgroundColor: "transparent",
  },
  waveLine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 20,
    backgroundColor: theme.colors.primary + "99",
    shadowColor: theme.colors.secondary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
    borderBottomLeftRadius: 999,
    borderBottomRightRadius: 999,
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
