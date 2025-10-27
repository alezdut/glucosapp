import React, { useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { Trash2 } from "lucide-react-native";
import { theme } from "../theme";
import type { FoodListItem as FoodListItemType } from "@glucosapp/types";

const SCREEN_WIDTH = Dimensions.get("window").width;

interface FoodListItemProps {
  item: FoodListItemType;
  onDelete: () => void;
  onPress?: () => void;
  isSelected?: boolean;
}

/**
 * Component to display a food item with quantity and swipe-to-delete
 */
export default function FoodListItem({
  item,
  onDelete,
  onPress,
  isSelected = false,
}: FoodListItemProps) {
  const swipeableRef = useRef<Swipeable>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = () => {
    if (isDeleting) return;

    setIsDeleting(true);
    swipeableRef.current?.close();

    // Animate slide to left
    Animated.timing(slideAnim, {
      toValue: -SCREEN_WIDTH,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onDelete();
    });
  };

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
  ) => {
    const trans = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [0, 100],
      extrapolate: "clamp",
    });

    return (
      <Animated.View
        style={[
          styles.deleteAction,
          {
            transform: [{ translateX: trans }],
          },
        ]}
      >
        <TouchableOpacity style={styles.deleteActionButton} onPress={handleDelete}>
          <Trash2 size={24} color="#FFFFFF" />
          <Text style={styles.deleteActionText}>Eliminar</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <Animated.View
      style={{
        transform: [{ translateX: slideAnim }],
      }}
    >
      <Swipeable
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        overshootRight={false}
        rightThreshold={40}
      >
        <TouchableOpacity
          style={[styles.container, isSelected && styles.containerSelected]}
          onPress={onPress}
          activeOpacity={0.7}
        >
          <View style={styles.content}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.details}>
              {item.quantity} g • {item.carbohydrates.toFixed(2)} g carbohidratos
            </Text>
          </View>
        </TouchableOpacity>
      </Swipeable>
    </Animated.View>
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
  containerSelected: {
    backgroundColor: theme.colors.primary + "15",
    borderColor: theme.colors.primary,
    borderWidth: 2,
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
  deleteAction: {
    backgroundColor: theme.colors.error,
    justifyContent: "center",
    alignItems: "flex-end",
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    overflow: "hidden",
  },
  deleteActionButton: {
    justifyContent: "center",
    alignItems: "center",
    width: 100,
    height: "100%",
    paddingHorizontal: theme.spacing.md,
  },
  deleteActionText: {
    color: "#FFFFFF",
    fontSize: theme.fontSize.sm,
    fontWeight: "600",
    marginTop: theme.spacing.xs,
  },
});
