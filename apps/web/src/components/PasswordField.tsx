import { useState } from "react";
import {
  TextField,
  IconButton,
  InputAdornment,
  Box,
  Typography,
  LinearProgress,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import {
  validatePassword,
  getStrengthColor,
  getStrengthValue,
  getStrengthLabel,
  type PasswordStrength,
} from "@glucosapp/utils";

interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  required?: boolean;
  showStrengthIndicator?: boolean;
  helperText?: string;
  onStrengthChange?: (strength: PasswordStrength) => void;
}

/**
 * Reusable password field component with strength indicator
 */
export function PasswordField({
  label,
  value,
  onChange,
  disabled = false,
  placeholder = "••••••••",
  required = false,
  showStrengthIndicator = false,
  helperText,
  onStrengthChange,
}: PasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const strength = validatePassword(value);

  /**
   * Handles password change and notifies parent of strength
   */
  const handleChange = (newValue: string) => {
    onChange(newValue);
    if (onStrengthChange) {
      const newStrength = validatePassword(newValue);
      onStrengthChange(newStrength);
    }
  };

  return (
    <Box>
      <TextField
        label={label}
        type={showPassword ? "text" : "password"}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        fullWidth
        variant="outlined"
        inputProps={{ minLength: 8 }}
        helperText={!showStrengthIndicator ? helperText : undefined}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                onClick={() => setShowPassword(!showPassword)}
                edge="end"
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
      {showStrengthIndicator && value && (
        <Box sx={{ mt: 1 }}>
          <LinearProgress
            variant="determinate"
            value={getStrengthValue(strength)}
            sx={{
              height: 4,
              borderRadius: 2,
              backgroundColor: "#e0e0e0",
              "& .MuiLinearProgress-bar": {
                backgroundColor: getStrengthColor(strength),
                transition: "background-color 0.3s ease",
              },
            }}
          />
          <Typography
            variant="caption"
            sx={{
              display: "block",
              mt: 0.5,
              color: getStrengthColor(strength),
              fontWeight: 500,
            }}
          >
            Fortaleza: {getStrengthLabel(strength)}
          </Typography>
        </Box>
      )}
      {showStrengthIndicator && helperText && (
        <Typography variant="caption" sx={{ display: "block", mt: 0.5, color: "#666" }}>
          {helperText}
        </Typography>
      )}
    </Box>
  );
}
