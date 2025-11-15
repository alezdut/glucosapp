import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import WelcomeScreen from "../screens/WelcomeScreen";
import OnboardingScreen from "../screens/OnboardingScreen";
import { useAuth } from "../contexts/AuthContext";

export type AuthStackParamList = {
  Welcome: undefined;
  Onboarding: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

/**
 * AuthNavigator component
 * Handles authentication flow navigation
 */
export default function AuthNavigator() {
  const { needsOnboarding, isAuthenticated } = useAuth();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#FFFFFF" },
      }}
    >
      {!isAuthenticated ? (
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
      ) : needsOnboarding ? (
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      ) : null}
    </Stack.Navigator>
  );
}
