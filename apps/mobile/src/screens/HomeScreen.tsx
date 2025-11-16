import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Activity, Beaker, UtensilsCrossed, Nfc } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { theme } from "../theme";
import { createApiClient } from "../lib/api";
import type { Statistics } from "@glucosapp/types";
import type { HomeStackParamList } from "../navigation/HomeStackNavigator";
import type { RootStackParamList, RootTabParamList } from "../navigation/types";
import { BrandLogo } from "../components/BrandLogo";

type HomeScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<HomeStackParamList, "Home">,
  CompositeNavigationProp<
    BottomTabNavigationProp<RootTabParamList>,
    NativeStackNavigationProp<RootStackParamList>
  >
>;

/**
 * HomeScreen component - Display statistics and main actions
 */
export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  // Fetch statistics
  const {
    data: statistics,
    isLoading,
    error,
  } = useQuery<Statistics>({
    queryKey: ["statistics"],
    queryFn: async () => {
      const client = createApiClient();
      const response = await client.GET("/statistics/summary", {});
      if (response.error) {
        throw new Error("Failed to fetch statistics");
      }
      return response.data as unknown as Statistics;
    },
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + theme.spacing.lg }]}
    >
      {/* Floating NFC Scan Button (top-right) */}
      <TouchableOpacity
        style={[
          styles.floatingNfcButton,
          { top: insets.top + theme.spacing.md, right: insets.right + theme.spacing.lg },
        ]}
        onPress={() => navigation.navigate("NFCScan")}
        accessibilityRole="button"
        accessibilityLabel="Escanear sensor por NFC"
        activeOpacity={0.85}
      >
        <Nfc size={32} color={theme.colors.secondary} strokeWidth={2} />
      </TouchableOpacity>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoWrapper}>
          <BrandLogo size={100} accessibilityLabel="GlucosApp logo" />
        </View>
        <Text style={styles.appName}>GlucosApp</Text>
        <Text style={styles.tagline}>Tu control, más simple cada día</Text>
      </View>

      {/* Statistics Cards */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error al cargar estadísticas</Text>
        </View>
      ) : (
        <View style={styles.statsContainer}>
          {/* Average Glucose Card */}
          <View style={styles.statCard}>
            <Activity size={32} color={theme.colors.background} style={styles.statIcon} />
            <Text style={styles.statValue}>{statistics?.averageGlucose || 0} mg/dL</Text>
            <Text style={styles.statLabel}>Glucosa Media</Text>
          </View>

          {/* Daily Insulin Dose Card */}
          <View style={styles.statCard}>
            <Beaker size={32} color={theme.colors.background} style={styles.statIcon} />
            <Text style={styles.statValue}>{statistics?.dailyInsulinDose || 0} U</Text>
            <Text style={styles.statLabel}>Dosis Diaria Total</Text>
          </View>

          {/* Meals Registered Card */}
          <View style={styles.statCard}>
            <UtensilsCrossed size={32} color={theme.colors.background} style={styles.statIcon} />
            <Text style={styles.statValue}>{statistics?.mealsRegistered || 0} comidas</Text>
            <Text style={styles.statLabel}>Comidas Registradas</Text>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate("Calculator")}
        >
          <Text style={styles.primaryButtonText}>Calcular Carbohidratos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.outlinedButton}
          onPress={() => navigation.getParent()?.navigate("Historial")}
        >
          <Text style={styles.outlinedButtonText}>Ver historial</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  header: {
    alignItems: "center",
    marginBottom: theme.spacing.xl,
  },
  logoWrapper: {
    marginBottom: -theme.spacing.xs,
  },
  appName: {
    fontSize: theme.fontSize.xxl,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  tagline: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  loadingContainer: {
    paddingVertical: theme.spacing.xxxl,
    alignItems: "center",
  },
  errorContainer: {
    paddingVertical: theme.spacing.xl,
    alignItems: "center",
  },
  errorText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.error,
    textAlign: "center",
  },
  statsContainer: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    shadowColor: theme.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statCard: {
    alignItems: "center",
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.2)",
  },
  statIcon: {
    marginBottom: theme.spacing.sm,
  },
  statValue: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: "bold",
    color: theme.colors.background,
    marginBottom: theme.spacing.xs,
  },
  statLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.background,
    opacity: 0.9,
  },
  actionsContainer: {
    gap: theme.spacing.md,
  },
  floatingNfcButton: {
    position: "absolute",
    top: theme.spacing.md,
    right: theme.spacing.lg,
    zIndex: 10,
    padding: theme.spacing.md,
    borderRadius: 28,
    backgroundColor: "transparent",
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.lg,
    fontWeight: "600",
  },
  nfcButton: {
    backgroundColor: theme.colors.success || "#10B981",
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
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
  nfcButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.lg,
    fontWeight: "600",
  },
  outlinedButton: {
    backgroundColor: "transparent",
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  outlinedButtonText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.lg,
    fontWeight: "600",
  },
});
