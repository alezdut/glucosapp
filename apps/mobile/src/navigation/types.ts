import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

// Define the parameter list for the bottom tab navigator
export type RootTabParamList = {
  Home: undefined;
  Stats: undefined;
  Scan: undefined;
  Profile: undefined;
  Settings: undefined;
};

// Define the parameter list for the root stack navigator (if needed in the future)
export type RootStackParamList = {
  MainTabs: undefined;
  // Add other stack screens here if needed
};

// Create composite screen props for tab screens
export type RootTabScreenProps<Screen extends keyof RootTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<RootTabParamList, Screen>,
  NativeStackScreenProps<RootStackParamList>
>;

// Navigation prop types for individual screens
export type HomeScreenProps = RootTabScreenProps<"Home">;
export type StatsScreenProps = RootTabScreenProps<"Stats">;
export type ScanScreenProps = RootTabScreenProps<"Scan">;
export type ProfileScreenProps = RootTabScreenProps<"Profile">;
export type SettingsScreenProps = RootTabScreenProps<"Settings">;
