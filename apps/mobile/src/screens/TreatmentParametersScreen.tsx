import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ArrowLeft, Clock, Target, Syringe, ChevronRight } from "lucide-react-native";
import { theme } from "../theme";
import { createApiClient } from "../lib/api";
import { type UserProfile } from "@glucosapp/types";
import { CustomDateTimePicker } from "../components/DateTimePicker";
import type { RootStackParamList } from "../navigation/types";
import {
  minutesToTime,
  timeToMinutes,
  formatTimeFromMinutes,
  extractTimeFromPicker,
} from "../utils/dateUtils";

type TreatmentParametersScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "TreatmentParameters"
>;

export default function TreatmentParametersScreen({ navigation }: TreatmentParametersScreenProps) {
  const queryClient = useQueryClient();

  // State for Insulin Parameters
  const [icRatioBreakfast, setIcRatioBreakfast] = useState("");
  const [icRatioLunch, setIcRatioLunch] = useState("");
  const [icRatioDinner, setIcRatioDinner] = useState("");
  const [insulinSensitivityFactor, setInsulinSensitivityFactor] = useState("");
  const [diaHours, setDiaHours] = useState("");

  // State for Target Glucose Ranges
  const [targetGlucose, setTargetGlucose] = useState("");
  const [minTargetGlucose, setMinTargetGlucose] = useState("");
  const [maxTargetGlucose, setMaxTargetGlucose] = useState("");

  // State for Meal Times (as Date objects for picker)
  const [breakfastStart, setBreakfastStart] = useState<Date | null>(null);
  const [breakfastEnd, setBreakfastEnd] = useState<Date | null>(null);
  const [lunchStart, setLunchStart] = useState<Date | null>(null);
  const [lunchEnd, setLunchEnd] = useState<Date | null>(null);
  const [dinnerStart, setDinnerStart] = useState<Date | null>(null);
  const [dinnerEnd, setDinnerEnd] = useState<Date | null>(null);

  // Flag to prevent infinite loops when auto-adjusting
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Refs to track previous values for comparison
  const prevBreakfastStart = useRef<number | null>(null);
  const prevBreakfastEnd = useRef<number | null>(null);
  const prevLunchStart = useRef<number | null>(null);
  const prevLunchEnd = useRef<number | null>(null);
  const prevDinnerStart = useRef<number | null>(null);
  const prevDinnerEnd = useRef<number | null>(null);

  // State for time picker visibility
  const [showBreakfastStartPicker, setShowBreakfastStartPicker] = useState(false);
  const [showBreakfastEndPicker, setShowBreakfastEndPicker] = useState(false);
  const [showLunchStartPicker, setShowLunchStartPicker] = useState(false);
  const [showLunchEndPicker, setShowLunchEndPicker] = useState(false);
  const [showDinnerStartPicker, setShowDinnerStartPicker] = useState(false);
  const [showDinnerEndPicker, setShowDinnerEndPicker] = useState(false);

  // Fetch profile
  const { data: profile, isLoading } = useQuery<UserProfile>({
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

  // Initialize state from profile data
  useEffect(() => {
    if (profile) {
      // Insulin Parameters
      setIcRatioBreakfast(profile.icRatioBreakfast?.toString() || "");
      setIcRatioLunch(profile.icRatioLunch?.toString() || "");
      setIcRatioDinner(profile.icRatioDinner?.toString() || "");
      setInsulinSensitivityFactor(profile.insulinSensitivityFactor?.toString() || "");
      setDiaHours(profile.diaHours?.toString() || "");

      // Target Glucose Ranges
      setTargetGlucose(profile.targetGlucose?.toString() || "");
      setMinTargetGlucose(profile.minTargetGlucose?.toString() || "");
      setMaxTargetGlucose(profile.maxTargetGlucose?.toString() || "");

      // Meal Times
      if (profile.mealTimeBreakfastStart !== undefined) {
        const bs = minutesToTime(profile.mealTimeBreakfastStart);
        setBreakfastStart(bs);
        prevBreakfastStart.current = timeToMinutes(bs);
      }
      if (profile.mealTimeBreakfastEnd !== undefined) {
        const be = minutesToTime(profile.mealTimeBreakfastEnd);
        setBreakfastEnd(be);
        prevBreakfastEnd.current = timeToMinutes(be);
      }
      if (profile.mealTimeLunchStart !== undefined) {
        const ls = minutesToTime(profile.mealTimeLunchStart);
        setLunchStart(ls);
        prevLunchStart.current = timeToMinutes(ls);
      }
      if (profile.mealTimeLunchEnd !== undefined) {
        const le = minutesToTime(profile.mealTimeLunchEnd);
        setLunchEnd(le);
        prevLunchEnd.current = timeToMinutes(le);
      }
      if (profile.mealTimeDinnerStart !== undefined) {
        const ds = minutesToTime(profile.mealTimeDinnerStart);
        setDinnerStart(ds);
        prevDinnerStart.current = timeToMinutes(ds);
      }
      if (profile.mealTimeDinnerEnd !== undefined) {
        const de = minutesToTime(profile.mealTimeDinnerEnd);
        setDinnerEnd(de);
        prevDinnerEnd.current = timeToMinutes(de);
      }
    }
  }, [profile]);

  // Auto-adjust adjacent meal times to ensure 24-hour coverage without gaps
  useEffect(() => {
    if (
      isAdjusting ||
      !breakfastStart ||
      !breakfastEnd ||
      !lunchStart ||
      !lunchEnd ||
      !dinnerStart ||
      !dinnerEnd
    ) {
      // Update refs even if we're not adjusting
      if (breakfastStart) prevBreakfastStart.current = timeToMinutes(breakfastStart);
      if (breakfastEnd) prevBreakfastEnd.current = timeToMinutes(breakfastEnd);
      if (lunchStart) prevLunchStart.current = timeToMinutes(lunchStart);
      if (lunchEnd) prevLunchEnd.current = timeToMinutes(lunchEnd);
      if (dinnerStart) prevDinnerStart.current = timeToMinutes(dinnerStart);
      if (dinnerEnd) prevDinnerEnd.current = timeToMinutes(dinnerEnd);
      return;
    }

    const breakfastStartMin = timeToMinutes(breakfastStart);
    const breakfastEndMin = timeToMinutes(breakfastEnd);
    const lunchStartMin = timeToMinutes(lunchStart);
    const lunchEndMin = timeToMinutes(lunchEnd);
    const dinnerStartMin = timeToMinutes(dinnerStart);
    const dinnerEndMin = timeToMinutes(dinnerEnd);

    // Check what changed and adjust accordingly
    const breakfastStartChanged =
      prevBreakfastStart.current !== null && breakfastStartMin !== prevBreakfastStart.current;
    const breakfastEndChanged =
      prevBreakfastEnd.current !== null && breakfastEndMin !== prevBreakfastEnd.current;
    const lunchStartChanged =
      prevLunchStart.current !== null && lunchStartMin !== prevLunchStart.current;
    const lunchEndChanged = prevLunchEnd.current !== null && lunchEndMin !== prevLunchEnd.current;
    const dinnerStartChanged =
      prevDinnerStart.current !== null && dinnerStartMin !== prevDinnerStart.current;
    const dinnerEndChanged =
      prevDinnerEnd.current !== null && dinnerEndMin !== prevDinnerEnd.current;

    // Only adjust if something actually changed
    if (
      !breakfastStartChanged &&
      !breakfastEndChanged &&
      !lunchStartChanged &&
      !lunchEndChanged &&
      !dinnerStartChanged &&
      !dinnerEndChanged
    ) {
      return;
    }

    setIsAdjusting(true);

    // Update refs with current values first
    prevBreakfastStart.current = breakfastStartMin;
    prevBreakfastEnd.current = breakfastEndMin;
    prevLunchStart.current = lunchStartMin;
    prevLunchEnd.current = lunchEndMin;
    prevDinnerStart.current = dinnerStartMin;
    prevDinnerEnd.current = dinnerEndMin;

    // Adjust breakfast start -> adjust dinner end (previous meal, may cross midnight)
    if (breakfastStartChanged) {
      const newDinnerEndMin = breakfastStartMin;
      setDinnerEnd(minutesToTime(newDinnerEndMin));
      // Update ref after state update completes
      setTimeout(() => {
        prevDinnerEnd.current = newDinnerEndMin;
      }, 0);
    }

    // Adjust breakfast end -> adjust lunch start (next meal)
    if (breakfastEndChanged) {
      const newLunchStartMin = breakfastEndMin;
      setLunchStart(minutesToTime(newLunchStartMin));
      setTimeout(() => {
        prevLunchStart.current = newLunchStartMin;
      }, 0);
    }

    // Adjust lunch start -> adjust breakfast end (previous meal)
    if (lunchStartChanged) {
      const newBreakfastEndMin = lunchStartMin;
      setBreakfastEnd(minutesToTime(newBreakfastEndMin));
      setTimeout(() => {
        prevBreakfastEnd.current = newBreakfastEndMin;
      }, 0);
    }

    // Adjust lunch end -> adjust dinner start (next meal)
    if (lunchEndChanged) {
      const newDinnerStartMin = lunchEndMin;
      setDinnerStart(minutesToTime(newDinnerStartMin));
      setTimeout(() => {
        prevDinnerStart.current = newDinnerStartMin;
      }, 0);
    }

    // Adjust dinner start -> adjust lunch end (previous meal)
    if (dinnerStartChanged) {
      const newLunchEndMin = dinnerStartMin;
      setLunchEnd(minutesToTime(newLunchEndMin));
      setTimeout(() => {
        prevLunchEnd.current = newLunchEndMin;
      }, 0);
    }

    // Adjust dinner end -> adjust breakfast start (next meal, may cross midnight)
    if (dinnerEndChanged) {
      const newBreakfastStartMin = dinnerEndMin;
      setBreakfastStart(minutesToTime(newBreakfastStartMin));
      setTimeout(() => {
        prevBreakfastStart.current = newBreakfastStartMin;
      }, 0);
    }

    // Allow React to process state updates before clearing the flag
    setTimeout(() => {
      setIsAdjusting(false);
    }, 0);
  }, [breakfastStart, breakfastEnd, lunchStart, lunchEnd, dinnerStart, dinnerEnd, isAdjusting]);

  // Update profile mutation
  const updateProfile = useMutation({
    mutationFn: async (data: Partial<UserProfile>) => {
      const client = createApiClient();
      const response = await client.PATCH("/profile", data);
      if (response.error) {
        console.error("Profile update error:", response.error);
        throw new Error("Failed to update profile");
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      Alert.alert("Éxito", "Parámetros de tratamiento actualizados correctamente");
      navigation.goBack();
    },
    onError: () => {
      Alert.alert("Error", "No se pudo actualizar los parámetros de tratamiento");
    },
  });

  const handleSave = () => {
    // Validate Insulin Parameters
    const icBreakfastNum = parseFloat(icRatioBreakfast);
    const icLunchNum = parseFloat(icRatioLunch);
    const icDinnerNum = parseFloat(icRatioDinner);
    const sensitivityNum = parseFloat(insulinSensitivityFactor);
    const diaNum = parseFloat(diaHours);

    if (isNaN(icBreakfastNum) || icBreakfastNum < 1 || icBreakfastNum > 30) {
      Alert.alert("Error", "Ratio IC Desayuno debe estar entre 1 y 30");
      return;
    }
    if (isNaN(icLunchNum) || icLunchNum < 1 || icLunchNum > 30) {
      Alert.alert("Error", "Ratio IC Almuerzo debe estar entre 1 y 30");
      return;
    }
    if (isNaN(icDinnerNum) || icDinnerNum < 1 || icDinnerNum > 30) {
      Alert.alert("Error", "Ratio IC Cena debe estar entre 1 y 30");
      return;
    }
    if (isNaN(sensitivityNum) || sensitivityNum < 10 || sensitivityNum > 200) {
      Alert.alert("Error", "Factor de Sensibilidad debe estar entre 10 y 200");
      return;
    }
    if (isNaN(diaNum) || diaNum < 2 || diaNum > 8) {
      Alert.alert("Error", "Duración de Acción de Insulina debe estar entre 2 y 8 horas");
      return;
    }

    // Validate Target Glucose Ranges
    const targetNum = targetGlucose ? parseInt(targetGlucose, 10) : undefined;
    const minTargetNum = parseInt(minTargetGlucose, 10);
    const maxTargetNum = parseInt(maxTargetGlucose, 10);

    if (targetNum !== undefined && (isNaN(targetNum) || targetNum < 70 || targetNum > 180)) {
      Alert.alert("Error", "Glucosa Objetivo debe estar entre 70 y 180 mg/dL");
      return;
    }
    if (isNaN(minTargetNum) || minTargetNum < 70 || minTargetNum > 150) {
      Alert.alert("Error", "Glucosa Objetivo Mínima debe estar entre 70 y 150 mg/dL");
      return;
    }
    if (isNaN(maxTargetNum) || maxTargetNum < 80 || maxTargetNum > 200) {
      Alert.alert("Error", "Glucosa Objetivo Máxima debe estar entre 80 y 200 mg/dL");
      return;
    }
    if (minTargetNum >= maxTargetNum) {
      Alert.alert("Error", "La glucosa objetivo mínima debe ser menor que la máxima");
      return;
    }

    // Validate Meal Times
    if (
      !breakfastStart ||
      !breakfastEnd ||
      !lunchStart ||
      !lunchEnd ||
      !dinnerStart ||
      !dinnerEnd
    ) {
      Alert.alert("Error", "Por favor completa todos los horarios de comidas");
      return;
    }

    const breakfastStartMinutes = timeToMinutes(breakfastStart);
    const breakfastEndMinutes = timeToMinutes(breakfastEnd);
    const lunchStartMinutes = timeToMinutes(lunchStart);
    const lunchEndMinutes = timeToMinutes(lunchEnd);
    const dinnerStartMinutes = timeToMinutes(dinnerStart);
    const dinnerEndMinutes = timeToMinutes(dinnerEnd);

    // Validate time ranges
    if (breakfastStartMinutes >= breakfastEndMinutes) {
      Alert.alert("Error", "La hora de inicio de desayuno debe ser anterior a la hora de fin");
      return;
    }
    if (lunchStartMinutes >= lunchEndMinutes) {
      Alert.alert("Error", "La hora de inicio de almuerzo debe ser anterior a la hora de fin");
      return;
    }
    // Dinner can cross midnight, so if end is before start, it's valid (crosses midnight)
    // But if end is after start, ensure it's a reasonable range
    if (
      dinnerStartMinutes >= dinnerEndMinutes &&
      dinnerEndMinutes >= 0 &&
      dinnerStartMinutes < 1439
    ) {
      // This is valid - dinner crosses midnight
    } else if (dinnerStartMinutes >= dinnerEndMinutes) {
      Alert.alert("Error", "Por favor verifica los horarios de cena");
      return;
    }

    // Prepare update data
    const updateData: Partial<UserProfile> = {
      icRatioBreakfast: icBreakfastNum,
      icRatioLunch: icLunchNum,
      icRatioDinner: icDinnerNum,
      insulinSensitivityFactor: sensitivityNum,
      diaHours: diaNum,
      targetGlucose: targetNum,
      minTargetGlucose: minTargetNum,
      maxTargetGlucose: maxTargetNum,
      mealTimeBreakfastStart: breakfastStartMinutes,
      mealTimeBreakfastEnd: breakfastEndMinutes,
      mealTimeLunchStart: lunchStartMinutes,
      mealTimeLunchEnd: lunchEndMinutes,
      mealTimeDinnerStart: dinnerStartMinutes,
      mealTimeDinnerEnd: dinnerEndMinutes,
    };

    updateProfile.mutate(updateData);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Parámetros de Tratamiento</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Insulin Parameters Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Syringe size={20} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Parámetros de Insulina</Text>
          </View>

          <View style={styles.fieldRow}>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Ratio IC Desayuno (g/U)</Text>
              <Text style={styles.fieldDescription}>
                Gramos de carbohidratos por 1 unidad de insulina
              </Text>
              <TextInput
                style={styles.fieldInput}
                value={icRatioBreakfast}
                onChangeText={setIcRatioBreakfast}
                placeholder="15"
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={styles.fieldRow}>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Ratio IC Almuerzo (g/U)</Text>
              <Text style={styles.fieldDescription}>
                Gramos de carbohidratos por 1 unidad de insulina
              </Text>
              <TextInput
                style={styles.fieldInput}
                value={icRatioLunch}
                onChangeText={setIcRatioLunch}
                placeholder="12"
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={styles.fieldRow}>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Ratio IC Cena (g/U)</Text>
              <Text style={styles.fieldDescription}>
                Gramos de carbohidratos por 1 unidad de insulina
              </Text>
              <TextInput
                style={styles.fieldInput}
                value={icRatioDinner}
                onChangeText={setIcRatioDinner}
                placeholder="10"
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={styles.fieldRow}>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Factor de Sensibilidad (mg/dL/U)</Text>
              <Text style={styles.fieldDescription}>
                Reducción de glucosa en mg/dL por 1 unidad de insulina
              </Text>
              <TextInput
                style={styles.fieldInput}
                value={insulinSensitivityFactor}
                onChangeText={setInsulinSensitivityFactor}
                placeholder="50"
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={styles.fieldRow}>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Duración de Acción de Insulina (horas)</Text>
              <Text style={styles.fieldDescription}>Tiempo que la insulina permanece activa</Text>
              <TextInput
                style={styles.fieldInput}
                value={diaHours}
                onChangeText={setDiaHours}
                placeholder="4"
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        </View>

        {/* Target Glucose Ranges Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Target size={20} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Rangos Objetivo de Glucosa</Text>
          </View>

          <View style={styles.fieldRow}>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Glucosa Objetivo (mg/dL)</Text>
              <Text style={styles.fieldDescription}>Valor objetivo de glucosa al corregir</Text>
              <TextInput
                style={styles.fieldInput}
                value={targetGlucose}
                onChangeText={setTargetGlucose}
                placeholder="100"
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={styles.fieldRow}>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Glucosa Objetivo Mínima (mg/dL)</Text>
              <Text style={styles.fieldDescription}>Límite inferior del rango objetivo</Text>
              <TextInput
                style={styles.fieldInput}
                value={minTargetGlucose}
                onChangeText={setMinTargetGlucose}
                placeholder="80"
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={styles.fieldRow}>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Glucosa Objetivo Máxima (mg/dL)</Text>
              <Text style={styles.fieldDescription}>Límite superior del rango objetivo</Text>
              <TextInput
                style={styles.fieldInput}
                value={maxTargetGlucose}
                onChangeText={setMaxTargetGlucose}
                placeholder="140"
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="number-pad"
              />
            </View>
          </View>
        </View>

        {/* Meal Times Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clock size={20} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Horarios de Comidas</Text>
          </View>

          {/* Breakfast */}
          <Text style={styles.mealTypeLabel}>Desayuno</Text>
          <View style={styles.fieldRow}>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Hora de Inicio</Text>
              <TouchableOpacity
                onPress={() => setShowBreakfastStartPicker(true)}
                style={styles.timePickerButton}
              >
                <Text style={styles.timePickerText}>
                  {breakfastStart
                    ? formatTimeFromMinutes(timeToMinutes(breakfastStart))
                    : "Seleccionar hora"}
                </Text>
                <ChevronRight size={20} color={theme.colors.textTertiary} />
              </TouchableOpacity>
            </View>
          </View>
          <CustomDateTimePicker
            value={breakfastStart}
            onDateChange={(date) => {
              if (date) {
                const extracted = extractTimeFromPicker(date);
                setBreakfastStart(extracted);
              }
              setShowBreakfastStartPicker(false);
            }}
            mode="time"
            visible={showBreakfastStartPicker}
            showButton={false}
          />

          <View style={styles.fieldRow}>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Hora de Fin</Text>
              <TouchableOpacity
                onPress={() => setShowBreakfastEndPicker(true)}
                style={styles.timePickerButton}
              >
                <Text style={styles.timePickerText}>
                  {breakfastEnd
                    ? formatTimeFromMinutes(timeToMinutes(breakfastEnd))
                    : "Seleccionar hora"}
                </Text>
                <ChevronRight size={20} color={theme.colors.textTertiary} />
              </TouchableOpacity>
            </View>
          </View>
          <CustomDateTimePicker
            value={breakfastEnd}
            onDateChange={(date) => {
              if (date) {
                const extracted = extractTimeFromPicker(date);
                setBreakfastEnd(extracted);
              }
              setShowBreakfastEndPicker(false);
            }}
            mode="time"
            visible={showBreakfastEndPicker}
            showButton={false}
          />

          {/* Lunch */}
          <Text style={styles.mealTypeLabel}>Almuerzo</Text>
          <View style={styles.fieldRow}>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Hora de Inicio</Text>
              <TouchableOpacity
                onPress={() => setShowLunchStartPicker(true)}
                style={styles.timePickerButton}
              >
                <Text style={styles.timePickerText}>
                  {lunchStart
                    ? formatTimeFromMinutes(timeToMinutes(lunchStart))
                    : "Seleccionar hora"}
                </Text>
                <ChevronRight size={20} color={theme.colors.textTertiary} />
              </TouchableOpacity>
            </View>
          </View>
          <CustomDateTimePicker
            value={lunchStart}
            onDateChange={(date) => {
              if (date) {
                const extracted = extractTimeFromPicker(date);
                setLunchStart(extracted);
              }
              setShowLunchStartPicker(false);
            }}
            mode="time"
            visible={showLunchStartPicker}
            showButton={false}
          />

          <View style={styles.fieldRow}>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Hora de Fin</Text>
              <TouchableOpacity
                onPress={() => setShowLunchEndPicker(true)}
                style={styles.timePickerButton}
              >
                <Text style={styles.timePickerText}>
                  {lunchEnd ? formatTimeFromMinutes(timeToMinutes(lunchEnd)) : "Seleccionar hora"}
                </Text>
                <ChevronRight size={20} color={theme.colors.textTertiary} />
              </TouchableOpacity>
            </View>
          </View>
          <CustomDateTimePicker
            value={lunchEnd}
            onDateChange={(date) => {
              if (date) {
                const extracted = extractTimeFromPicker(date);
                setLunchEnd(extracted);
              }
              setShowLunchEndPicker(false);
            }}
            mode="time"
            visible={showLunchEndPicker}
            showButton={false}
          />

          {/* Dinner */}
          <Text style={styles.mealTypeLabel}>Cena</Text>
          <View style={styles.fieldRow}>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Hora de Inicio</Text>
              <TouchableOpacity
                onPress={() => setShowDinnerStartPicker(true)}
                style={styles.timePickerButton}
              >
                <Text style={styles.timePickerText}>
                  {dinnerStart
                    ? formatTimeFromMinutes(timeToMinutes(dinnerStart))
                    : "Seleccionar hora"}
                </Text>
                <ChevronRight size={20} color={theme.colors.textTertiary} />
              </TouchableOpacity>
            </View>
          </View>
          <CustomDateTimePicker
            value={dinnerStart}
            onDateChange={(date) => {
              if (date) {
                const extracted = extractTimeFromPicker(date);
                setDinnerStart(extracted);
              }
              setShowDinnerStartPicker(false);
            }}
            mode="time"
            visible={showDinnerStartPicker}
            showButton={false}
          />

          <View style={styles.fieldRow}>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Hora de Fin</Text>
              <TouchableOpacity
                onPress={() => setShowDinnerEndPicker(true)}
                style={styles.timePickerButton}
              >
                <Text style={styles.timePickerText}>
                  {dinnerEnd ? formatTimeFromMinutes(timeToMinutes(dinnerEnd)) : "Seleccionar hora"}
                </Text>
                <ChevronRight size={20} color={theme.colors.textTertiary} />
              </TouchableOpacity>
            </View>
          </View>
          <CustomDateTimePicker
            value={dinnerEnd}
            onDateChange={(date) => {
              if (date) {
                const extracted = extractTimeFromPicker(date);
                setDinnerEnd(extracted);
              }
              setShowDinnerEndPicker(false);
            }}
            mode="time"
            visible={showDinnerEndPicker}
            showButton={false}
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, updateProfile.isPending && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={updateProfile.isPending}
        >
          {updateProfile.isPending ? (
            <ActivityIndicator color={theme.colors.background} />
          ) : (
            <Text style={styles.saveButtonText}>Guardar cambios</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
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
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xxl,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: "bold",
    color: theme.colors.text,
    flex: 1,
    textAlign: "center",
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xxxl,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: "600",
    color: theme.colors.text,
  },
  fieldRow: {
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  fieldContent: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: "500",
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  fieldDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  fieldInput: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    fontWeight: "500",
    padding: 0,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: theme.spacing.xs,
  },
  mealTypeLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  timePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: 0,
  },
  timePickerText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    fontWeight: "500",
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: theme.spacing.xl,
    shadowColor: theme.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.md,
    fontWeight: "600",
  },
});
