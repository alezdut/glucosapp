import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "../theme";

/**
 * CalculatorScreen component - Placeholder for dose calculator functionality
 */
export default function CalculatorScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Calcular</Text>
      <Text style={styles.subtitle}>Calcular dosis de insulina</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.lg,
  },
  title: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    textAlign: "center",
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
});
