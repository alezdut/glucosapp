import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "../screens/HomeScreen";
import CalculatorScreen from "../screens/CalculatorScreen";

export type HomeStackParamList = {
  Home: undefined;
  Calculator: undefined;
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

/**
 * HomeStackNavigator - Handles navigation between Home and Calculator
 * Calculator screen is only accessible from Home, not from bottom tabs
 */
export default function HomeStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Calculator"
        component={CalculatorScreen}
        options={{
          headerShown: true,
          title: "Calcular",
          headerBackTitle: "Volver",
        }}
      />
    </Stack.Navigator>
  );
}
