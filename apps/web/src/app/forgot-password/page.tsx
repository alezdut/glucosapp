"use client";
import { useState, FormEvent } from "react";
import Link from "next/link";
import { TextField, Button, Box, Typography, Alert, useTheme } from "@mui/material";
import { forgotPassword } from "@/lib/auth-api";
import styles from "@/components/auth-form.module.css";

/**
 * Forgot password page component
 */
export default function ForgotPasswordPage() {
  const theme = useTheme();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setIsLoading(true);

    try {
      await forgotPassword(email);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar email");
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
            Email Enviado
          </Typography>
          <Alert severity="success" sx={{ mb: 2 }}>
            <Box>
              <p>
                Si existe una cuenta con ese email, te hemos enviado instrucciones para restablecer
                tu contraseña.
              </p>
              <p>Por favor, revisa tu bandeja de entrada.</p>
            </Box>
          </Alert>
          <Box sx={{ textAlign: "center", mt: 2 }}>
            <Link
              href="/login"
              style={{ color: theme.palette.primary.main, textDecoration: "none" }}
            >
              Volver a Iniciar Sesión
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
          Restablecer Contraseña
        </Typography>

        <Alert severity="info" sx={{ mb: 2 }}>
          Ingresa tu email y te enviaremos instrucciones para restablecer tu contraseña.
        </Alert>

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

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={isLoading}
            fullWidth
            sx={{ mt: 1, py: 1.5 }}
          >
            {isLoading ? "Enviando..." : "Enviar Email"}
          </Button>
        </Box>

        <Box sx={{ textAlign: "center", mt: 2 }}>
          <Link href="/login" style={{ color: theme.palette.primary.main, textDecoration: "none" }}>
            Volver a Iniciar Sesión
          </Link>
        </Box>
      </div>
    </div>
  );
}
