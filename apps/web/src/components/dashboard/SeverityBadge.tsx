"use client";

import { Chip, useTheme } from "@mui/material";
import { colors } from "@glucosapp/theme";

type SeverityBadgeProps = {
  severity: "critical" | "high" | "medium" | "low";
};

/**
 * Badge component to display alert severity
 */
export const SeverityBadge = ({ severity }: SeverityBadgeProps) => {
  const theme = useTheme();

  const severityConfig = {
    critical: {
      label: "Crítica",
      color: theme.palette.error.main,
      bgColor: theme.palette.error.light + "40",
    },
    high: {
      label: "Alta",
      color: theme.palette.warning.main,
      bgColor: theme.palette.warning.light + "40",
    },
    medium: {
      label: "Media",
      color: theme.palette.info.main,
      bgColor: theme.palette.info.light + "40",
    },
    low: {
      label: "Baja",
      color: theme.palette.success.main,
      bgColor: theme.palette.success.light + "40",
    },
  };

  const config = severityConfig[severity];

  return (
    <Chip
      label={config.label}
      size="small"
      sx={{
        bgcolor: config.bgColor,
        color: config.color,
        fontWeight: 600,
        fontSize: "0.75rem",
        height: "24px",
      }}
    />
  );
};
