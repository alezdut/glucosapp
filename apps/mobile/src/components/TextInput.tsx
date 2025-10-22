import React from "react";
import { View, Text, TextInput as RNTextInput, StyleSheet, TextInputProps } from "react-native";
import { theme } from "../theme";

interface CustomTextInputProps extends TextInputProps {
  label: string;
  error?: string;
  warning?: string;
  unit?: string;
}

/**
 * Reusable text input component with label and optional unit
 */
export default function TextInput({ label, error, warning, unit, ...props }: CustomTextInputProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputContainer}>
        <RNTextInput
          style={[
            styles.input,
            error && styles.inputError,
            warning && !error && styles.inputWarning,
          ]}
          placeholderTextColor={theme.colors.textSecondary}
          {...props}
        />
        {unit && <Text style={styles.unit}>{unit}</Text>}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
      {warning && !error && <Text style={styles.warningText}>{warning}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
    fontWeight: "600",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  inputWarning: {
    borderColor: theme.colors.warning,
  },
  unit: {
    marginLeft: theme.spacing.sm,
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    fontWeight: "500",
  },
  errorText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
  },
  warningText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.warning,
    marginTop: theme.spacing.xs,
  },
});
