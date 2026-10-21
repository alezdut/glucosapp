import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../theme";
import { useAuth } from "../contexts/AuthContext";
import { BrandLogo } from "../components/BrandLogo";

/**
 * WelcomeScreen component
 * Displays password sign-in with optional Google authentication
 */
export default function WelcomeScreen() {
  const { signInWithGoogle, signInWithPassword, isLoading } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handlePasswordSignIn = async () => {
    setError("");
    try {
      await signInWithPassword(email, password);
    } catch {
      setError("No se pudo iniciar sesión. Revisá tus credenciales y la conexión.");
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Sign in error:", error);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        flexGrow: 1,
        paddingTop: insets.top + theme.spacing.lg,
        paddingBottom: insets.bottom + theme.spacing.lg,
      }}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      {/* Logo/Icon Section */}
      <View style={styles.logoSection}>
        <View style={styles.iconContainer}>
          <BrandLogo size={56} accessibilityLabel="GlucosApp logo" />
        </View>
        <Text style={styles.appName}>GlucosApp</Text>
        <Text style={styles.tagline}>Tu control, Más simple cada día</Text>
      </View>

      {/* Welcome Message Section */}
      <View style={styles.contentSection}>
        <Text style={styles.title}>Bienvenido</Text>
        <Text style={styles.subtitle}>Inicia sesión para continuar gestionando tu salud.</Text>

        <TextInput
          style={styles.input}
          accessibilityLabel="Email"
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoading}
        />
        <TextInput
          style={styles.input}
          accessibilityLabel="Contraseña"
          placeholder="Contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          editable={!isLoading}
          onSubmitEditing={() => {
            if (email.trim() && password && !isLoading) void handlePasswordSignIn();
          }}
        />
        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}
        <TouchableOpacity
          style={[
            styles.googleButton,
            (isLoading || !email.trim() || !password) && styles.buttonDisabled,
          ]}
          disabled={isLoading || !email.trim() || !password}
          onPress={handlePasswordSignIn}
        >
          <Text style={styles.googleButtonText}>Iniciar sesión</Text>
        </TouchableOpacity>
        <Text style={styles.alternative}>O usá tu cuenta de Google</Text>
        {/* Google Sign In Button */}
        <TouchableOpacity
          style={[styles.googleButton, isLoading && styles.buttonDisabled]}
          accessibilityLabel="Continuar con Google"
          onPress={handleGoogleSignIn}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={theme.colors.background} />
          ) : (
            <>
              <View style={styles.googleIconContainer}>
                <Text style={styles.googleIcon}>G</Text>
              </View>
              <Text style={styles.googleButtonText}>Continuar con Google</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.lg,
    justifyContent: "flex-start",
  },
  logoSection: {
    alignItems: "center",
    marginBottom: theme.spacing.xxxl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.md,
    // Simple border instead of shadow for the icon
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  iconText: {
    fontSize: 48,
    fontWeight: "bold",
    color: theme.colors.text,
  },
  appName: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  tagline: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  contentSection: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    textAlign: "center",
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    lineHeight: 24,
  },
  googleButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    width: "100%",
    maxWidth: 320,
    shadowColor: theme.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  input: {
    width: "100%",
    maxWidth: 320,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    color: theme.colors.text,
  },
  error: { color: "#B91C1C", marginBottom: theme.spacing.md, textAlign: "center" },
  alternative: { color: theme.colors.textSecondary, marginVertical: theme.spacing.md },
  buttonDisabled: {
    opacity: 0.6,
  },
  googleIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacing.sm,
  },
  googleIcon: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.colors.primary,
  },
  googleButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.md,
    fontWeight: "600",
  },
});
