import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { theme } from "../theme";
import { useAuth } from "../contexts/AuthContext";

/**
 * OnboardingScreen component
 * Allows user to confirm/update their profile details after first sign in
 */
export default function OnboardingScreen() {
  const { user, updateUserProfile, completeOnboarding, isLoading } = useAuth();

  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleContinue = async () => {
    // Validate inputs
    if (!firstName.trim()) {
      Alert.alert("Error", "Por favor ingresa tu nombre");
      return;
    }

    if (!lastName.trim()) {
      Alert.alert("Error", "Por favor ingresa tu apellido");
      return;
    }

    try {
      setIsSaving(true);
      await updateUserProfile(firstName.trim(), lastName.trim());
      completeOnboarding();
    } catch (error) {
      Alert.alert("Error", "No se pudo actualizar tu perfil. Por favor intenta de nuevo.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Completa tu perfil</Text>
          <Text style={styles.subtitle}>Ayúdanos a personalizar tu experiencia</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nombre</Text>
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Ingresa tu nombre"
              placeholderTextColor={theme.colors.textTertiary}
              autoCapitalize="words"
              autoCorrect={false}
              editable={!isSaving}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Apellido</Text>
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Ingresa tu apellido"
              placeholderTextColor={theme.colors.textTertiary}
              autoCapitalize="words"
              autoCorrect={false}
              editable={!isSaving}
            />
          </View>

          {/* Email display (read-only) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Correo electrónico</Text>
            <View style={[styles.input, styles.inputReadOnly]}>
              <Text style={styles.inputReadOnlyText}>{user?.email}</Text>
            </View>
          </View>
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={[styles.continueButton, (isSaving || isLoading) && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={isSaving || isLoading}
        >
          {isSaving || isLoading ? (
            <ActivityIndicator color={theme.colors.background} />
          ) : (
            <Text style={styles.continueButtonText}>Continuar</Text>
          )}
        </TouchableOpacity>

        {/* Info text */}
        <Text style={styles.infoText}>Podrás cambiar esta información más tarde en tu perfil</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xxxl,
    paddingBottom: theme.spacing.xl,
  },
  header: {
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  form: {
    marginBottom: theme.spacing.xl,
  },
  inputGroup: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontSize: theme.fontSize.sm,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
  },
  inputReadOnly: {
    backgroundColor: theme.colors.backgroundGray,
    justifyContent: "center",
  },
  inputReadOnlyText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  continueButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.md,
    shadowColor: theme.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  continueButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.lg,
    fontWeight: "600",
  },
  infoText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
});
