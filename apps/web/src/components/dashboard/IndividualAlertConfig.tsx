"use client";

import {
  Box,
  Checkbox,
  FormControlLabel,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
} from "@mui/material";
import { InputAdornment } from "@mui/material";
import { SeverityBadge } from "./SeverityBadge";
import { NotificationFrequency, NOTIFICATION_FREQUENCY_OPTIONS } from "@glucosapp/types";

type IndividualAlertConfigProps = {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  threshold: number;
  onThresholdChange: (threshold: number) => void;
  severity: "critical" | "high" | "medium" | "low";
  frequency: string;
  onFrequencyChange: (frequency: string) => void;
  thresholdLabel: string;
  thresholdUnit?: string;
  thresholdMin?: number;
  thresholdMax?: number;
  thresholdError?: string;
  showFrequency?: boolean;
};

/**
 * Component for configuring individual alert types
 */
export const IndividualAlertConfig = ({
  enabled,
  onEnabledChange,
  threshold,
  onThresholdChange,
  severity,
  frequency,
  onFrequencyChange,
  thresholdLabel,
  thresholdUnit = "mg/dL",
  thresholdMin,
  thresholdMax,
  thresholdError,
  showFrequency = true,
}: IndividualAlertConfigProps) => {
  return (
    <Box
      sx={{
        p: 2,
        bgcolor: "background.paper",
        borderRadius: 1,
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={enabled}
                onChange={(e) => onEnabledChange(e.target.checked)}
                color="primary"
              />
            }
            label={thresholdLabel}
          />
          <SeverityBadge severity={severity} />
        </Box>

        {enabled && (
          <>
            <TextField
              label={thresholdLabel}
              type="text"
              value={threshold > 0 ? threshold : ""}
              onChange={(e) => {
                const value = e.target.value;
                // Only allow numbers (including empty string for deletion)
                if (value === "" || /^\d+$/.test(value)) {
                  if (value === "") {
                    // Set to 0 when empty (represents empty field, validation will ignore it)
                    onThresholdChange(0);
                  } else {
                    const numValue = parseInt(value, 10);
                    if (!isNaN(numValue)) {
                      onThresholdChange(numValue);
                    }
                  }
                }
              }}
              fullWidth
              size="small"
              variant="outlined"
              error={!!thresholdError}
              helperText={thresholdError}
              InputProps={{
                endAdornment: <InputAdornment position="end">{thresholdUnit}</InputAdornment>,
              }}
            />

            {showFrequency && (
              <FormControl fullWidth size="small">
                <InputLabel>Frecuencia de Notificación</InputLabel>
                <Select
                  label="Frecuencia de Notificación"
                  value={frequency}
                  onChange={(e) => onFrequencyChange(e.target.value)}
                >
                  {NOTIFICATION_FREQUENCY_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </>
        )}
      </Box>
    </Box>
  );
};
