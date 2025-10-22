import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "../theme";

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
}

/**
 * Reusable screen header component with standardized spacing
 */
export default function ScreenHeader({ title, subtitle }: ScreenHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: "600",
    color: theme.colors.text,
  },
});
