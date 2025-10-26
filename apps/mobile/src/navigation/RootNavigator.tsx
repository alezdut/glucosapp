import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import TabNavigator from "./TabNavigator";
import CalculatorScreen from "../screens/CalculatorScreen";

export type RootStackParamList = {
  MainTabs: undefined;
  Calculator: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * RootNavigator - Main navigation structure
 * Contains TabNavigator and Calculator as separate screens
 */
export default function RootNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="MainTabs"
        component={TabNavigator}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Calculator"
        component={CalculatorScreen}
        options={{
          headerShown: false,
          presentation: "card",
        }}
      />
    </Stack.Navigator>
  );
}
