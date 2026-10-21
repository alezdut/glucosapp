import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CalendarDays, ChevronDown, ChevronUp } from "lucide-react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AppointmentStatus } from "@glucosapp/types";
import ScreenHeader from "../components/ScreenHeader";
import AppointmentCard from "../components/AppointmentCard";
import { theme } from "../theme";
import {
  useCancelAppointment,
  useConfirmAppointment,
  useMyAppointments,
} from "../hooks/useAppointments";
import type { RootStackParamList } from "../navigation/types";

type AppointmentsScreenProps = NativeStackScreenProps<RootStackParamList, "Appointments">;

export default function AppointmentsScreen({ navigation }: AppointmentsScreenProps) {
  const insets = useSafeAreaInsets();
  const { data: appointments = [], isLoading } = useMyAppointments(true);
  const confirmAppointmentMutation = useConfirmAppointment();
  const cancelAppointmentMutation = useCancelAppointment();
  const [showArchivedAppointments, setShowArchivedAppointments] = React.useState(false);
  const currentTime = React.useMemo(() => Date.now(), []);

  const sortedUpcomingAppointments = React.useMemo(
    () =>
      appointments
        .filter(
          (appointment) =>
            new Date(appointment.scheduledAt).getTime() >= currentTime &&
            (appointment.status === AppointmentStatus.SCHEDULED ||
              appointment.status === AppointmentStatus.CONFIRMED),
        )
        .sort(
          (left, right) =>
            new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime(),
        ),
    [appointments, currentTime],
  );

  const nextAppointment = sortedUpcomingAppointments[0];
  const futureAppointments = React.useMemo(
    () =>
      sortedUpcomingAppointments.slice(1).filter((appointment) => {
        return (
          appointment.status === AppointmentStatus.SCHEDULED ||
          appointment.status === AppointmentStatus.CONFIRMED
        );
      }),
    [sortedUpcomingAppointments],
  );

  const archivedAppointments = React.useMemo(
    () =>
      appointments
        .filter(
          (appointment) =>
            appointment.status === AppointmentStatus.COMPLETED ||
            appointment.status === AppointmentStatus.CANCELLED,
        )
        .sort(
          (left, right) =>
            new Date(right.scheduledAt).getTime() - new Date(left.scheduledAt).getTime(),
        ),
    [appointments],
  );

  const handleConfirmAppointment = (appointmentId: string) => {
    Alert.alert("Confirmar cita", "¿Quieres confirmar esta cita?", [
      { text: "Volver", style: "cancel" },
      {
        text: "Confirmar",
        onPress: async () => {
          try {
            await confirmAppointmentMutation.mutateAsync(appointmentId);
          } catch (error) {
            Alert.alert(
              "No se pudo confirmar",
              error instanceof Error ? error.message : "Intenta nuevamente.",
            );
          }
        },
      },
    ]);
  };

  const handleCancelAppointment = (appointmentId: string) => {
    Alert.alert("Cancelar cita", "La cita cambiará al estado cancelada.", [
      { text: "Volver", style: "cancel" },
      {
        text: "Cancelar cita",
        style: "destructive",
        onPress: async () => {
          try {
            await cancelAppointmentMutation.mutateAsync(appointmentId);
          } catch (error) {
            Alert.alert(
              "No se pudo cancelar",
              error instanceof Error ? error.message : "Intenta nuevamente.",
            );
          }
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingTop: insets.top + theme.spacing.lg,
          paddingBottom: Math.max(insets.bottom, theme.spacing.lg) + theme.spacing.xl,
        },
      ]}
    >
      <ScreenHeader
        title="Citas"
        subtitle="Historial y próximas más lejanas"
        onBack={() => navigation.goBack()}
      />

      {isLoading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      ) : (
        <>
          {nextAppointment ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Próxima cita</Text>
              </View>
              <AppointmentCard
                appointment={nextAppointment}
                confirmLoading={confirmAppointmentMutation.isPending}
                cancelLoading={cancelAppointmentMutation.isPending}
                onConfirm={handleConfirmAppointment}
                onCancel={handleCancelAppointment}
              />
            </View>
          ) : null}

          {futureAppointments.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Más adelante</Text>
                <Text style={styles.sectionCount}>{futureAppointments.length}</Text>
              </View>
              {futureAppointments.map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  confirmLoading={confirmAppointmentMutation.isPending}
                  cancelLoading={cancelAppointmentMutation.isPending}
                  onConfirm={handleConfirmAppointment}
                  onCancel={handleCancelAppointment}
                />
              ))}
            </View>
          ) : null}

          {archivedAppointments.length > 0 ? (
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.collapsibleHeader}
                activeOpacity={0.8}
                onPress={() => setShowArchivedAppointments((current) => !current)}
              >
                <View>
                  <Text style={styles.sectionTitle}>Citas anteriores</Text>
                  <Text style={styles.collapsibleHint}>Completadas o canceladas</Text>
                </View>
                <View style={styles.collapsibleMeta}>
                  <Text style={styles.sectionCount}>{archivedAppointments.length}</Text>
                  {showArchivedAppointments ? (
                    <ChevronUp size={18} color={theme.colors.textSecondary} />
                  ) : (
                    <ChevronDown size={18} color={theme.colors.textSecondary} />
                  )}
                </View>
              </TouchableOpacity>

              {showArchivedAppointments
                ? archivedAppointments.map((appointment) => (
                    <AppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      confirmLoading={confirmAppointmentMutation.isPending}
                      cancelLoading={cancelAppointmentMutation.isPending}
                      onConfirm={handleConfirmAppointment}
                      onCancel={handleCancelAppointment}
                    />
                  ))
                : null}
            </View>
          ) : null}

          {!nextAppointment &&
          futureAppointments.length === 0 &&
          archivedAppointments.length === 0 ? (
            <View style={styles.emptyCard}>
              <CalendarDays size={28} color={theme.colors.textSecondary} />
              <Text style={styles.emptyTitle}>Nada más por mostrar</Text>
              <Text style={styles.emptyText}>Todavía no tienes citas registradas.</Text>
            </View>
          ) : null}
        </>
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
  },
  loadingCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.xl,
    alignItems: "center",
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: "600",
    color: theme.colors.text,
  },
  sectionCount: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  collapsibleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  collapsibleHint: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  collapsibleMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  emptyCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.xl,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  emptyText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
});
