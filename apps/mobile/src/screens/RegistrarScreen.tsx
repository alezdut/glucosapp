import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput as RNTextInput,
} from "react-native";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { theme } from "../theme";
import { createApiClient } from "../lib/api";
import type { RegistrarScreenProps } from "../navigation/types";
import {
  InsulinType,
  type UserProfile,
  calculateInsulinDose,
  evaluateGlucoseAlert,
  DEFAULT_CARB_RATIO,
  DEFAULT_INSULIN_SENSITIVITY_FACTOR,
  DEFAULT_MIN_TARGET_GLUCOSE,
  DEFAULT_MAX_TARGET_GLUCOSE,
  CARB_GLUCOSE_IMPACT,
} from "@glucosapp/types";
import TextInput from "../components/TextInput";
import Button from "../components/Button";
import ScreenHeader from "../components/ScreenHeader";

/**
 * RegistrarScreen component - Register glucose, insulin, and meal entry
 */
export default function RegistrarScreen({ navigation, route }: RegistrarScreenProps) {
  const queryClient = useQueryClient();
  const prefilledCarbs = route?.params?.carbohydrates;
  const prefilledMealName = route?.params?.mealName;

  // Fetch user profile to get insulin parameters
  const { data: userProfile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ["profile"],
    queryFn: async () => {
      const client = createApiClient();
      const response = await client.GET("/profile", {});
      if (response.error) {
        throw new Error("Failed to fetch profile");
      }
      return response.data as UserProfile;
    },
  });

  const [glucoseLevel, setGlucoseLevel] = useState<number | undefined>(undefined);
  const [carbohydrates, setCarbohydrates] = useState<number | undefined>(prefilledCarbs);
  const [targetGlucose, setTargetGlucose] = useState<number | undefined>(undefined);
  const [insulinType, setInsulinType] = useState<InsulinType>(InsulinType.BOLUS);
  const [appliedInsulin, setAppliedInsulin] = useState<number | undefined>(undefined);
  const [wasManuallyEdited, setWasManuallyEdited] = useState(false);
  const [isEditingInsulin, setIsEditingInsulin] = useState(false);
  const insulinInputRef = useRef<RNTextInput>(null);

  // Set default target glucose from user profile when profile loads
  useEffect(() => {
    if (insulinType === InsulinType.BASAL) {
      setTargetGlucose(undefined);
    } else if (insulinType === InsulinType.BOLUS && userProfile?.targetGlucose && !targetGlucose) {
      setTargetGlucose(userProfile.targetGlucose);
    }
  }, [insulinType, userProfile?.targetGlucose]);

  // Get user's insulin parameters or use defaults
  const carbRatio = userProfile?.carbRatio || DEFAULT_CARB_RATIO;
  const insulinSensitivityFactor =
    userProfile?.insulinSensitivityFactor || DEFAULT_INSULIN_SENSITIVITY_FACTOR;

  // Get user's personalized target range (warning level - yellow)
  const minTargetGlucose = userProfile?.minTargetGlucose || DEFAULT_MIN_TARGET_GLUCOSE;
  const maxTargetGlucose = userProfile?.maxTargetGlucose || DEFAULT_MAX_TARGET_GLUCOSE;

  // Calculate insulin units
  const carbsNum = carbohydrates || 0;
  const glucoseNum = glucoseLevel || 0;
  const targetGlucoseNum = targetGlucose;

  // Calculate insulin dose using shared utility
  const calculationResult = calculateInsulinDose({
    carbohydrates: carbsNum,
    glucoseLevel: glucoseNum,
    targetGlucose: targetGlucoseNum,
    insulinType,
    carbRatio,
    insulinSensitivityFactor,
  });

  const { carbInsulin, correctionInsulin, totalInsulin: calculatedInsulin } = calculationResult;

  // Calculate projected glucose with applied insulin (may differ from calculated)
  const appliedInsulinNum = appliedInsulin || 0;
  const projectedGlucoseWithApplied =
    glucoseNum + carbsNum * CARB_GLUCOSE_IMPACT - appliedInsulinNum * insulinSensitivityFactor;

  // Evaluate glucose alert using shared utility
  const glucoseAlert = evaluateGlucoseAlert(
    projectedGlucoseWithApplied,
    minTargetGlucose,
    maxTargetGlucose,
    glucoseNum,
    appliedInsulinNum,
  );

  const { level: alertLevel, message: alertMessage } = glucoseAlert;

  // Update appliedInsulin when calculatedInsulin changes (if not manually edited)
  useEffect(() => {
    if (!wasManuallyEdited && calculatedInsulin > 0) {
      setAppliedInsulin(parseFloat(calculatedInsulin.toFixed(1)));
    }
  }, [calculatedInsulin, wasManuallyEdited]);

  /**
   * Handle text input changes and convert to number
   */
  const handleGlucoseChange = (text: string) => {
    const value = parseFloat(text);
    setGlucoseLevel(isNaN(value) ? undefined : value);
  };

  const handleCarbsChange = (text: string) => {
    const value = parseFloat(text);
    setCarbohydrates(isNaN(value) ? undefined : value);
  };

  const handleTargetGlucoseChange = (text: string) => {
    const value = parseFloat(text);
    setTargetGlucose(isNaN(value) ? undefined : value);
  };

  const handleInsulinChange = (text: string) => {
    const value = parseFloat(text);
    const newValue = isNaN(value) ? undefined : value;
    setAppliedInsulin(newValue);

    // Mark as manually edited if difference is greater than 0.05 units
    if (newValue !== undefined) {
      setWasManuallyEdited(Math.abs(newValue - calculatedInsulin) > 0.05);
    }
  };

  /**
   * Handle click on insulin value to enable editing
   */
  const handleInsulinPress = () => {
    setIsEditingInsulin(true);
    setTimeout(() => {
      insulinInputRef.current?.focus();
    }, 100);
  };

  /**
   * Handle blur on insulin input
   */
  const handleInsulinBlur = () => {
    setIsEditingInsulin(false);
  };

  /**
   * Mutation to create log entry
   */
  const createLogEntryMutation = useMutation({
    mutationFn: async () => {
      if (!glucoseLevel || glucoseLevel < 20 || glucoseLevel > 600) {
        throw new Error("Glucosa debe estar entre 20 y 600 mg/dL");
      }

      if (!appliedInsulin || appliedInsulin < 0.5) {
        throw new Error("Las unidades de insulina deben ser al menos 0.5");
      }

      const client = createApiClient();
      const response = await client.POST("/log-entries", {
        body: {
          glucoseMgdl: Math.round(glucoseLevel),
          insulinUnits: appliedInsulin,
          calculatedInsulinUnits: calculatedInsulin,
          wasManuallyEdited: wasManuallyEdited,
          insulinType,
          mealName: prefilledMealName || undefined,
          carbohydrates: carbsNum > 0 ? carbsNum : undefined,
        },
      });

      if (response.error) {
        throw new Error("Error al crear registro");
      }

      return response.data;
    },
    onSuccess: () => {
      // Invalidate statistics to refresh home screen
      queryClient.invalidateQueries({ queryKey: ["statistics"] });
      Alert.alert("Éxito", "Registro creado exitosamente", [
        {
          text: "OK",
          onPress: () => {
            // Reset form
            setGlucoseLevel(undefined);
            setCarbohydrates(undefined);
            setTargetGlucose(undefined);
            setAppliedInsulin(undefined);
            setWasManuallyEdited(false);
            setInsulinType(InsulinType.BOLUS);
            // Navigate to home
            navigation.navigate("Inicio");
          },
        },
      ]);
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message || "No se pudo crear el registro");
    },
  });

  /**
   * Handle register button press
   */
  const handleRegister = () => {
    createLogEntryMutation.mutate();
  };

  // Show loading state while fetching profile
  if (profileLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <ScreenHeader title="Registrar" />

      {/* Glucose Input */}
      <View style={styles.section}>
        <TextInput
          label="Nivel de Glucosa actual"
          value={glucoseLevel?.toString() || ""}
          onChangeText={handleGlucoseChange}
          keyboardType="number-pad"
          placeholder="Ej: 120"
          unit="mg/dL"
        />
      </View>

      {/* Carbohydrates Input */}
      <View style={styles.section}>
        <TextInput
          label="Carbohidratos a consumir"
          value={carbohydrates?.toString() || ""}
          onChangeText={handleCarbsChange}
          keyboardType="decimal-pad"
          placeholder="Ej: 60"
          unit="g"
        />
      </View>

      {/* Insulin Type Selector */}
      <View style={styles.section}>
        <Text style={styles.label}>Tipo de insulina</Text>
        <View style={styles.insulinTypeContainer}>
          <TouchableOpacity
            style={[
              styles.insulinTypeButton,
              insulinType === InsulinType.BOLUS && styles.insulinTypeButtonActive,
            ]}
            onPress={() => setInsulinType(InsulinType.BOLUS)}
          >
            <Text
              style={[
                styles.insulinTypeText,
                insulinType === InsulinType.BOLUS && styles.insulinTypeTextActive,
              ]}
            >
              Rápida
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.insulinTypeButton,
              insulinType === InsulinType.BASAL && styles.insulinTypeButtonActive,
            ]}
            onPress={() => setInsulinType(InsulinType.BASAL)}
          >
            <Text
              style={[
                styles.insulinTypeText,
                insulinType === InsulinType.BASAL && styles.insulinTypeTextActive,
              ]}
            >
              Lenta
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Target Glucose Input (only for rapid insulin) */}
      {insulinType === InsulinType.BOLUS && (
        <View style={styles.section}>
          <TextInput
            label="Glucosa objetivo (opcional)"
            value={targetGlucose?.toString() || ""}
            onChangeText={handleTargetGlucoseChange}
            keyboardType="number-pad"
            placeholder="Ej: 100"
            unit="mg/dL"
          />
        </View>
      )}

      {/* Calculated Insulin Display (Editable) */}
      <View style={styles.section}>
        <Text style={styles.label}>Cálculo de Unidades</Text>
        <TouchableOpacity
          style={styles.calculationContainer}
          onPress={handleInsulinPress}
          activeOpacity={0.7}
        >
          <View style={styles.calculationDetails}>
            <Text style={styles.calculationLabel}>Ratio: 1:{carbRatio}</Text>
            {correctionInsulin > 0 && (
              <>
                <Text style={styles.calculationBreakdown}>
                  Carbohidratos: {carbInsulin.toFixed(1)} U
                </Text>
                <Text style={styles.calculationBreakdown}>
                  Corrección: {correctionInsulin.toFixed(1)} U (Factor: {insulinSensitivityFactor})
                </Text>
              </>
            )}
          </View>
          {isEditingInsulin ? (
            <RNTextInput
              ref={insulinInputRef}
              style={styles.calculatedValue}
              value={appliedInsulin?.toString() || ""}
              onChangeText={handleInsulinChange}
              onBlur={handleInsulinBlur}
              keyboardType="decimal-pad"
              selectTextOnFocus
            />
          ) : (
            <Text style={styles.calculatedValue}>
              {(appliedInsulin || calculatedInsulin).toFixed(1)} U
            </Text>
          )}
        </TouchableOpacity>

        {/* Glucose Range Alerts */}
        {alertLevel === "warning" && (
          <View style={styles.warningContainer}>
            <Text style={styles.warningText}>{alertMessage}</Text>
          </View>
        )}
        {alertLevel === "danger" && (
          <View style={styles.dangerContainer}>
            <Text style={styles.dangerText}>{alertMessage}</Text>
          </View>
        )}
      </View>

      {/* Summary */}
      {prefilledMealName && (
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Resumen</Text>
          <Text style={styles.summaryText}>Carbohidratos Totales: {carbsNum.toFixed(1)} g</Text>
          <Text style={styles.summaryText}>
            Unidades de Insulina Calculadas: {calculatedInsulin.toFixed(1)} U
          </Text>
        </View>
      )}

      {/* Register Button */}
      <Button
        title="Registrar"
        onPress={handleRegister}
        loading={createLogEntryMutation.isPending}
        style={styles.registerButton}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xxl,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
    fontWeight: "600",
  },
  calculationContainer: {
    backgroundColor: theme.colors.primary + "20",
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  calculationDetails: {
    flex: 1,
  },
  calculationLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    fontWeight: "500",
    marginBottom: theme.spacing.xs,
  },
  calculationBreakdown: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    opacity: 0.8,
    marginTop: theme.spacing.xs,
  },
  calculatedValue: {
    fontSize: theme.fontSize.xxl,
    fontWeight: "bold",
    color: theme.colors.primary,
  },
  insulinTypeContainer: {
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  insulinTypeButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
    backgroundColor: theme.colors.background,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  insulinTypeButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  insulinTypeText: {
    fontSize: theme.fontSize.lg,
    fontWeight: "600",
    color: theme.colors.text,
  },
  insulinTypeTextActive: {
    color: theme.colors.background,
  },
  summaryContainer: {
    backgroundColor: theme.colors.card,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  summaryTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  summaryText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  registerButton: {
    marginBottom: theme.spacing.xl,
  },
  warningContainer: {
    backgroundColor: theme.colors.warning + "20",
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.xs,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.warning,
  },
  warningText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.warning,
    fontWeight: "500",
  },
  dangerContainer: {
    backgroundColor: theme.colors.error + "20",
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.xs,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.error,
  },
  dangerText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.error,
    fontWeight: "700",
  },
});
