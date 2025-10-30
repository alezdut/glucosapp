import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "../screens/HomeScreen";
import NFCScanScreen from "../screens/NFCScanScreen";

export type HomeStackParamList = {
  Home: undefined;
  NFCScan: undefined;
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

/**
 * HomeStackNavigator - Handles navigation for Home screen and NFC scanning
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
        name="NFCScan"
        component={NFCScanScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}
