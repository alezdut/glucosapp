import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  TouchableWithoutFeedback,
  Image,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  User as UserIcon,
  Cake,
  Weight,
  Syringe,
  Scale,
  Palette,
  Globe,
  HelpCircle,
  Shield,
  FileText,
  LogOut,
  ChevronRight,
  Calendar,
} from "lucide-react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { theme } from "../theme";
import { createApiClient } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { type UserProfile, DiabetesType, GlucoseUnit, Theme, Language } from "@glucosapp/types";

/**
 * Translate enum values to Spanish for display
 */
function translateTheme(themeValue: Theme): string {
  return themeValue === Theme.DARK ? "Oscuro" : "Claro";
}

function translateDiabetesType(type: DiabetesType): string {
  return type === DiabetesType.TYPE_1 ? "Tipo 1" : "Tipo 2";
}

function translateGlucoseUnit(unit: GlucoseUnit): string {
  return unit === GlucoseUnit.MG_DL ? "mg/dL" : "mmol/L";
}

function translateLanguage(lang: Language): string {
  return lang === Language.ES ? "Español" : "English";
}

/**
 * ProfileScreen component - Display and edit user profile
 */
/**
 * Calculate age from date of birth
 */
function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();

  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [weight, setWeight] = useState("");
  const [diabetesType, setDiabetesType] = useState<DiabetesType | null>(null);

  // Fetch profile
  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ["profile"],
    queryFn: async () => {
      const client = createApiClient();
      const response = await client.GET("/profile", {});
      if (response.error) {
        throw new Error("Failed to fetch profile");
      }
      const data = response.data as UserProfile;
      // Update local state with fetched data
      if (data.birthDate) {
        setBirthDate(new Date(data.birthDate));
      }
      if (data.weight) setWeight(data.weight.toString());
      if (data.diabetesType) setDiabetesType(data.diabetesType);
      return data;
    },
  });

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
      Alert.alert("Éxito", "Perfil actualizado correctamente");
    },
    onError: () => {
      Alert.alert("Error", "No se pudo actualizar el perfil");
    },
  });

  const handleDateChange = (_event: unknown, selectedDate?: Date) => {
    // En Android, el picker se cierra automáticamente
    // En iOS, lo mantenemos abierto hasta que el usuario confirme o cierre manualmente
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }

    if (selectedDate) {
      setBirthDate(selectedDate);
      // No calculamos la edad aquí, solo actualizamos la fecha seleccionada
    }
  };

  const handleCloseDatePicker = () => {
    setShowDatePicker(false);
  };

  const handleSaveProfile = () => {
    const normalized = weight ? weight.trim().replace(",", ".") : "";
    const parsed = normalized ? parseFloat(normalized) : NaN;
    const weightNum = !isNaN(parsed) ? parsed : undefined;
    const isValidWeight = weightNum !== undefined;

    // Validate birthDate (only if not already saved)
    if (!profile?.birthDate && birthDate === null) {
      Alert.alert("Error", "Por favor selecciona tu fecha de nacimiento");
      return;
    }

    // Validar que la fecha de nacimiento resulte en una edad válida
    if (!profile?.birthDate && birthDate !== null) {
      const calculatedAge = calculateAge(birthDate);
      if (calculatedAge < 1 || calculatedAge > 120) {
        Alert.alert("Error", "La edad debe estar entre 1 y 120 años");
        return;
      }
    }

    // Validate diabetes type (only if not already saved)
    if (!profile?.diabetesType && !diabetesType) {
      Alert.alert("Error", "Por favor selecciona tu tipo de diabetes");
      return;
    }

    // Validate weight input if provided
    if (weight && !isValidWeight) {
      Alert.alert("Error", "Por favor ingresa un peso válido");
      return;
    }

    if (weightNum && (weightNum < 20 || weightNum > 300)) {
      Alert.alert("Error", "El peso debe estar entre 20 y 300 kg");
      return;
    }

    // Only include fields that haven't been saved yet or can be updated
    const updateData: Partial<UserProfile> = {
      weight: weightNum,
    };

    // Only send birthDate if not already saved
    if (!profile?.birthDate && birthDate !== null) {
      updateData.birthDate = birthDate.toISOString();
    }

    // Only send diabetesType if not already saved
    if (!profile?.diabetesType && diabetesType !== null) {
      updateData.diabetesType = diabetesType;
    }

    updateProfile.mutate(updateData);
  };

  const handleLogout = async () => {
    Alert.alert("Cerrar sesión", "¿Estás seguro que deseas cerrar sesión?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Cerrar sesión",
        style: "destructive",
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {profile?.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
          ) : (
            <UserIcon size={40} color={theme.colors.primary} />
          )}
        </View>
        <Text style={styles.title}>Perfil</Text>
      </View>

      {/* Datos Personales */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Datos Personales</Text>

        {/* Name (read-only) */}
        <View style={styles.fieldRow}>
          <View style={styles.fieldIconContainer}>
            <UserIcon size={20} color={theme.colors.textSecondary} />
          </View>
          <View style={styles.fieldContent}>
            <Text style={styles.fieldLabel}>Nombre</Text>
            <Text style={styles.fieldValue}>
              {user?.firstName && user?.lastName
                ? `${user.firstName} ${user.lastName}`
                : user?.email}
            </Text>
          </View>
        </View>

        {/* Age / Date of Birth */}
        {profile?.birthDate ? (
          // Age is already set - display only (read-only)
          <View style={styles.fieldRow}>
            <View style={styles.fieldIconContainer}>
              <Cake size={20} color={theme.colors.textSecondary} />
            </View>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Edad</Text>
              <Text style={styles.fieldValue}>
                {calculateAge(new Date(profile.birthDate))} años
              </Text>
            </View>
          </View>
        ) : (
          // Age not set - allow date selection
          <View style={styles.fieldRow}>
            <View style={styles.fieldIconContainer}>
              <Calendar size={20} color={theme.colors.textSecondary} />
            </View>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Fecha de Nacimiento</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.datePickerText}>
                  {birthDate !== null
                    ? birthDate.toLocaleDateString("es-ES", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "Seleccionar fecha"}
                </Text>
                <Calendar size={16} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Date Picker Modal for iOS */}
        {Platform.OS === "ios" && showDatePicker && (
          <Modal transparent animationType="fade" visible={showDatePicker}>
            <TouchableWithoutFeedback onPress={handleCloseDatePicker}>
              <View style={styles.modalOverlay}>
                <TouchableWithoutFeedback>
                  <View style={styles.datePickerContainer}>
                    <View style={styles.datePickerHeader}>
                      <TouchableOpacity onPress={handleCloseDatePicker}>
                        <Text style={styles.datePickerDoneButton}>Listo</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={birthDate || new Date(2000, 0, 1)}
                      mode="date"
                      display="spinner"
                      onChange={handleDateChange}
                      maximumDate={new Date(2015, 11, 31)}
                      minimumDate={new Date(1900, 0, 1)}
                      style={styles.datePickerIOS}
                    />
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        )}

        {/* Date Picker for Android */}
        {Platform.OS === "android" && showDatePicker && (
          <DateTimePicker
            value={birthDate || new Date(2000, 0, 1)}
            mode="date"
            display="default"
            onChange={handleDateChange}
            maximumDate={new Date(2015, 11, 31)}
            minimumDate={new Date(1900, 0, 1)}
          />
        )}

        {/* Weight */}
        <View style={styles.fieldRow}>
          <View style={styles.fieldIconContainer}>
            <Weight size={20} color={theme.colors.textSecondary} />
          </View>
          <View style={styles.fieldContent}>
            <Text style={styles.fieldLabel}>Peso (kg)</Text>
            <TextInput
              style={styles.fieldInput}
              value={weight}
              onChangeText={setWeight}
              placeholder="60"
              placeholderTextColor={theme.colors.textTertiary}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Diabetes Type */}
        {profile?.diabetesType ? (
          // Diabetes type is already set - display only (read-only)
          <View style={styles.fieldRow}>
            <View style={styles.fieldIconContainer}>
              <Syringe size={20} color={theme.colors.textSecondary} />
            </View>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Tipo de Diabetes</Text>
              <Text style={styles.fieldValue}>{translateDiabetesType(profile.diabetesType)}</Text>
            </View>
          </View>
        ) : (
          // Diabetes type not set - allow selection
          <View style={styles.fieldRow}>
            <View style={styles.fieldIconContainer}>
              <Syringe size={20} color={theme.colors.textSecondary} />
            </View>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Tipo de Diabetes</Text>
              <View style={styles.diabetesTypeContainer}>
                <TouchableOpacity
                  style={[
                    styles.diabetesTypeButton,
                    diabetesType === DiabetesType.TYPE_1 && styles.diabetesTypeButtonActive,
                  ]}
                  onPress={() => setDiabetesType(DiabetesType.TYPE_1)}
                >
                  <Text
                    style={[
                      styles.diabetesTypeText,
                      diabetesType === DiabetesType.TYPE_1 && styles.diabetesTypeTextActive,
                    ]}
                  >
                    Tipo 1
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.diabetesTypeButton,
                    diabetesType === DiabetesType.TYPE_2 && styles.diabetesTypeButtonActive,
                  ]}
                  onPress={() => setDiabetesType(DiabetesType.TYPE_2)}
                >
                  <Text
                    style={[
                      styles.diabetesTypeText,
                      diabetesType === DiabetesType.TYPE_2 && styles.diabetesTypeTextActive,
                    ]}
                  >
                    Tipo 2
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, updateProfile.isPending && styles.saveButtonDisabled]}
          onPress={handleSaveProfile}
          disabled={updateProfile.isPending}
        >
          {updateProfile.isPending ? (
            <ActivityIndicator color={theme.colors.background} />
          ) : (
            <Text style={styles.saveButtonText}>Guardar cambios</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Preferencias */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferencias</Text>

        <View style={styles.fieldRow}>
          <View style={styles.fieldIconContainer}>
            <Scale size={20} color={theme.colors.textSecondary} />
          </View>
          <View style={styles.fieldContent}>
            <Text style={styles.fieldLabel}>Unidades</Text>
            <Text style={styles.fieldValue}>
              {translateGlucoseUnit(profile?.glucoseUnit || GlucoseUnit.MG_DL)}
            </Text>
          </View>
          <ChevronRight size={20} color={theme.colors.textTertiary} />
        </View>

        <View style={styles.fieldRow}>
          <View style={styles.fieldIconContainer}>
            <Palette size={20} color={theme.colors.textSecondary} />
          </View>
          <View style={styles.fieldContent}>
            <Text style={styles.fieldLabel}>Tema Visual</Text>
            <Text style={styles.fieldValue}>{translateTheme(profile?.theme || Theme.LIGHT)}</Text>
          </View>
          <ChevronRight size={20} color={theme.colors.textTertiary} />
        </View>

        <View style={styles.fieldRow}>
          <View style={styles.fieldIconContainer}>
            <Globe size={20} color={theme.colors.textSecondary} />
          </View>
          <View style={styles.fieldContent}>
            <Text style={styles.fieldLabel}>Idioma</Text>
            <Text style={styles.fieldValue}>
              {translateLanguage(profile?.language || Language.ES)}
            </Text>
          </View>
          <ChevronRight size={20} color={theme.colors.textTertiary} />
        </View>
      </View>

      {/* Soporte y Políticas */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Soporte y Políticas</Text>

        <TouchableOpacity style={styles.fieldRow}>
          <View style={styles.fieldIconContainer}>
            <HelpCircle size={20} color={theme.colors.textSecondary} />
          </View>
          <View style={styles.fieldContent}>
            <Text style={styles.fieldLabel}>Centro de Ayuda</Text>
          </View>
          <ChevronRight size={20} color={theme.colors.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.fieldRow}>
          <View style={styles.fieldIconContainer}>
            <Shield size={20} color={theme.colors.textSecondary} />
          </View>
          <View style={styles.fieldContent}>
            <Text style={styles.fieldLabel}>Política de Privacidad</Text>
          </View>
          <ChevronRight size={20} color={theme.colors.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.fieldRow}>
          <View style={styles.fieldIconContainer}>
            <FileText size={20} color={theme.colors.textSecondary} />
          </View>
          <View style={styles.fieldContent}>
            <Text style={styles.fieldLabel}>Términos de Servicio</Text>
          </View>
          <ChevronRight size={20} color={theme.colors.textTertiary} />
        </TouchableOpacity>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <LogOut size={20} color={theme.colors.background} />
        <Text style={styles.logoutButtonText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xxl,
    paddingBottom: theme.spacing.xxxl,
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
    marginBottom: theme.spacing.xl,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.backgroundGray,
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacing.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  title: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: "bold",
    color: theme.colors.text,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  fieldIconContainer: {
    width: 40,
    alignItems: "center",
    marginRight: theme.spacing.sm,
  },
  fieldContent: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  fieldValue: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    fontWeight: "500",
  },
  fieldInput: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    fontWeight: "500",
    padding: 0,
  },
  diabetesTypeContainer: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  diabetesTypeButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  diabetesTypeButtonActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  diabetesTypeText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
  },
  diabetesTypeTextActive: {
    color: theme.colors.background,
    fontWeight: "600",
  },
  datePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    marginTop: theme.spacing.xs,
  },
  datePickerText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  datePickerContainer: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    paddingBottom: theme.spacing.xl,
  },
  datePickerHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  datePickerDoneButton: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.primary,
    fontWeight: "600",
  },
  datePickerIOS: {
    height: 200,
    backgroundColor: theme.colors.background,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: theme.spacing.lg,
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
  logoutButton: {
    backgroundColor: theme.colors.error,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
    shadowColor: theme.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.md,
    fontWeight: "600",
  },
});
