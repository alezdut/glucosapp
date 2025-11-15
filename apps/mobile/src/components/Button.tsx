import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacityProps,
} from "react-native";
import { theme } from "../theme";

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: "primary" | "secondary" | "outlined";
  loading?: boolean;
  icon?: React.ReactNode;
}

/**
 * Reusable button component with primary and outlined variants
 */
export default function Button({
  title,
  variant = "primary",
  loading,
  icon,
  style,
  disabled,
  ...props
}: ButtonProps) {
  const isPrimary = variant === "primary";
  const isSecondary = variant === "secondary";
  const isOutlined = variant === "outlined";

  const buttonStyle = isPrimary
    ? styles.primaryButton
    : isSecondary
      ? styles.secondaryButton
      : styles.outlinedButton;

  const textStyle = isPrimary
    ? styles.primaryButtonText
    : isSecondary
      ? styles.secondaryButtonText
      : styles.outlinedButtonText;

  const loadingColor = isOutlined ? theme.colors.primary : theme.colors.background;

  return (
    <TouchableOpacity
      style={[styles.button, buttonStyle, (disabled || loading) && styles.buttonDisabled, style]}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={loadingColor} />
      ) : (
        <>
          {icon}
          <Text
            style={[styles.buttonText, textStyle, (disabled || loading) && styles.textDisabled]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    shadowColor: theme.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  secondaryButton: {
    backgroundColor: theme.colors.secondary,
    shadowColor: theme.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  outlinedButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  buttonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: "600",
  },
  primaryButtonText: {
    color: theme.colors.background,
  },
  secondaryButtonText: {
    color: theme.colors.background,
  },
  outlinedButtonText: {
    color: theme.colors.primary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  textDisabled: {
    opacity: 0.7,
  },
});
