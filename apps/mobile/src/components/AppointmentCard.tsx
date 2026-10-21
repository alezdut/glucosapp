import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Share, Alert } from "react-native";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Info,
  Mail,
  Stethoscope,
  XCircle,
} from "lucide-react-native";
import { AppointmentModality, AppointmentStatus, type PatientAppointment } from "@glucosapp/types";
import { theme } from "../theme";
import Button from "./Button";
import { isAppointmentCancelable, isAppointmentConfirmable } from "../lib/appointments-api";

type AppointmentCardProps = {
  appointment: PatientAppointment;
  confirmLoading?: boolean;
  cancelLoading?: boolean;
  onConfirm: (appointmentId: string) => void;
  onCancel: (appointmentId: string) => void;
};

const formatAppointmentDate = (dateString: string): string => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getAppointmentStatusLabel = (status: AppointmentStatus): string => {
  if (status === AppointmentStatus.SCHEDULED) return "Programada";
  if (status === AppointmentStatus.CONFIRMED) return "Confirmada";
  if (status === AppointmentStatus.COMPLETED) return "Completada";
  return "Cancelada";
};

const getAppointmentStatusColor = (status: AppointmentStatus): string => {
  if (status === AppointmentStatus.SCHEDULED) return theme.colors.primary;
  if (status === AppointmentStatus.CONFIRMED) return theme.colors.success;
  if (status === AppointmentStatus.COMPLETED) return theme.colors.textSecondary;
  return theme.colors.error;
};

const getAppointmentModalityLabel = (modality: AppointmentModality): string => {
  if (modality === AppointmentModality.VIRTUAL) return "Virtual";
  return "Presencial";
};

const handleMeetingUrlPress = async (meetingUrl: string) => {
  try {
    await Share.share({
      message: meetingUrl,
      url: meetingUrl,
    });
  } catch {
    Alert.alert("No se pudo compartir el enlace", "Intenta nuevamente.");
  }
};

export default function AppointmentCard({
  appointment,
  confirmLoading = false,
  cancelLoading = false,
  onConfirm,
  onCancel,
}: AppointmentCardProps) {
  const doctorName =
    appointment.doctor?.firstName || appointment.doctor?.lastName
      ? `${appointment.doctor?.firstName || ""} ${appointment.doctor?.lastName || ""}`.trim()
      : appointment.doctor?.email || "Tu médico";

  return (
    <View style={styles.appointmentCard}>
      <View style={styles.appointmentHeader}>
        <View style={styles.appointmentHeaderLeft}>
          <View style={styles.appointmentIcon}>
            <CalendarDays size={18} color={theme.colors.primary} />
          </View>
          <View style={styles.appointmentMeta}>
            <Text style={styles.appointmentDate}>
              {formatAppointmentDate(appointment.scheduledAt)}
            </Text>
            <Text style={styles.appointmentDoctorName}>{doctorName}</Text>
          </View>
        </View>
        <View
          style={[
            styles.appointmentStatusBadge,
            { backgroundColor: `${getAppointmentStatusColor(appointment.status)}15` },
          ]}
        >
          <Text
            style={[
              styles.appointmentStatusText,
              { color: getAppointmentStatusColor(appointment.status) },
            ]}
          >
            {getAppointmentStatusLabel(appointment.status)}
          </Text>
        </View>
      </View>

      {appointment.notes ? <Text style={styles.appointmentNotes}>{appointment.notes}</Text> : null}

      <View style={styles.appointmentInfoRow}>
        <Clock3 size={16} color={theme.colors.textSecondary} />
        <Text style={styles.appointmentInfoText}>Bloque estimado de 60 minutos</Text>
      </View>

      <View style={styles.appointmentInfoRow}>
        <Info size={16} color={theme.colors.textSecondary} />
        <Text style={styles.appointmentInfoText}>
          Modalidad: {getAppointmentModalityLabel(appointment.modality)}
        </Text>
      </View>

      {appointment.modality === AppointmentModality.IN_PERSON && appointment.location ? (
        <View style={styles.appointmentInfoRow}>
          <Stethoscope size={16} color={theme.colors.textSecondary} />
          <Text style={styles.appointmentInfoText}>{appointment.location}</Text>
        </View>
      ) : null}

      {appointment.modality === AppointmentModality.VIRTUAL && appointment.meetingUrl ? (
        <TouchableOpacity
          onPress={() => handleMeetingUrlPress(appointment.meetingUrl!)}
          style={styles.appointmentLinkRow}
          activeOpacity={0.8}
        >
          <Mail size={16} color={theme.colors.primary} />
          <View style={styles.appointmentLinkContent}>
            <Text numberOfLines={1} style={styles.appointmentLinkText}>
              {appointment.meetingUrl}
            </Text>
            <Text style={styles.appointmentLinkHint}>Toca para copiar o compartir el enlace</Text>
          </View>
        </TouchableOpacity>
      ) : null}

      {(isAppointmentConfirmable(appointment.status) ||
        isAppointmentCancelable(appointment.status)) && (
        <View style={styles.appointmentActions}>
          {isAppointmentConfirmable(appointment.status) && (
            <Button
              title="Confirmar"
              variant="primary"
              loading={confirmLoading}
              onPress={() => onConfirm(appointment.id)}
              style={styles.appointmentActionButton}
              icon={<CheckCircle2 size={16} color={theme.colors.background} />}
            />
          )}
          {isAppointmentCancelable(appointment.status) && (
            <Button
              title="Cancelar"
              variant="outlined"
              loading={cancelLoading}
              onPress={() => onCancel(appointment.id)}
              style={styles.appointmentActionButton}
              icon={<XCircle size={16} color={theme.colors.primary} />}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  appointmentCard: {
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
  appointmentHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: theme.spacing.sm,
  },
  appointmentHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  appointmentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${theme.colors.primary}15`,
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacing.sm,
  },
  appointmentMeta: {
    flex: 1,
  },
  appointmentDate: {
    fontSize: theme.fontSize.md,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 2,
  },
  appointmentDoctorName: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  appointmentStatusBadge: {
    borderRadius: 999,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  appointmentStatusText: {
    fontSize: theme.fontSize.xs,
    fontWeight: "700",
  },
  appointmentNotes: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    lineHeight: 20,
    marginBottom: theme.spacing.sm,
  },
  appointmentInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.xs,
  },
  appointmentInfoText: {
    marginLeft: theme.spacing.xs,
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  appointmentLinkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: `${theme.colors.primary}10`,
  },
  appointmentLinkContent: {
    flex: 1,
  },
  appointmentLinkText: {
    fontSize: theme.fontSize.sm,
    fontWeight: "600",
    color: theme.colors.primary,
    marginBottom: 2,
  },
  appointmentLinkHint: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  appointmentActions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  appointmentActionButton: {
    flex: 1,
  },
});
