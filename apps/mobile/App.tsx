import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { RootNavigator, AuthNavigator } from "./src/navigation";
import { AuthProvider, useAuth } from "./src/contexts/AuthContext";
import { theme } from "./src/theme";

/**
 * Main navigation wrapper that renders auth or main navigation
 */
function AppNavigator() {
  const { isAuthenticated, needsOnboarding, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!isAuthenticated || needsOnboarding ? <AuthNavigator /> : <RootNavigator />}
    </NavigationContainer>
  );
}

export default function App() {
  const [client] = React.useState(() => new QueryClient());

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={client}>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
});
