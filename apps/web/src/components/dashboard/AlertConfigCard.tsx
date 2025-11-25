"use client";

import { Box, Typography, Switch } from "@mui/material";
import type { ReactNode } from "react";

type AlertConfigCardProps = {
  title: string;
  icon?: ReactNode;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  children: ReactNode;
  description?: string;
  showToggle?: boolean;
};

/**
 * Reusable card component for alert configuration sections
 */
export const AlertConfigCard = ({
  title,
  icon,
  enabled,
  onToggle,
  children,
  description,
  showToggle = true,
}: AlertConfigCardProps) => {
  return (
    <Box
      sx={{
        p: 2,
        bgcolor: "background.default",
        borderRadius: 1,
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 2,
          mb: description ? 2 : 0,
          flexWrap: "wrap",
        }}
      >
        <Box sx={{ flex: 1, minWidth: "220px" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: description ? 1 : 0 }}>
            {icon && <Box sx={{ display: "flex", alignItems: "center" }}>{icon}</Box>}
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
          </Box>
          {description && (
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          )}
        </Box>
        {showToggle && (
          <Switch
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            color="primary"
            inputProps={{ "aria-label": `Activar ${title}` }}
          />
        )}
      </Box>

      {(!showToggle || enabled) && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>{children}</Box>
      )}
    </Box>
  );
};
