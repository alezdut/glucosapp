"use client";

import { Chip, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";

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
      bgColor: alpha(theme.palette.error.light, 0.25),
    },
    high: {
      label: "Alta",
      color: theme.palette.warning.main,
      bgColor: alpha(theme.palette.warning.light, 0.25),
    },
    medium: {
      label: "Media",
      color: theme.palette.info.main,
      bgColor: alpha(theme.palette.info.light, 0.25),
    },
    low: {
      label: "Baja",
      color: theme.palette.success.main,
      bgColor: alpha(theme.palette.success.light, 0.25),
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
