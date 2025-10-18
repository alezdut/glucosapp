import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Home, BookOpen, Calculator, Stethoscope, User } from "lucide-react-native";

import { getTabBarScreenOptions } from "./screenOptions";
import { RootTabParamList } from "./types";

// Import screens
import HomeScreen from "../screens/HomeScreen";
import HistoryScreen from "../screens/HistoryScreen";
import CalculatorScreen from "../screens/CalculatorScreen";
import DoctorScreen from "../screens/DoctorScreen";
import ProfileScreen from "../screens/ProfileScreen";

const Tab = createBottomTabNavigator<RootTabParamList>();

export default function TabNavigator() {
  return (
    <Tab.Navigator screenOptions={getTabBarScreenOptions()}>
      <Tab.Screen
        name="Inicio"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Historial"
        component={HistoryScreen}
        options={{
          tabBarIcon: ({ color, size }) => <BookOpen size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Calcular"
        component={CalculatorScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Calculator size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Médico"
        component={DoctorScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Stethoscope size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Perfil"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
          headerShown: false,
        }}
      />
    </Tab.Navigator>
  );
}
