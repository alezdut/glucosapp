import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Home, BookOpen, PlusCircle, Stethoscope, User } from "lucide-react-native";

import { getTabBarScreenOptions } from "./screenOptions";
import { RootTabParamList } from "./types";

// Import navigators and screens
import HomeStackNavigator from "./HomeStackNavigator";
import HistoryScreen from "../screens/HistoryScreen";
import RegistrarScreen from "../screens/RegistrarScreen";
import DoctorScreen from "../screens/DoctorScreen";
import ProfileScreen from "../screens/ProfileScreen";

const Tab = createBottomTabNavigator<RootTabParamList>();

export default function TabNavigator() {
  return (
    <Tab.Navigator screenOptions={getTabBarScreenOptions()}>
      <Tab.Screen
        name="Inicio"
        component={HomeStackNavigator}
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
        name="Registrar"
        component={RegistrarScreen}
        options={{
          tabBarIcon: ({ color, size }) => <PlusCircle size={size} color={color} />,
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
