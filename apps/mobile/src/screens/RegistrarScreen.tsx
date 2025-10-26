import React, { useState, useEffect, useRef, useCallback } from "react";
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
import { useFocusEffect } from "@react-navigation/native";
import { Calculator } from "lucide-react-native";
import { theme } from "../theme";
import { createApiClient } from "../lib/api";
import type { RegistrarScreenProps } from "../navigation/types";
import { InsulinType, MealCategory, type UserProfile, type DoseResult } from "@glucosapp/types";
import { TextInput } from "../components";
import Button from "../components/Button";
import ScreenHeader from "../components/ScreenHeader";
import { CustomDateTimePicker } from "../components";
import {
  useRealTimeDoseCalculation,
  useRealTimeCorrectionCalculation,
  useDebouncedValidation,
} from "../hooks";
import {
  validateGlucose,
  validateCarbohydrates,
  validateTargetGlucose,
  validateForm,
} from "../utils/validation";

/**
 * RegistrarScreen component - Register glucose, insulin, and meal entry
 */
export default function RegistrarScreen({ navigation, route }: RegistrarScreenProps) {
  const queryClient = useQueryClient();
  const prefilledCarbs = route?.params?.carbohydrates;

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
  const [mealType, setMealCategory] = useState<MealCategory>(MealCategory.LUNCH);
  const [appliedInsulin, setAppliedInsulin] = useState<number | undefined>(undefined);
  const [wasManuallyEdited, setWasManuallyEdited] = useState(false);
  const [isEditingInsulin, setIsEditingInsulin] = useState(false);
  const [calculatedDose, setCalculatedDose] = useState<DoseResult | null>(null);
  const [isTargetGlucoseEdited, setIsTargetGlucoseEdited] = useState(false);
  const [isFasting, setIsFasting] = useState(false);
  const [recordedAt, setRecordedAt] = useState<Date>(new Date());
  const [showDateTimePicker, setShowDateTimePicker] = useState(false);
  const [isTimeManuallyEdited, setIsTimeManuallyEdited] = useState(false);
  const insulinInputRef = useRef<RNTextInput>(null);

  // Debounced validation hooks
  const { validation: glucoseValidation } = useDebouncedValidation(
    glucoseLevel,
    validateGlucose,
    1000, // 1 second delay
  );

  const { validation: carbValidation } = useDebouncedValidation(
    carbohydrates,
    validateCarbohydrates,
    1000, // 1 second delay
  );

  // Memoize the validation function to prevent infinite loops
  const validateTargetGlucoseWithCurrent = useCallback(
    (value: number | undefined) => validateTargetGlucose(value, glucoseLevel),
    [glucoseLevel],
  );

  const { validation: targetGlucoseValidation } = useDebouncedValidation(
    targetGlucose,
    validateTargetGlucoseWithCurrent,
    1000, // 1 second delay
  );

  // Context states for dose calculation
  const [recentExercise, setRecentExercise] = useState(false);
  const [alcohol, setAlcohol] = useState(false);
  const [illness, setIllness] = useState(false);
  const [stress, setStress] = useState(false);
  const [menstruation, setMenstruation] = useState(false);
  const [highFatMeal, setHighFatMeal] = useState(false);
  const [isContextExpanded, setIsContextExpanded] = useState(false);
  // Hour of day is taken from the selected recordedAt time
  const hourOfDay = recordedAt.getHours();
  const formattedTime = `${recordedAt.getHours().toString().padStart(2, "0")}:${recordedAt.getMinutes().toString().padStart(2, "0")}`;

  // Ref to track if we just received carbs from Calculator (to prevent reset)
  const hasPrefilledCarbsRef = useRef(false);

  /**
   * Reset all form fields to their initial state
   */
  const resetFormFields = () => {
    setGlucoseLevel(undefined);
    setCarbohydrates(undefined);
    setTargetGlucose(undefined);
    setMealCategory(MealCategory.LUNCH);
    setAppliedInsulin(undefined);
    setWasManuallyEdited(false);
    setIsEditingInsulin(false);
    setCalculatedDose(null);
    setIsTargetGlucoseEdited(false);
    setIsFasting(false);
    setRecordedAt(new Date());
    setShowDateTimePicker(false);
    setIsTimeManuallyEdited(false);

    // Reset context states
    setRecentExercise(false);
    setAlcohol(false);
    setIllness(false);
    setStress(false);
    setMenstruation(false);
    setHighFatMeal(false);
    setIsContextExpanded(false);

    // Validation states are automatically reset by the debounced hooks
  };

  // Real-time dose calculation hook for meal mode
  const { doseResult: realTimeDoseResult, isCalculating: isDoseCalculating } =
    useRealTimeDoseCalculation({
      glucose: glucoseLevel || 0,
      carbohydrates: carbohydrates || 0,
      mealType: mealType as "BREAKFAST" | "LUNCH" | "DINNER",
      enabled: !wasManuallyEdited && !isFasting,
      debounceDelay: 800, // 800ms delay for better UX
      targetGlucose: isTargetGlucoseEdited ? targetGlucose : userProfile?.targetGlucose,
      context: {
        recentExercise,
        alcohol,
        illness,
        stress,
        menstruation,
        highFatMeal,
        hourOfDay,
      },
    });

  // Real-time correction calculation hook for fasting mode
  const { doseResult: realTimeCorrectionResult, isCalculating: isCorrectionCalculating } =
    useRealTimeCorrectionCalculation({
      glucose: glucoseLevel || 0,
      enabled: !wasManuallyEdited && isFasting && targetGlucose !== undefined,
      debounceDelay: 800, // 800ms delay for better UX
      targetGlucose: isTargetGlucoseEdited ? targetGlucose : userProfile?.targetGlucose,
      context: {
        recentExercise,
        alcohol,
        illness,
        stress,
        menstruation,
        highFatMeal,
        hourOfDay,
      },
    });

  // Update carbohydrates when navigating with prefilled value
  useEffect(() => {
    const carbsParam = route?.params?.carbohydrates;
    if (carbsParam !== undefined && carbsParam !== null) {
      hasPrefilledCarbsRef.current = true;
      setCarbohydrates(carbsParam);
      // Clear the param after using it
      navigation.setParams({ carbohydrates: undefined } as any);
      // Reset the flag after a delay to allow normal resets later
      setTimeout(() => {
        hasPrefilledCarbsRef.current = false;
      }, 1000);
    }
  }, [route?.params?.carbohydrates, navigation]);

  // Set default target glucose from user profile when profile loads
  useEffect(() => {
    if (userProfile?.targetGlucose && !isTargetGlucoseEdited && !isFasting) {
      setTargetGlucose(userProfile.targetGlucose);
    }
  }, [userProfile?.targetGlucose, isTargetGlucoseEdited, isFasting]);

  // Clear target glucose when switching to fasting mode
  useEffect(() => {
    if (isFasting) {
      setTargetGlucose(undefined);
      setIsTargetGlucoseEdited(false);
    }
  }, [isFasting]);

  /**
   * Get meal type based on time and user profile meal time ranges
   */
  const getMealCategoryFromTime = (date: Date, profile: UserProfile | undefined): MealCategory => {
    if (!profile) return MealCategory.LUNCH; // Default fallback

    const minutesFromMidnight = date.getHours() * 60 + date.getMinutes();

    // Check breakfast range
    if (profile.mealTimeBreakfastStart <= profile.mealTimeBreakfastEnd) {
      // Normal range (e.g., 5:00 AM - 11:00 AM)
      if (
        minutesFromMidnight >= profile.mealTimeBreakfastStart &&
        minutesFromMidnight < profile.mealTimeBreakfastEnd
      ) {
        return MealCategory.BREAKFAST;
      }
    } else {
      // Wrap-around range (e.g., 10:00 PM - 6:00 AM)
      if (
        minutesFromMidnight >= profile.mealTimeBreakfastStart ||
        minutesFromMidnight < profile.mealTimeBreakfastEnd
      ) {
        return MealCategory.BREAKFAST;
      }
    }

    // Check lunch range
    if (profile.mealTimeLunchStart <= profile.mealTimeLunchEnd) {
      // Normal range (e.g., 11:00 AM - 5:00 PM)
      if (
        minutesFromMidnight >= profile.mealTimeLunchStart &&
        minutesFromMidnight < profile.mealTimeLunchEnd
      ) {
        return MealCategory.LUNCH;
      }
    } else {
      // Wrap-around range
      if (
        minutesFromMidnight >= profile.mealTimeLunchStart ||
        minutesFromMidnight < profile.mealTimeLunchEnd
      ) {
        return MealCategory.LUNCH;
      }
    }

    // Check dinner range
    if (profile.mealTimeDinnerStart <= profile.mealTimeDinnerEnd) {
      // Normal range (e.g., 5:00 PM - 10:00 PM)
      if (
        minutesFromMidnight >= profile.mealTimeDinnerStart &&
        minutesFromMidnight < profile.mealTimeDinnerEnd
      ) {
        return MealCategory.DINNER;
      }
    } else {
      // Wrap-around range (e.g., 5:00 PM - 5:00 AM next day)
      if (
        minutesFromMidnight >= profile.mealTimeDinnerStart ||
        minutesFromMidnight < profile.mealTimeDinnerEnd
      ) {
        return MealCategory.DINNER;
      }
    }

    // Default to lunch if no range matches
    return MealCategory.LUNCH;
  };

  // Auto-update meal type when recordedAt or userProfile changes (only in meal mode)
  useEffect(() => {
    if (!isFasting && userProfile) {
      const newMealCategory = getMealCategoryFromTime(recordedAt, userProfile);
      setMealCategory(newMealCategory);
    }
  }, [recordedAt, userProfile, isFasting]);

  // Update current time every minute (only if time hasn't been manually edited)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isTimeManuallyEdited) {
        setRecordedAt(new Date());
      }
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [isTimeManuallyEdited]);

  // Get IC ratio based on meal type
  const getCurrentIcRatio = () => {
    if (!userProfile) return 12; // Default
    switch (mealType) {
      case MealCategory.BREAKFAST:
        return userProfile.icRatioBreakfast;
      case MealCategory.LUNCH:
        return userProfile.icRatioLunch;
      case MealCategory.DINNER:
        return userProfile.icRatioDinner;
      default:
        return userProfile.icRatioLunch;
    }
  };

  const carbRatio = getCurrentIcRatio();

  // Calculate insulin units
  const carbsNum = carbohydrates || 0;

  // Update calculated dose when real-time calculation completes (meal mode)
  useEffect(() => {
    if (realTimeDoseResult && !wasManuallyEdited && !isFasting) {
      setCalculatedDose(realTimeDoseResult);
      // Auto-fill insulin field with calculated dose
      if (!isEditingInsulin) {
        setAppliedInsulin(realTimeDoseResult.dose);
      }
    }
  }, [realTimeDoseResult, wasManuallyEdited, isEditingInsulin, isFasting]);

  // Update calculated dose when real-time correction calculation completes (fasting mode)
  useEffect(() => {
    if (
      realTimeCorrectionResult &&
      !wasManuallyEdited &&
      isFasting &&
      typeof realTimeCorrectionResult === "object" &&
      realTimeCorrectionResult !== null &&
      "dose" in realTimeCorrectionResult &&
      typeof realTimeCorrectionResult.dose === "number"
    ) {
      setCalculatedDose(realTimeCorrectionResult as DoseResult);
      // Auto-fill insulin field with calculated dose
      if (!isEditingInsulin) {
        setAppliedInsulin(realTimeCorrectionResult.dose);
      }
    }
  }, [realTimeCorrectionResult, wasManuallyEdited, isEditingInsulin, isFasting]);

  const breakdown = calculatedDose?.breakdown;
  const prandialInsulin = breakdown?.prandial || 0;
  const correctionInsulin = breakdown?.correction || 0;
  const iobInsulin = breakdown?.iob || 0;
  const calculatedInsulin = calculatedDose?.dose || 0;
  const safetyReduction = breakdown?.safetyReduction || 0;

  // Get warnings from backend calculation result
  const backendWarnings = Array.isArray(calculatedDose?.warnings) ? calculatedDose.warnings : [];

  // Update appliedInsulin when calculatedInsulin changes (if not manually edited)
  useEffect(() => {
    if (!wasManuallyEdited && !isEditingInsulin && calculatedInsulin > 0) {
      setAppliedInsulin(parseFloat(calculatedInsulin.toFixed(1)));
    }
  }, [calculatedInsulin, wasManuallyEdited, isEditingInsulin]);

  // Reset form fields when screen gains focus (user enters screen)
  // BUT NOT if we just received prefilled carbohydrates from Calculator
  useFocusEffect(
    useCallback(() => {
      // Don't reset if we just received carbs from Calculator
      if (!hasPrefilledCarbsRef.current) {
        resetFormFields();
      }
    }, []),
  );

  /**
   * Navigate to Calculator screen
   */
  const handleNavigateToCalculator = () => {
    // Navigate to Calculator in the root stack (above tabs)
    navigation.navigate("Calculator");
  };

  /**
   * Handle text input changes and convert to number
   */
  const handleGlucoseChange = (text: string) => {
    const value = parseFloat(text);
    const newValue = isNaN(value) ? undefined : value;
    setGlucoseLevel(newValue);
    // Validation is handled by the debounced hook
  };

  const handleCarbsChange = (text: string) => {
    const value = parseFloat(text);
    const newValue = isNaN(value) ? undefined : value;
    setCarbohydrates(newValue);
    // Validation is handled by the debounced hook
  };

  const handleTargetGlucoseChange = (text: string) => {
    const value = parseFloat(text);

    // Mark as edited when user starts typing
    if (!isTargetGlucoseEdited) {
      setIsTargetGlucoseEdited(true);
    }

    // If user clears the field, reset to profile value
    if (text === "" && userProfile?.targetGlucose) {
      setTargetGlucose(undefined);
      setIsTargetGlucoseEdited(false);
      // Clear calculated dose when target glucose is cleared
      setAppliedInsulin(undefined);
      setWasManuallyEdited(false);
    } else {
      const newValue = isNaN(value) ? undefined : value;
      setTargetGlucose(newValue);
      // Validation is handled by the debounced hook
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
   * Mutation to create log entry
   */
  const createLogEntryMutation = useMutation({
    mutationFn: async () => {
      if (!glucoseLevel || glucoseLevel < 20 || glucoseLevel > 600) {
        throw new Error("Glucosa debe estar entre 20 y 600 mg/dL");
      }

      const client = createApiClient();
      const response = await client.POST("/log-entries", {
        glucoseMgdl: Math.round(glucoseLevel),
        insulinUnits: appliedInsulin || 0,
        calculatedInsulinUnits: calculatedInsulin || 0,
        wasManuallyEdited: wasManuallyEdited,
        insulinType: InsulinType.BOLUS,
        carbohydrates: isFasting ? undefined : carbsNum > 0 ? carbsNum : undefined,
        mealType: isFasting ? MealCategory.CORRECTION : mealType,
        recordedAt: recordedAt.toISOString(),
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
            // Reset all form fields
            resetFormFields();
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
    // Validate all form fields before submission
    const formValidation = validateForm({
      glucoseLevel,
      carbohydrates: isFasting ? undefined : carbohydrates,
      targetGlucose: isFasting ? targetGlucose : undefined,
      appliedInsulin,
      recordedAt,
    });

    if (!formValidation.isValid) {
      Alert.alert("Datos inválidos", formValidation.errors.join("\n"), [{ text: "OK" }]);
      return;
    }

    // Show warnings if any
    if (formValidation.warnings.length > 0) {
      Alert.alert("Advertencias", formValidation.warnings.join("\n"), [
        { text: "Cancelar", style: "cancel" },
        { text: "Continuar", onPress: () => createLogEntryMutation.mutate() },
      ]);
      return;
    }

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
          error={!glucoseValidation.isValid ? glucoseValidation.message : undefined}
          warning={
            glucoseValidation.message && glucoseValidation.severity === "warning"
              ? glucoseValidation.message
              : undefined
          }
        />
      </View>

      {/* Fasting/Meal Selector */}
      <View style={styles.section}>
        <Text style={styles.label}>Tipo de registro</Text>
        <View style={styles.fastingSelectorContainer}>
          <TouchableOpacity
            style={[styles.fastingSelectorButton, !isFasting && styles.fastingSelectorButtonActive]}
            onPress={() => setIsFasting(false)}
          >
            <Text
              style={[styles.fastingSelectorText, !isFasting && styles.fastingSelectorTextActive]}
            >
              🍽️ Comida
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.fastingSelectorButton, isFasting && styles.fastingSelectorButtonActive]}
            onPress={() => setIsFasting(true)}
          >
            <Text
              style={[styles.fastingSelectorText, isFasting && styles.fastingSelectorTextActive]}
            >
              ⏰ Ayuno
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Carbohydrates Input */}
      {!isFasting && (
        <View style={styles.section}>
          <View style={styles.carbsInputContainer}>
            <View style={styles.carbsInputWrapper}>
              <TextInput
                label="Carbohidratos a consumir"
                value={carbohydrates?.toString() || ""}
                onChangeText={handleCarbsChange}
                keyboardType="decimal-pad"
                placeholder="Ej: 60"
                unit="g"
                error={!carbValidation.isValid ? carbValidation.message : undefined}
                warning={
                  carbValidation.message && carbValidation.severity === "warning"
                    ? carbValidation.message
                    : undefined
                }
              />
            </View>
            <TouchableOpacity
              style={styles.calculatorButton}
              onPress={handleNavigateToCalculator}
              activeOpacity={0.7}
            >
              <Calculator size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Target Glucose Input */}
      <View style={styles.section}>
        <TextInput
          label={isFasting ? "Corregir glucosa (opcional)" : "Glucosa objetivo (opcional)"}
          value={isTargetGlucoseEdited ? targetGlucose?.toString() || "" : ""}
          onChangeText={handleTargetGlucoseChange}
          keyboardType="number-pad"
          placeholder={userProfile?.targetGlucose ? `${userProfile.targetGlucose}` : "Ej: 100"}
          unit="mg/dL"
          error={!targetGlucoseValidation.isValid ? targetGlucoseValidation.message : undefined}
        />
      </View>

      {/* Context Section - Show in meal mode OR fasting mode with target glucose */}
      {(!isFasting || (isFasting && targetGlucose && isTargetGlucoseEdited)) && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.contextHeader}
            onPress={() => setIsContextExpanded(!isContextExpanded)}
            activeOpacity={0.7}
          >
            <Text style={[styles.label, styles.contextHeaderTitle]}>Contexto Adicional</Text>
            <Text style={styles.contextToggleIcon}>{isContextExpanded ? "▼" : "▶"}</Text>
          </TouchableOpacity>

          <Text style={styles.contextSubtitle}>
            Factores que pueden afectar el cálculo: Marca las opciones que apliquen para un cálculo
            más preciso
          </Text>

          {isContextExpanded && (
            <>
              <View style={styles.contextGrid}>
                {/* First Column */}
                <View style={styles.contextColumn}>
                  <TouchableOpacity
                    style={[styles.contextCheckbox, recentExercise && styles.contextCheckboxActive]}
                    onPress={() => setRecentExercise(!recentExercise)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.contextCheckboxText,
                        recentExercise && styles.contextCheckboxTextActive,
                      ]}
                      numberOfLines={2}
                    >
                      🏃‍♂️ Ejercicio Reciente (~4hs)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.contextCheckbox, alcohol && styles.contextCheckboxActive]}
                    onPress={() => setAlcohol(!alcohol)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.contextCheckboxText,
                        alcohol && styles.contextCheckboxTextActive,
                      ]}
                      numberOfLines={2}
                    >
                      🍷 Alcohol
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.contextCheckbox, illness && styles.contextCheckboxActive]}
                    onPress={() => setIllness(!illness)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.contextCheckboxText,
                        illness && styles.contextCheckboxTextActive,
                      ]}
                      numberOfLines={2}
                    >
                      🤒 Enfermedad
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Second Column */}
                <View style={styles.contextColumn}>
                  <TouchableOpacity
                    style={[styles.contextCheckbox, stress && styles.contextCheckboxActive]}
                    onPress={() => setStress(!stress)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.contextCheckboxText,
                        stress && styles.contextCheckboxTextActive,
                      ]}
                      numberOfLines={2}
                    >
                      😰 Estrés alto
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.contextCheckbox, menstruation && styles.contextCheckboxActive]}
                    onPress={() => setMenstruation(!menstruation)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.contextCheckboxText,
                        menstruation && styles.contextCheckboxTextActive,
                      ]}
                      numberOfLines={2}
                    >
                      🩸 Menstruación
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.contextCheckbox, highFatMeal && styles.contextCheckboxActive]}
                    onPress={() => setHighFatMeal(!highFatMeal)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.contextCheckboxText,
                        highFatMeal && styles.contextCheckboxTextActive,
                      ]}
                      numberOfLines={2}
                    >
                      🥓 Comida alta en grasa
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </View>
      )}

      {/* Calculated Insulin Display (Editable) */}
      {(!isFasting || (isFasting && targetGlucose && isTargetGlucoseEdited)) && (
        <View style={styles.section}>
          <View style={styles.labelContainer}>
            <Text style={styles.label}>Cálculo de Unidades</Text>
            {(isDoseCalculating || isCorrectionCalculating) && (
              <View style={styles.calculatingIndicator}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.calculatingText}>Calculando...</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.calculationContainer}
            onPress={handleInsulinPress}
            activeOpacity={0.7}
          >
            <View style={styles.calculationDetails}>
              <Text style={styles.calculationLabel}>Ratio: 1:{carbRatio}</Text>
              {breakdown && (
                <>
                  <Text style={styles.calculationBreakdown}>
                    Dosis Prandial: {prandialInsulin.toFixed(1)} U
                  </Text>
                  {correctionInsulin > 0 && (
                    <Text style={styles.calculationBreakdown}>
                      Corrección: {correctionInsulin.toFixed(1)} U
                    </Text>
                  )}
                  {iobInsulin > 0 && (
                    <Text style={styles.calculationBreakdown}>
                      IOB restado: -{iobInsulin.toFixed(1)} U
                    </Text>
                  )}
                  {safetyReduction > 0 && (
                    <Text style={styles.calculationBreakdown}>
                      Reducción seguridad: -{safetyReduction.toFixed(1)} U
                    </Text>
                  )}
                  {breakdown.glucose && breakdown.targetGlucose && (
                    <Text style={styles.calculationBreakdown}>
                      Glucosa: {breakdown.glucose} → {breakdown.targetGlucose} mg/dL
                    </Text>
                  )}
                  {breakdown.carbohydrates > 0 && (
                    <Text style={styles.calculationBreakdown}>
                      Carbohidratos: {breakdown.carbohydrates}g
                    </Text>
                  )}
                </>
              )}
            </View>
            {
              <Text style={styles.calculatedValue}>
                {(appliedInsulin || calculatedInsulin).toFixed(1)} U
              </Text>
            }
          </TouchableOpacity>

          {/* Backend Warnings */}
          {backendWarnings.length > 0 && (
            <View style={styles.warningsContainer}>
              {backendWarnings.map((warning, index) => {
                const isDanger =
                  warning &&
                  (warning.includes("🚨") ||
                    warning.includes("HYPOGLYCEMIA") ||
                    warning.includes("Very high glucose"));

                return (
                  <View
                    key={index}
                    style={[
                      styles.warningItem,
                      isDanger ? styles.dangerContainer : styles.warningContainer,
                    ]}
                  >
                    <Text
                      style={[
                        styles.warningText,
                        isDanger ? styles.dangerText : styles.warningText,
                      ]}
                    >
                      {warning}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* Date/Time display - Always visible */}
      <View style={styles.timeDisplaySection}>
        <TouchableOpacity
          style={[styles.timeDisplay, isTimeManuallyEdited && styles.timeDisplayEdited]}
          onPress={() => setShowDateTimePicker(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.timeLabel, isTimeManuallyEdited && styles.timeLabelEdited]}>
            {isTimeManuallyEdited ? "Hora personalizada" : "Hora actual"}:{" "}
            {isTimeManuallyEdited
              ? recordedAt.toLocaleDateString("es-ES", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : new Date().toLocaleDateString("es-ES", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
            , {formattedTime}
          </Text>
          <Text style={styles.timeSubLabel}>
            {isTimeManuallyEdited ? "Hora editada manualmente" : "Toca para cambiar"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* DateTimePicker Modal */}
      <CustomDateTimePicker
        value={recordedAt}
        onDateChange={(date) => {
          if (date) {
            setRecordedAt(date);
            // Check if the date is very close to current time (within 1 minute)
            const now = new Date();
            const timeDiff = Math.abs(date.getTime() - now.getTime());
            const isCurrentTime = timeDiff < 60000; // 1 minute in milliseconds

            if (isCurrentTime) {
              setIsTimeManuallyEdited(false);
            } else {
              setIsTimeManuallyEdited(true);
            }
          }
          setShowDateTimePicker(false);
        }}
        mode="datetime"
        minimumDate={new Date(2020, 0, 1)}
        maximumDate={new Date()}
        showButton={false}
        visible={showDateTimePicker}
      />

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
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xxl,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  carbsInputContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.sm,
  },
  carbsInputWrapper: {
    flex: 1,
  },
  calculatorButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary + "15",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
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
  fastingSelectorContainer: {
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  fastingSelectorButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
    backgroundColor: theme.colors.background,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  fastingSelectorButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  fastingSelectorText: {
    fontSize: theme.fontSize.lg,
    fontWeight: "600",
    color: theme.colors.text,
  },
  fastingSelectorTextActive: {
    color: theme.colors.background,
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
  mealTypeContainer: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  mealTypeButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
    backgroundColor: theme.colors.background,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  mealTypeButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  mealTypeText: {
    fontSize: theme.fontSize.sm,
    fontWeight: "600",
    color: theme.colors.text,
  },
  mealTypeTextActive: {
    color: theme.colors.background,
  },
  autoMealCategoryContainer: {
    backgroundColor: theme.colors.primary + "15",
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary + "30",
    alignItems: "center",
  },
  autoMealCategoryText: {
    fontSize: theme.fontSize.lg,
    fontWeight: "600",
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  autoMealCategorySubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text + "80",
    fontStyle: "italic",
  },
  labelContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  calculatingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  calculatingText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: "500",
  },
  errorText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.error,
    fontWeight: "500",
    marginTop: theme.spacing.xs,
  },
  warningsContainer: {
    marginTop: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  warningItem: {
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderLeftWidth: 3,
  },
  adjustmentsContainer: {
    marginTop: theme.spacing.xs,
    padding: theme.spacing.xs,
    backgroundColor: theme.colors.background + "40",
    borderRadius: theme.borderRadius.sm,
  },
  adjustmentsTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  adjustmentText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.text + "80",
    marginLeft: theme.spacing.sm,
  },
  contextHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.primary + "15",
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderColor: theme.colors.primary + "40",
    marginBottom: theme.spacing.sm,
    minHeight: 60,
    shadowColor: theme.colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contextHeaderTitle: {
    color: theme.colors.primary,
    fontWeight: "700",
    fontSize: theme.fontSize.md,
  },
  contextToggleIcon: {
    fontSize: theme.fontSize.xl,
    color: theme.colors.primary,
    fontWeight: "bold",
  },
  contextSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary + "CC",
    marginBottom: theme.spacing.md,
    fontStyle: "italic",
    textAlign: "center",
  },
  contextGrid: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    width: "100%",
    flex: 1,
  },
  contextColumn: {
    flex: 1,
    gap: theme.spacing.sm,
    maxWidth: "50%",
    alignItems: "stretch",
  },
  contextCheckbox: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    maxWidth: "100%",
    minHeight: 50,
    flex: 1,
    display: "flex",
  },
  contextCheckboxActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  contextCheckboxText: {
    fontSize: theme.fontSize.sm,
    fontWeight: "500",
    color: theme.colors.text,
    textAlign: "center",
    textAlignVertical: "center",
    lineHeight: 16,
    flexWrap: "wrap",
    width: "100%",
    alignSelf: "center",
  },
  contextCheckboxTextActive: {
    color: theme.colors.background,
    fontWeight: "600",
  },
  timeDisplaySection: {
    marginBottom: theme.spacing.lg,
  },
  timeDisplay: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.primary + "15",
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.primary + "30",
  },
  timeDisplayEdited: {
    backgroundColor: theme.colors.warning + "20",
    borderColor: theme.colors.warning + "50",
    borderWidth: 2,
  },
  timeLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: "600",
    color: theme.colors.primary,
    textAlign: "center",
  },
  timeLabelEdited: {
    color: theme.colors.warning,
    fontWeight: "700",
  },
  timeSubLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.text + "60",
    marginTop: theme.spacing.xs,
    fontStyle: "italic",
  },
  errorValue: {
    color: theme.colors.error,
    borderColor: theme.colors.error,
    borderWidth: 1,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
  },
});
