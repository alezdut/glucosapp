"use client";
import { useState, FormEvent, Suspense, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Box, Typography, Alert, CircularProgress } from "@mui/material";
import { resetPassword } from "@/lib/auth-api";
import { PasswordField } from "@/components/PasswordField";
import { type PasswordStrength } from "@/utils/password-validation";
import styles from "@/components/auth-form.module.css";

/**
 * Reset password page content component
 */
function ResetPasswordContent() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>("weak");
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

    if (passwordStrength !== "strong") {
      setError(
        "La contraseña debe tener al menos 8 caracteres e incluir mayúsculas, números y símbolos especiales",
      );
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
          <PasswordField
            label="Nueva Contraseña"
            value={newPassword}
            onChange={setNewPassword}
            required
            disabled={isLoading}
            showStrengthIndicator
            helperText="Debe incluir mayúsculas, números y símbolos especiales"
            onStrengthChange={setPasswordStrength}
          />

          <PasswordField
            label="Confirmar Contraseña"
            value={confirmPassword}
            onChange={setConfirmPassword}
            required
            disabled={isLoading}
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
