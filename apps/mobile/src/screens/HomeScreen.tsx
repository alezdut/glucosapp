import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Camera } from "lucide-react-native";
import { theme } from "../theme";

export default function HomeScreen() {
  const handleScanPress = () => {
    // TODO: Navigate to scan screen or open camera
    console.log("Scan button pressed");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Resumen diario</Text>

      <TouchableOpacity style={styles.scanButton} onPress={handleScanPress}>
        <Camera size={24} color={theme.colors.background} />
        <Text style={styles.scanButtonText}>Escanear</Text>
      </TouchableOpacity>
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
    marginBottom: theme.spacing.xxl,
    textAlign: "center",
  },
  scanButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.sm,
    shadowColor: theme.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scanButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.lg,
    fontWeight: "600",
  },
});
