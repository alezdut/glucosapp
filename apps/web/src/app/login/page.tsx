"use client";
import { useState, FormEvent, useEffect } from "react";
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
  useTheme,
  Link as MuiLink,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useAuth } from "@/contexts/auth-context";
import { resendVerification } from "@/lib/auth-api";
import styles from "@/components/auth-form.module.css";
import { BrandLogo } from "@/components/BrandLogo";
import { parseApiError } from "@glucosapp/utils";

/**
 * Validates email format
 */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Login page component
 */
export default function LoginPage() {
  const resendCooldownSeconds = 60;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [canResendVerification, setCanResendVerification] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const theme = useTheme();

  useEffect(() => {
    if (resendCountdown <= 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setResendCountdown((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearTimeout(timeoutId);
  }, [resendCountdown]);

  /**
   * Handles form submission with validation
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setCanResendVerification(false);

    // Validate email format
    if (!isValidEmail(email)) {
      setError("Por favor, ingresa un email válido");
      return;
    }

    setIsLoading(true);

    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      const apiError = parseApiError(err, "Error al iniciar sesión");
      setError(apiError.message);
      setCanResendVerification(apiError.code === "EMAIL_NOT_VERIFIED");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email || resendCountdown > 0) {
      return;
    }

    setIsResendingVerification(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await resendVerification(email);
      setSuccessMessage(response.message);
      setResendCountdown(resendCooldownSeconds);
    } catch (err) {
      const apiError = parseApiError(err, "Error al reenviar verificación");
      setError(apiError.message);
      const retryAfterSeconds = (apiError as { retryAfterSeconds?: unknown }).retryAfterSeconds;
      if (
        apiError.code === "VERIFICATION_EMAIL_RESEND_RATE_LIMIT" &&
        typeof retryAfterSeconds === "number"
      ) {
        setResendCountdown(retryAfterSeconds);
      }
    } finally {
      setIsResendingVerification(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <Box
          sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5, mb: 2 }}
        >
          <BrandLogo size={80} color={theme.palette.primary.main} />
          <Typography variant="h3" component="div" sx={{ fontWeight: 700 }}>
            GlucosApp
          </Typography>
        </Box>
        <Typography
          variant="h6"
          component="h1"
          sx={{ mb: 3, textAlign: "center", fontWeight: 600 }}
        >
          Iniciar Sesión
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Box>
              <Typography variant="body2">{error}</Typography>
              {canResendVerification && (
                <MuiLink
                  component="button"
                  type="button"
                  onClick={handleResendVerification}
                  disabled={isResendingVerification || resendCountdown > 0}
                  underline="hover"
                  sx={{
                    mt: 0.75,
                    fontSize: "0.875rem",
                    cursor:
                      isResendingVerification || resendCountdown > 0 ? "not-allowed" : "pointer",
                    opacity: isResendingVerification || resendCountdown > 0 ? 0.7 : 1,
                  }}
                >
                  {isResendingVerification
                    ? "Reenviando email..."
                    : resendCountdown > 0
                      ? `Reenviar email en ${resendCountdown}s`
                      : "Reenviar email de confirmación"}
                </MuiLink>
              )}
            </Box>
          </Alert>
        )}

        {successMessage && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {successMessage}
          </Alert>
        )}

        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
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

          <TextField
            label="Contraseña"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={isLoading}
            fullWidth
            sx={{ mt: 1, py: 1.5 }}
          >
            {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
          </Button>
        </Box>

        <Box sx={{ textAlign: "center", mt: 2 }}>
          <Link
            href="/forgot-password"
            style={{ color: theme.palette.primary.main, textDecoration: "none" }}
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </Box>

        <Box sx={{ textAlign: "center", mt: 1, color: theme.palette.text.secondary }}>
          ¿No tienes cuenta?{" "}
          <Link
            href="/register"
            style={{ color: theme.palette.primary.main, textDecoration: "none" }}
          >
            Regístrate
          </Link>
        </Box>
      </div>
    </div>
  );
}
