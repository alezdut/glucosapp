import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Trash2 } from "lucide-react-native";
import { theme } from "../theme";
import type { FoodListItem as FoodListItemType } from "@glucosapp/types";

interface FoodListItemProps {
  item: FoodListItemType;
  onDelete: () => void;
}

/**
 * Component to display a food item with quantity and delete button
 */
export default function FoodListItem({ item, onDelete }: FoodListItemProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.details}>
          {item.quantity} g • {item.carbohydrates.toFixed(1)} g carbohidratos
        </Text>
      </View>
      <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
        <Trash2 size={20} color={theme.colors.error} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: theme.fontSize.md,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  details: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  deleteButton: {
    padding: theme.spacing.sm,
  },
});
