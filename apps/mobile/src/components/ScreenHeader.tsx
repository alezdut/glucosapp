import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { theme } from "../theme";

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
}

/**
 * Reusable screen header component with standardized spacing
 */
export default function ScreenHeader({ title, subtitle, onBack }: ScreenHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <ChevronLeft size={28} color={theme.colors.primary} />
          </TouchableOpacity>
        )}
        <Text style={[styles.title, onBack && styles.titleWithBack]}>{title}</Text>
      </View>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.xl,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    marginRight: theme.spacing.sm,
    marginLeft: -theme.spacing.xs,
  },
  title: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  titleWithBack: {
    flex: 1,
  },
  subtitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: "600",
    color: theme.colors.text,
  },
});
