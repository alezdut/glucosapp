import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { render } from "@testing-library/react";
import TabNavigator from "../TabNavigator";
import { useUnreadMessagesFromDoctor } from "../../hooks/useMessages";
import { useNavigation } from "@react-navigation/native";

const capturedScreens: Array<{ name: string; options?: any; listeners?: any }> = [];

jest.mock("@react-navigation/bottom-tabs", () => ({
  createBottomTabNavigator: jest.fn(() => ({
    Navigator: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Screen: ({ name, options, listeners }: { name: string; options?: any; listeners?: any }) => {
      capturedScreens.push({ name, options, listeners });
      return <div data-testid={`tab-screen-${name}`}>{name}</div>;
    },
  })),
}));

jest.mock("@react-navigation/native", () => ({
  useNavigation: jest.fn(),
}));

jest.mock("../screenOptions", () => ({
  getTabBarScreenOptions: jest.fn(() => ({ headerShown: false })),
}));

jest.mock("../../hooks/useMessages", () => ({
  useUnreadMessagesFromDoctor: jest.fn(),
}));

jest.mock("../HomeStackNavigator", () => () => <div>home-stack</div>);
jest.mock("../../screens/HistoryScreen", () => () => <div>history</div>);
jest.mock("../../screens/RegistrarScreen", () => () => <div>registrar</div>);
jest.mock("../../screens/DoctorScreen", () => () => <div>doctor</div>);
jest.mock("../../screens/ProfileScreen", () => () => <div>profile</div>);

const mockUseUnreadMessagesFromDoctor = useUnreadMessagesFromDoctor as jest.MockedFunction<
  typeof useUnreadMessagesFromDoctor
>;
const mockUseNavigation = useNavigation as jest.MockedFunction<typeof useNavigation>;

describe("TabNavigator", () => {
  beforeEach(() => {
    capturedScreens.length = 0;
    jest.clearAllMocks();
  });

  it("configures doctor tab badge and intercepts tab press when unread messages exist", () => {
    const navigate = jest.fn();
    mockUseNavigation.mockReturnValue({ navigate } as never);
    mockUseUnreadMessagesFromDoctor.mockReturnValue({ data: 12 } as never);

    render(<TabNavigator />);

    const doctorScreen = capturedScreens.find((screen) => screen.name === "Médico");
    expect(doctorScreen).toBeTruthy();
    expect(doctorScreen?.options.tabBarBadge).toBe("9+");

    const preventDefault = jest.fn();
    doctorScreen?.listeners.tabPress({ preventDefault });

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith("Communication");
  });

  it("does not intercept doctor tab press when there are no unread messages", () => {
    const navigate = jest.fn();
    mockUseNavigation.mockReturnValue({ navigate } as never);
    mockUseUnreadMessagesFromDoctor.mockReturnValue({ data: 0 } as never);

    render(<TabNavigator />);

    const doctorScreen = capturedScreens.find((screen) => screen.name === "Médico");
    expect(doctorScreen?.options.tabBarBadge).toBeUndefined();

    const preventDefault = jest.fn();
    doctorScreen?.listeners.tabPress({ preventDefault });

    expect(preventDefault).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("renders tab icons and shows numeric doctor badge for single-digit unread count", () => {
    const navigate = jest.fn();
    mockUseNavigation.mockReturnValue({ navigate } as never);
    mockUseUnreadMessagesFromDoctor.mockReturnValue({ data: 3 } as never);

    render(<TabNavigator />);

    const expectedScreens = ["Inicio", "Historial", "Registrar", "Médico", "Perfil"];

    expectedScreens.forEach((name) => {
      const screenConfig = capturedScreens.find((screen) => screen.name === name);
      expect(screenConfig).toBeTruthy();
      const icon = screenConfig?.options?.tabBarIcon?.({ color: "black", size: 20 });
      expect(icon).toBeTruthy();
    });

    const doctorScreen = capturedScreens.find((screen) => screen.name === "Médico");
    expect(doctorScreen?.options.tabBarBadge).toBe(3);
  });
});
