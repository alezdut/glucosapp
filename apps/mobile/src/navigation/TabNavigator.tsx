import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useNavigation, type TabPressEvent } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Home, BookOpen, PlusCircle, Stethoscope, User } from "lucide-react-native";

import { getTabBarScreenOptions } from "./screenOptions";
import { RootTabParamList, RootStackParamList } from "./types";
import { useUnreadMessagesFromDoctor } from "../hooks/useMessages";

// Import navigators and screens
import HomeStackNavigator from "./HomeStackNavigator";
import HistoryScreen from "../screens/HistoryScreen";
import RegistrarScreen from "../screens/RegistrarScreen";
import DoctorScreen from "../screens/DoctorScreen";
import ProfileScreen from "../screens/ProfileScreen";

const Tab = createBottomTabNavigator<RootTabParamList>();

export default function TabNavigator() {
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data: unreadCount = 0 } = useUnreadMessagesFromDoctor();

  const handleDoctorTabPress = (e: TabPressEvent) => {
    // If there are unread messages, navigate to Communication screen
    if (unreadCount > 0) {
      e.preventDefault();
      rootNavigation.navigate("Communication");
    }
    // Otherwise, let the default behavior happen (navigate to DoctorScreen)
  };

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
          tabBarBadge: unreadCount > 0 ? (unreadCount > 9 ? "9+" : unreadCount) : undefined,
        }}
        listeners={{
          tabPress: handleDoctorTabPress,
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
