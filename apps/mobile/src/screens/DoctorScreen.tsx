import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Droplet, Syringe, TrendingUp, Stethoscope, Mail, Info } from "lucide-react-native";
import { theme } from "../theme";
import { createApiClient } from "../lib/api";
import { GlucoseChart, type GlucoseDataPoint } from "../components/GlucoseChart";
import { formatTimeFromMinutes } from "@glucosapp/utils";
import { type UserProfile } from "@glucosapp/types";

const DAY_MS = 24 * 60 * 60 * 1000;

type DoctorInfo = {
  id: string;
  doctorId: string;
  patientId: string;
  createdAt: string;
  doctor: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
  };
};

type WeeklyGlucoseAverage = {
  averageGlucose: number;
};

type DailyInsulinAverage = {
  averageDose: number;
};

type GlucoseTrend = {
  data: Array<{
    date: string;
    averageGlucose: number;
  }>;
};

/**
 * DoctorScreen component - Display doctor information, reports, and treatment parameters
 */
export default function DoctorScreen() {
  const insets = useSafeAreaInsets();

  // Fetch doctor information
  const { data: doctorInfo, isLoading: isLoadingDoctor } = useQuery<DoctorInfo | null>({
    queryKey: ["my-doctor"],
    queryFn: async () => {
      const client = createApiClient();
      console.log("[DoctorScreen] Fetching assigned doctor (patient endpoint)");
      const response = await client.GET("/profile/doctor", {});
      console.log("[DoctorScreen] response:", response);
      if (response.error) {
        console.error(
          "[DoctorScreen] Failed to fetch doctor information (patient endpoint):",
          response.error,
        );
        throw new Error("Failed to fetch doctor information");
      }
      if (!response.data) {
        console.warn("[DoctorScreen] Doctor response has no data");
        return null;
      }
      return response.data as DoctorInfo;
    },
    retry: (failureCount, error) => {
      // Don't retry on 404 (no doctor assigned)
      if (error && typeof error === "object" && "status" in error && error.status === 404) {
        return false;
      }
      return failureCount < 3;
    },
    staleTime: DAY_MS,
    gcTime: DAY_MS,
    refetchOnWindowFocus: false,
  });

  // Fetch profile for treatment parameters and target range
  const { data: profile, isLoading: isLoadingProfile } = useQuery<UserProfile>({
    queryKey: ["profile"],
    queryFn: async () => {
      const client = createApiClient();
      const response = await client.GET("/profile", {});
      if (response.error) {
        throw new Error("Failed to fetch profile");
      }
      if (!response.data) {
        throw new Error("Profile data is missing");
      }
      return response.data as UserProfile;
    },
    staleTime: DAY_MS,
    gcTime: DAY_MS,
    refetchOnWindowFocus: false,
  });

  // Fetch weekly glucose average
  const { data: weeklyGlucose, isLoading: isLoadingWeeklyGlucose } = useQuery<WeeklyGlucoseAverage>(
    {
      queryKey: ["weekly-glucose-average"],
      queryFn: async () => {
        const client = createApiClient();
        const response = await client.GET("/statistics/weekly-glucose-average", {});
        if (response.error) {
          throw new Error("Failed to fetch weekly glucose average");
        }
        if (!response.data) {
          throw new Error("Weekly glucose data is missing");
        }
        return response.data as WeeklyGlucoseAverage;
      },
      staleTime: DAY_MS,
      gcTime: DAY_MS,
      refetchOnWindowFocus: false,
    },
  );

  // Fetch daily insulin average
  const { data: dailyInsulin, isLoading: isLoadingDailyInsulin } = useQuery<DailyInsulinAverage>({
    queryKey: ["daily-insulin-average"],
    queryFn: async () => {
      const client = createApiClient();
      const response = await client.GET("/statistics/daily-insulin-average", {});
      if (response.error) {
        throw new Error("Failed to fetch daily insulin average");
      }
      if (!response.data) {
        throw new Error("Daily insulin data is missing");
      }
      return response.data as DailyInsulinAverage;
    },
    staleTime: DAY_MS,
    gcTime: DAY_MS,
    refetchOnWindowFocus: false,
  });

  // Fetch daily glucose averages for the last week (from backend)
  const { data: glucoseTrend, isLoading: isLoadingTrend } = useQuery<GlucoseTrend>({
    queryKey: ["glucose-trend"],
    queryFn: async () => {
      const client = createApiClient();
      const response = await client.GET("/statistics/glucose-trend", {});
      if (response.error) {
        throw new Error("Failed to fetch glucose trend");
      }
      if (!response.data) {
        throw new Error("Glucose trend data is missing");
      }
      return response.data as GlucoseTrend;
    },
    staleTime: DAY_MS,
    gcTime: DAY_MS,
    refetchOnWindowFocus: false,
  });

  const isLoading =
    isLoadingDoctor ||
    isLoadingWeeklyGlucose ||
    isLoadingDailyInsulin ||
    isLoadingTrend ||
    isLoadingProfile;
  const hasDoctor = !!doctorInfo;

  // Transform glucose trend data from backend (daily averages for last 7 days)
  const chartData: GlucoseDataPoint[] = React.useMemo(() => {
    if (!glucoseTrend?.data || glucoseTrend.data.length === 0) return [];

    return glucoseTrend.data
      .map((point) => {
        // Parse date string (YYYY-MM-DD) and set to noon for consistent positioning
        const [year, month, day] = point.date.split("-").map(Number);
        const date = new Date(year, month - 1, day, 12, 0, 0, 0);

        if (isNaN(date.getTime())) return null;

        return {
          timestamp: date,
          glucose: point.averageGlucose,
        };
      })
      .filter((point): point is GlucoseDataPoint => point !== null);
  }, [glucoseTrend]);

  // Get target glucose range for chart
  const targetRange = profile
    ? {
        min: profile.minTargetGlucose ?? 80,
        max: profile.maxTargetGlucose ?? 140,
      }
    : undefined;

  // Format doctor assignment date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + theme.spacing.xl }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Doctor y Parámetros</Text>
      </View>

      {/* Reports Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tus Reportes</Text>

        {/* Weekly Glucose Average */}
        <View style={styles.reportCard}>
          <View style={styles.reportIconContainer}>
            <Droplet size={24} color={theme.colors.primary} />
          </View>
          <View style={styles.reportContent}>
            <Text style={styles.reportValue}>{weeklyGlucose?.averageGlucose || 0}mg/dL</Text>
            <Text style={styles.reportLabel}>Glucosa Promedio (Semanal)</Text>
          </View>
        </View>

        {/* Daily Insulin Average */}
        <View style={styles.reportCard}>
          <View style={styles.reportIconContainer}>
            <Syringe size={24} color={theme.colors.primary} />
          </View>
          <View style={styles.reportContent}>
            <Text style={styles.reportValue}>{dailyInsulin?.averageDose || 0}U</Text>
            <Text style={styles.reportLabel}>Dosis Promedio de Insulina (Diaria)</Text>
          </View>
        </View>

        {/* Glucose Trend Chart */}
        {chartData.length > 0 && (
          <View style={styles.chartContainer}>
            <GlucoseChart
              data={chartData}
              targetRange={targetRange}
              title="Promedio diario de glucosa (últimos 7 días)"
              showTargetRangeSubtitle={true}
              height={theme.chartDimensions.compactHeight}
              inline={true}
              showAllDataPoints={true}
              smoothing={false}
              endPadding={theme.spacing.md}
              labelOffset={10}
              alignToLabels={true}
            />
          </View>
        )}
      </View>

      {/* Doctor Information Section */}
      {hasDoctor && doctorInfo && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información del Médico</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Stethoscope size={20} color={theme.colors.textSecondary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Nombre</Text>
                <Text style={styles.infoValue}>
                  {doctorInfo.doctor.firstName && doctorInfo.doctor.lastName
                    ? `${doctorInfo.doctor.firstName} ${doctorInfo.doctor.lastName}`
                    : doctorInfo.doctor.email}
                </Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Mail size={20} color={theme.colors.textSecondary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{doctorInfo.doctor.email}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Info size={20} color={theme.colors.textSecondary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Fecha de Asignación</Text>
                <Text style={styles.infoValue}>{formatDate(doctorInfo.createdAt)}</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Treatment Parameters Section - Only if doctor assigned */}
      {hasDoctor && profile && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Parámetros de Dosis</Text>

          {/* IC Ratios */}
          <View style={styles.parameterCard}>
            <Text style={styles.parameterLabel}>Ratio Insulina-Carbohidratos (RIC)</Text>
            <View style={styles.parameterRow}>
              <View style={styles.parameterItem}>
                <Text style={styles.parameterValue}>{profile.icRatioBreakfast || "-"}</Text>
                <Text style={styles.parameterUnit}>g/U (Desayuno)</Text>
              </View>
              <View style={styles.parameterItem}>
                <Text style={styles.parameterValue}>{profile.icRatioLunch || "-"}</Text>
                <Text style={styles.parameterUnit}>g/U (Almuerzo)</Text>
              </View>
              <View style={styles.parameterItem}>
                <Text style={styles.parameterValue}>{profile.icRatioDinner || "-"}</Text>
                <Text style={styles.parameterUnit}>g/U (Cena)</Text>
              </View>
            </View>
            <Text style={styles.parameterDescription}>
              Cantidad de carbohidratos cubiertos por una unidad de insulina.
            </Text>
          </View>

          {/* Insulin Sensitivity Factor */}
          <View style={styles.parameterCard}>
            <Text style={styles.parameterLabel}>Factor de Sensibilidad a la Insulina (FSI)</Text>
            <View style={styles.parameterRow}>
              <View style={styles.parameterItem}>
                <Text style={styles.parameterValue}>{profile.insulinSensitivityFactor || "-"}</Text>
                <Text style={styles.parameterUnit}>mg/dL/U</Text>
              </View>
            </View>
            <Text style={styles.parameterDescription}>
              Reducción de glucosa por una unidad de insulina.
            </Text>
          </View>

          {/* DIA Hours */}
          <View style={styles.parameterCard}>
            <Text style={styles.parameterLabel}>Duración de Acción de Insulina (DIA)</Text>
            <View style={styles.parameterRow}>
              <View style={styles.parameterItem}>
                <Text style={styles.parameterValue}>{profile.diaHours || "-"}</Text>
                <Text style={styles.parameterUnit}>horas</Text>
              </View>
            </View>
            <Text style={styles.parameterDescription}>
              Tiempo que la insulina permanece activa.
            </Text>
          </View>

          {/* Target Glucose Range */}
          <View style={styles.parameterCard}>
            <Text style={styles.parameterLabel}>Rango Objetivo de Glucosa</Text>
            <View style={styles.parameterRow}>
              <View style={styles.parameterItem}>
                <Text style={styles.parameterValue}>{profile.minTargetGlucose || "-"} min</Text>
                <Text style={styles.parameterUnit}>mg/dL</Text>
              </View>
              <View style={styles.parameterItem}>
                <Text style={styles.parameterValue}>{profile.maxTargetGlucose || "-"} max</Text>
                <Text style={styles.parameterUnit}>mg/dL</Text>
              </View>
            </View>
            <Text style={styles.parameterDescription}>
              Rango de glucosa ideal antes y después de las comidas.
            </Text>
          </View>

          {/* Meal Times */}
          <View style={styles.parameterCard}>
            <Text style={styles.parameterLabel}>Horarios de Comidas</Text>
            <View style={styles.mealTimesContainer}>
              <View style={styles.mealTimeItem}>
                <Text style={styles.mealTimeLabel}>Desayuno</Text>
                <Text style={styles.mealTimeValue}>
                  {profile.mealTimeBreakfastStart !== undefined
                    ? formatTimeFromMinutes(profile.mealTimeBreakfastStart)
                    : "-"}{" "}
                  -{" "}
                  {profile.mealTimeBreakfastEnd !== undefined
                    ? formatTimeFromMinutes(profile.mealTimeBreakfastEnd)
                    : "-"}
                </Text>
              </View>
              <View style={styles.mealTimeItem}>
                <Text style={styles.mealTimeLabel}>Almuerzo</Text>
                <Text style={styles.mealTimeValue}>
                  {profile.mealTimeLunchStart !== undefined
                    ? formatTimeFromMinutes(profile.mealTimeLunchStart)
                    : "-"}{" "}
                  -{" "}
                  {profile.mealTimeLunchEnd !== undefined
                    ? formatTimeFromMinutes(profile.mealTimeLunchEnd)
                    : "-"}
                </Text>
              </View>
              <View style={styles.mealTimeItem}>
                <Text style={styles.mealTimeLabel}>Cena</Text>
                <Text style={styles.mealTimeValue}>
                  {profile.mealTimeDinnerStart !== undefined
                    ? formatTimeFromMinutes(profile.mealTimeDinnerStart)
                    : "-"}{" "}
                  -{" "}
                  {profile.mealTimeDinnerEnd !== undefined
                    ? formatTimeFromMinutes(profile.mealTimeDinnerEnd)
                    : "-"}
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Communication Section */}
      {hasDoctor && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Comunicación</Text>
          <TouchableOpacity style={styles.communicationButton} disabled={true}>
            <Mail size={20} color={theme.colors.primary} />
            <Text style={styles.communicationButtonText}>Enviar mensaje al doctor</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* No Doctor Message */}
      {!hasDoctor && (
        <View style={styles.section}>
          <View style={styles.noDoctorCard}>
            <Info size={32} color={theme.colors.textSecondary} />
            <Text style={styles.noDoctorTitle}>No tienes médico asignado</Text>
            <Text style={styles.noDoctorText}>
              Cuando un médico sea asignado a tu cuenta, podrás ver aquí los parámetros de
              tratamiento y comunicarte directamente con él.
            </Text>
          </View>
        </View>
      )}
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
    paddingBottom: theme.spacing.xxxl,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: "bold",
    color: theme.colors.text,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  reportCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    shadowColor: theme.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reportIconContainer: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary + "15",
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacing.md,
  },
  reportContent: {
    flex: 1,
  },
  reportValue: {
    fontSize: theme.fontSize.xxl,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  reportLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  chartContainer: {
    marginTop: theme.spacing.md,
  },
  infoCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    shadowColor: theme.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  infoContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  infoLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  infoValue: {
    fontSize: theme.fontSize.md,
    fontWeight: "500",
    color: theme.colors.text,
  },
  parameterCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    shadowColor: theme.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  parameterLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  parameterRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: theme.spacing.sm,
  },
  parameterItem: {
    alignItems: "center",
  },
  parameterValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  parameterUnit: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  parameterDescription: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    fontStyle: "italic",
    marginTop: theme.spacing.xs,
  },
  mealTimesContainer: {
    gap: theme.spacing.sm,
  },
  mealTimeItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  mealTimeLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: "500",
    color: theme.colors.text,
  },
  mealTimeValue: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  communicationButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    opacity: 0.6,
  },
  communicationButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  noDoctorCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.xl,
    alignItems: "center",
    shadowColor: theme.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noDoctorTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    textAlign: "center",
  },
  noDoctorText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
});
