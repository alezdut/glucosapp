import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "../theme";

/**
 * HistoryScreen component - Placeholder for history functionality
 */
export default function HistoryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Historial</Text>
      <Text style={styles.subtitle}>Ver tu historial de registros</Text>
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
