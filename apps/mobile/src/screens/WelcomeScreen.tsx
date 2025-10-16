import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image } from "react-native";
import { theme } from "../theme";
import { useAuth } from "../contexts/AuthContext";

/**
 * WelcomeScreen component
 * Displays welcome message and Google Sign-In button
 */
export default function WelcomeScreen() {
  const { signInWithGoogle, isLoading } = useAuth();

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Sign in error:", error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Logo/Icon Section */}
      <View style={styles.logoSection}>
        <View style={styles.iconContainer}>
          {/* Placeholder for app icon - using text as icon */}
          <Text style={styles.iconText}>✱</Text>
        </View>
        <Text style={styles.appName}>GlucosApp</Text>
        <Text style={styles.tagline}>Tu control, Más simple cada día</Text>
      </View>

      {/* Welcome Message Section */}
      <View style={styles.contentSection}>
        <Text style={styles.title}>Bienvenido</Text>
        <Text style={styles.subtitle}>Inicia sesión para continuar gestionando tu salud.</Text>

        {/* Google Sign In Button */}
        <TouchableOpacity
          style={[styles.googleButton, isLoading && styles.buttonDisabled]}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.lg,
    justifyContent: "center",
  },
  logoSection: {
    alignItems: "center",
    marginBottom: theme.spacing.xxxl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 16,
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
