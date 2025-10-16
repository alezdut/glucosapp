"use client";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { ProtectedRoute } from "@/components/protected-route";
import styles from "@/components/auth-form.module.css";

/**
 * Dashboard page showing user information
 */
export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <ProtectedRoute>
      <div className={styles.container}>
        <div className={styles.card}>
          <h1 className={styles.title}>Dashboard</h1>

          {user && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ marginBottom: 16 }}>
                <strong style={{ display: "block", marginBottom: 4, color: "#555" }}>Email:</strong>
                <span>{user.email}</span>
              </div>

              {(user.firstName || user.lastName) && (
                <div style={{ marginBottom: 16 }}>
                  <strong style={{ display: "block", marginBottom: 4, color: "#555" }}>
                    Nombre:
                  </strong>
                  <span>
                    {user.firstName} {user.lastName}
                  </span>
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <strong style={{ display: "block", marginBottom: 4, color: "#555" }}>
                  Estado de Verificación:
                </strong>
                <span>
                  {user.emailVerified ? (
                    <span style={{ color: "#3a3" }}>✓ Verificado</span>
                  ) : (
                    <span style={{ color: "#c33" }}>✗ No Verificado</span>
                  )}
                </span>
              </div>

              <div style={{ marginBottom: 16 }}>
                <strong style={{ display: "block", marginBottom: 4, color: "#555" }}>
                  Cuenta creada:
                </strong>
                <span>{new Date(user.createdAt).toLocaleDateString("es-ES")}</span>
              </div>
            </div>
          )}

          <button onClick={handleLogout} className={styles.button}>
            Cerrar Sesión
          </button>
        </div>
      </div>
    </ProtectedRoute>
  );
}
