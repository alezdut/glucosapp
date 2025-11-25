"use client";

import { Box, Checkbox, FormControlLabel, TextField, Typography } from "@mui/material";
import { Clock } from "lucide-react";
import { InputAdornment } from "@mui/material";
import type { NotificationChannels } from "@glucosapp/types";
import { NotificationFrequency } from "@glucosapp/types";

type NotificationPreferencesProps = {
  channels: NotificationChannels;
  onChannelsChange: (channels: NotificationChannels) => void;
  notificationFrequency: string;
  dailySummaryTime: string;
  onDailySummaryTimeChange: (time: string) => void;
  quietHoursEnabled: boolean;
  onQuietHoursChange: (enabled: boolean) => void;
  quietHoursStart: string;
  onQuietHoursStartChange: (time: string) => void;
  quietHoursEnd: string;
  onQuietHoursEndChange: (time: string) => void;
  criticalAlertsIgnoreQuietHours: boolean;
  onCriticalAlertsIgnoreQuietHoursChange: (enabled: boolean) => void;
};

/**
 * Component for notification preferences configuration
 */
export const NotificationPreferences = ({
  channels,
  onChannelsChange,
  notificationFrequency,
  dailySummaryTime,
  onDailySummaryTimeChange,
  quietHoursEnabled,
  onQuietHoursChange,
  quietHoursStart,
  onQuietHoursStartChange,
  quietHoursEnd,
  onQuietHoursEndChange,
  criticalAlertsIgnoreQuietHours,
  onCriticalAlertsIgnoreQuietHoursChange,
}: NotificationPreferencesProps) => {
  const handleChannelChange = (channel: keyof NotificationChannels, value: boolean) => {
    onChannelsChange({
      ...channels,
      [channel]: value,
    });
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {/* Notification Channels */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
          Canales de Notificación
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={channels.dashboard}
                onChange={(e) => handleChannelChange("dashboard", e.target.checked)}
                color="primary"
                disabled
              />
            }
            label="Dashboard (siempre activo)"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={channels.email}
                onChange={(e) => handleChannelChange("email", e.target.checked)}
                color="primary"
              />
            }
            label="Email"
          />
        </Box>
      </Box>

      {/* Summary Time - Only shown when frequency is DAILY or WEEKLY */}
      {(notificationFrequency === NotificationFrequency.DAILY ||
        notificationFrequency === NotificationFrequency.WEEKLY) && (
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
            Horario del Resumen
          </Typography>
          <TextField
            label={`Hora para resumen ${notificationFrequency === NotificationFrequency.DAILY ? "diario" : "semanal"}`}
            type="time"
            value={dailySummaryTime}
            onChange={(e) => onDailySummaryTimeChange(e.target.value)}
            fullWidth
            size="small"
            variant="outlined"
            helperText={`Selecciona la hora en que deseas recibir el resumen ${notificationFrequency === NotificationFrequency.DAILY ? "diario" : "semanal"}`}
            InputLabelProps={{
              shrink: true,
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Clock className="w-4 h-4 text-gray-500" />
                </InputAdornment>
              ),
            }}
          />
        </Box>
      )}

      {/* Quiet Hours */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
          Horario de Silencio
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={quietHoursEnabled}
                onChange={(e) => onQuietHoursChange(e.target.checked)}
                color="primary"
              />
            }
            label="Activar horario de silencio"
          />
          {quietHoursEnabled && (
            <>
              <Box sx={{ display: "flex", gap: 2 }}>
                <TextField
                  label="Desde"
                  type="time"
                  value={quietHoursStart}
                  onChange={(e) => onQuietHoursStartChange(e.target.value)}
                  fullWidth
                  size="small"
                  variant="outlined"
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
                <TextField
                  label="Hasta"
                  type="time"
                  value={quietHoursEnd}
                  onChange={(e) => onQuietHoursEndChange(e.target.value)}
                  fullWidth
                  size="small"
                  variant="outlined"
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Box>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={criticalAlertsIgnoreQuietHours}
                    onChange={(e) => onCriticalAlertsIgnoreQuietHoursChange(e.target.checked)}
                    color="primary"
                  />
                }
                label="Las alertas críticas ignoran el horario de silencio"
              />
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
};
