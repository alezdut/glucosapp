"use client";
import { useState, FormEvent, Suspense, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  TextField,
  IconButton,
  InputAdornment,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { resetPassword } from "@/lib/auth-api";
import styles from "@/components/auth-form.module.css";

/**
 * Reset password page content component
 */
function ResetPasswordContent() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const timeoutRef = useRef<number | null>(null);

  const token = searchParams.get("token");

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!token) {
      setError("Token de restablecimiento no proporcionado");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (newPassword.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    setIsLoading(true);

    try {
      await resetPassword(token, newPassword);
      setSuccess(true);
      // Clear any existing timeout before scheduling a new one
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
      // Redirect to login after 3 seconds
      timeoutRef.current = window.setTimeout(() => router.push("/login"), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al restablecer contraseña");
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <Typography
            variant="h4"
            component="h1"
            sx={{ mb: 3, textAlign: "center", fontWeight: 600 }}
          >
            Error
          </Typography>
          <Alert severity="error" sx={{ mb: 2 }}>
            Token de restablecimiento no proporcionado
          </Alert>
          <Box sx={{ textAlign: "center", mt: 2 }}>
            <Link href="/forgot-password" style={{ color: "#1976d2", textDecoration: "none" }}>
              Solicitar Nuevo Token
            </Link>
          </Box>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <Typography
            variant="h4"
            component="h1"
            sx={{ mb: 3, textAlign: "center", fontWeight: 600 }}
          >
            ¡Contraseña Restablecida!
          </Typography>
          <Alert severity="success" sx={{ mb: 2 }}>
            <Box>
              <p>Tu contraseña ha sido restablecida exitosamente.</p>
              <p>Ahora puedes iniciar sesión con tu nueva contraseña.</p>
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

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <Typography
          variant="h4"
          component="h1"
          sx={{ mb: 3, textAlign: "center", fontWeight: 600 }}
        >
          Nueva Contraseña
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
            label="Nueva Contraseña"
            type={showPassword ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            disabled={isLoading}
            placeholder="••••••••"
            fullWidth
            variant="outlined"
            inputProps={{ minLength: 8 }}
            helperText="Mínimo 8 caracteres"
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
            {isLoading ? "Restableciendo..." : "Restablecer Contraseña"}
          </Button>
        </Box>

        <Box sx={{ textAlign: "center", mt: 2 }}>
          <Link href="/login" style={{ color: "#1976d2", textDecoration: "none" }}>
            Volver a Iniciar Sesión
          </Link>
        </Box>
      </div>
    </div>
  );
}

/**
 * Reset password page component
 */
export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.container}>
          <div className={styles.card}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: 200,
              }}
            >
              <CircularProgress />
            </Box>
          </div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
