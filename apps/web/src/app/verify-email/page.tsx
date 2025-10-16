"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { verifyEmail, resendVerification } from "@/lib/auth-api";
import styles from "@/components/auth-form.module.css";

/**
 * Email verification page content component
 */
function VerifyEmailContent() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [isResending, setIsResending] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const hasVerified = useRef(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    // Prevent double execution in React StrictMode
    if (hasVerified.current) {
      return;
    }

    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setMessage("Token de verificación no proporcionado");
      return;
    }

    hasVerified.current = true;

    verifyEmail(token)
      .then((response) => {
        setStatus("success");
        setMessage(response.message);
        // Clear any existing timeout before scheduling a new one
        if (timeoutRef.current !== null) {
          clearTimeout(timeoutRef.current);
        }
        // Redirect to login after 3 seconds
        timeoutRef.current = window.setTimeout(() => router.push("/login"), 3000);
      })
      .catch((error) => {
        setStatus("error");
        setMessage(error.message || "Error al verificar email");
      });

    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [searchParams, router]);

  const handleResendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResending(true);
    try {
      const response = await resendVerification(email);
      setMessage(response.message);
      setStatus("success");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error al reenviar verificación");
      setStatus("error");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Verificación de Email</h1>

        {status === "loading" && (
          <div className={styles.loading}>
            <p>Verificando tu email...</p>
          </div>
        )}

        {status === "success" && (
          <>
            <div className={styles.success}>{message}</div>
            <div className={styles.link}>
              <Link href="/login">Ir a Iniciar Sesión</Link>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <div className={styles.error}>{message}</div>
            <div className={styles.info}>
              <p>¿Tu token de verificación expiró?</p>
              <p>Puedes solicitar un nuevo email de verificación:</p>
            </div>
            <form onSubmit={handleResendVerification} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="email" className={styles.label}>
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={styles.input}
                  required
                  disabled={isResending}
                  placeholder="tu@email.com"
                />
              </div>
              <button type="submit" className={styles.button} disabled={isResending}>
                {isResending ? "Reenviando..." : "Reenviar Verificación"}
              </button>
            </form>
            <div className={styles.link}>
              <Link href="/login">Volver a Inicio de Sesión</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Email verification page component
 */
export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.container}>
          <div className={styles.card}>
            <div className={styles.loading}>
              <p>Cargando...</p>
            </div>
          </div>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
