import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "../theme";

/**
 * DoctorScreen component - Placeholder for doctor/medical functionality
 */
export default function DoctorScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Médico</Text>
      <Text style={styles.subtitle}>Información médica y reportes</Text>
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
