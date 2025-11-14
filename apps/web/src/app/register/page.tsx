"use client";
import { useState, FormEvent, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TextField, Button, Box, Typography, Alert } from "@mui/material";
import { useAuth } from "@/contexts/auth-context";
import { PasswordField } from "@/components/PasswordField";
import { type PasswordStrength } from "@glucosapp/utils";
import { BrandLogo } from "@/components/BrandLogo";
import styles from "@/components/auth-form.module.css";

/**
 * Registration page component
 */
export default function RegisterPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

    if (passwordStrength !== "strong") {
      setError(
        "La contraseña debe tener al menos 8 caracteres e incluir mayúsculas, números y símbolos especiales",
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

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <Box
          sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5, mb: 2 }}
        >
          <BrandLogo size={80} color="#6B9BD1" />
          <Typography variant="h3" component="div" sx={{ fontWeight: 700 }}>
            GlucosApp
          </Typography>
        </Box>
        <Typography
          variant="h6"
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

          <PasswordField
            label="Contraseña"
            value={password}
            onChange={setPassword}
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
