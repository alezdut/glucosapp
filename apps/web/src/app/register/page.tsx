"use client";
import { useState, FormEvent, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  TextField,
  IconButton,
  InputAdornment,
  Button,
  Box,
  Typography,
  Alert,
  LinearProgress,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useAuth } from "@/contexts/auth-context";
import styles from "@/components/auth-form.module.css";

type PasswordStrength = "weak" | "medium" | "strong";

/**
 * Validates password strength
 */
function validatePassword(pwd: string): PasswordStrength {
  const hasUpper = /[A-Z]/.test(pwd);
  const hasNumber = /\d/.test(pwd);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);
  const isLongEnough = pwd.length >= 8;

  if (hasUpper && hasNumber && hasSpecial && isLongEnough) return "strong";
  if ((hasUpper || hasNumber) && isLongEnough) return "medium";
  return "weak";
}

/**
 * Registration page component
 */
export default function RegisterPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>("weak");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();
  const timeoutRef = useRef<number | null>(null);

  /**
   * Cleanup timeout on unmount
   */
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  /**
   * Handles password change and updates strength indicator
   */
  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setPasswordStrength(validatePassword(value));
  };

  /**
   * Handles form submission with validation
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    // Frontend validations
    if (!firstName.trim()) {
      setError("El nombre es requerido");
      return;
    }

    if (!lastName.trim()) {
      setError("El apellido es requerido");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (passwordStrength === "weak") {
      setError(
        "La contraseña es muy débil. Debe tener al menos 8 caracteres y contener mayúsculas, números o símbolos especiales",
      );
      return;
    }

    setIsLoading(true);

    try {
      await register(email, password, firstName, lastName);
      setSuccess(true);
      // Clear any existing timeout before scheduling a new one
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
      // Redirect to login after 3 seconds
      timeoutRef.current = window.setTimeout(() => router.push("/login"), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrarse");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <Typography
            variant="h4"
            component="h1"
            sx={{ mb: 3, textAlign: "center", fontWeight: 600 }}
          >
            ¡Registro Exitoso!
          </Typography>
          <Alert severity="success" sx={{ mb: 2 }}>
            <Box>
              <p>Tu cuenta ha sido creada exitosamente.</p>
              <p>Te hemos enviado un email de verificación.</p>
              <p>Por favor, verifica tu email antes de iniciar sesión.</p>
            </Box>
          </Alert>
          <Box sx={{ textAlign: "center", mt: 2 }}>
            <Link href="/login" style={{ color: "#1976d2", textDecoration: "none" }}>
              Ir a Iniciar Sesión
            </Link>
          </Box>
        </div>
      </div>
    );
  }

  /**
   * Gets color for password strength
   */
  const getStrengthColor = () => {
    if (passwordStrength === "strong") return "#22c55e";
    if (passwordStrength === "medium") return "#eab308";
    return "#ef4444";
  };

  /**
   * Gets strength value for progress bar
   */
  const getStrengthValue = () => {
    if (passwordStrength === "strong") return 100;
    if (passwordStrength === "medium") return 66;
    return 33;
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <Typography
          variant="h4"
          component="h1"
          sx={{ mb: 3, textAlign: "center", fontWeight: 600 }}
        >
          Registrarse
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          <TextField
            label="Nombre"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            disabled={isLoading}
            placeholder="Juan"
            fullWidth
            variant="outlined"
          />

          <TextField
            label="Apellido"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            disabled={isLoading}
            placeholder="Pérez"
            fullWidth
            variant="outlined"
          />

          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
            placeholder="tu@email.com"
            fullWidth
            variant="outlined"
          />

          <Box>
            <TextField
              label="Contraseña"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              required
              disabled={isLoading}
              placeholder="••••••••"
              fullWidth
              variant="outlined"
              inputProps={{ minLength: 8 }}
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
            {password && (
              <Box sx={{ mt: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={getStrengthValue()}
                  sx={{
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: "#e0e0e0",
                    "& .MuiLinearProgress-bar": {
                      backgroundColor: getStrengthColor(),
                      transition: "background-color 0.3s ease",
                    },
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    display: "block",
                    mt: 0.5,
                    color: getStrengthColor(),
                    fontWeight: 500,
                  }}
                >
                  Fortaleza:{" "}
                  {passwordStrength === "strong"
                    ? "Fuerte"
                    : passwordStrength === "medium"
                      ? "Media"
                      : "Débil"}
                </Typography>
              </Box>
            )}
            <Typography variant="caption" sx={{ display: "block", mt: 0.5, color: "#666" }}>
              Debe incluir mayúsculas, números y símbolos especiales
            </Typography>
          </Box>

          <TextField
            label="Confirmar Contraseña"
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={isLoading}
            placeholder="••••••••"
            fullWidth
            variant="outlined"
            inputProps={{ minLength: 8 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    edge="end"
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={isLoading}
            fullWidth
            sx={{ mt: 1, py: 1.5 }}
          >
            {isLoading ? "Registrando..." : "Registrarse"}
          </Button>
        </Box>

        <Box sx={{ textAlign: "center", mt: 2, color: "#666" }}>
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" style={{ color: "#1976d2", textDecoration: "none" }}>
            Inicia Sesión
          </Link>
        </Box>
      </div>
    </div>
  );
}
