"use client";

import { Snackbar, Alert } from "@mui/material";
import type { AlertColor } from "@mui/material";

type FeedbackSnackbarProps = {
  open: boolean;
  message: string;
  severity?: AlertColor;
  autoHideDuration?: number;
  onClose: () => void;
  anchorOrigin?: {
    vertical: "top" | "bottom";
    horizontal: "left" | "center" | "right";
  };
};

/**
 * Reusable snackbar component to show success/error/info messages consistently.
 */
export const FeedbackSnackbar = ({
  open,
  message,
  severity = "info",
  autoHideDuration = 3000,
  onClose,
  anchorOrigin = { vertical: "bottom", horizontal: "left" },
}: FeedbackSnackbarProps) => {
  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={anchorOrigin}
    >
      <Alert onClose={onClose} severity={severity} sx={{ width: "100%" }} variant="filled">
        {message}
      </Alert>
    </Snackbar>
  );
};
