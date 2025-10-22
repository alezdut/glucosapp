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
  variant?: "primary" | "outlined";
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
  ...props
}: ButtonProps) {
  const isPrimary = variant === "primary";

  return (
    <TouchableOpacity
      style={[styles.button, isPrimary ? styles.primaryButton : styles.outlinedButton, style]}
      disabled={loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? theme.colors.background : theme.colors.primary} />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.buttonText,
              isPrimary ? styles.primaryButtonText : styles.outlinedButtonText,
            ]}
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
  outlinedButtonText: {
    color: theme.colors.primary,
  },
});
