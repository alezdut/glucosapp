import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Home, BarChart3, Camera, User, Settings } from "lucide-react-native";

import { getPlatformTheme } from "../theme";
import { getTabBarScreenOptions, getScanTabOptions } from "./screenOptions";
import { RootTabParamList } from "./types";

// Import screens
import HomeScreen from "../screens/HomeScreen";
import ScanScreen from "../screens/ScanScreen";
import StatsScreen from "../screens/StatsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import SettingsScreen from "../screens/SettingsScreen";

const Tab = createBottomTabNavigator<RootTabParamList>();

export default function TabNavigator() {
  const { platformConfig } = getPlatformTheme();

  return (
    <Tab.Navigator screenOptions={getTabBarScreenOptions()}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <BarChart3 size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Scan"
        component={ScanScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Camera size={size + 8} color={platformConfig.tabBarIconActive} />
          ),
          ...getScanTabOptions(),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
