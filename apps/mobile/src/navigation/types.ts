import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps, NavigatorScreenParams } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { HomeStackParamList } from "./HomeStackNavigator";

// Define the parameter list for the root stack navigator
export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<RootTabParamList> | undefined;
  Calculator: undefined;
};

// Define the parameter list for the bottom tab navigator
export type RootTabParamList = {
  Inicio: NavigatorScreenParams<HomeStackParamList> | undefined;
  Historial: undefined;
  Registrar: { carbohydrates?: number } | undefined;
  Médico: undefined;
  Perfil: undefined;
};

// Create composite screen props for tab screens
export type RootTabScreenProps<Screen extends keyof RootTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<RootTabParamList, Screen>,
  NativeStackScreenProps<RootStackParamList>
>;

// Navigation prop types for individual screens
export type HomeScreenProps = RootTabScreenProps<"Inicio">;
export type HistoryScreenProps = RootTabScreenProps<"Historial">;
export type RegistrarScreenProps = RootTabScreenProps<"Registrar">;
export type DoctorScreenProps = RootTabScreenProps<"Médico">;
export type ProfileScreenProps = RootTabScreenProps<"Perfil">;
