import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { render, screen } from "@testing-library/react";
import RootNavigator from "../RootNavigator";

jest.mock("@react-navigation/native-stack", () => ({
  createNativeStackNavigator: jest.fn(() => ({
    Navigator: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Screen: ({ name }: { name: string }) => <div data-testid={`root-screen-${name}`}>{name}</div>,
  })),
}));

jest.mock("../TabNavigator", () => () => <div>tabs</div>);
jest.mock("../../screens/CalculatorScreen", () => () => <div>calculator</div>);
jest.mock("../../screens/TreatmentParametersScreen", () => () => <div>treatment</div>);
jest.mock("../../screens/CommunicationScreen", () => () => <div>communication</div>);
jest.mock("../../screens/AppointmentsScreen", () => () => <div>appointments</div>);

describe("RootNavigator", () => {
  it("renders all root stack screens", () => {
    render(<RootNavigator />);

    expect(screen.getByTestId("root-screen-MainTabs")).toBeTruthy();
    expect(screen.getByTestId("root-screen-Calculator")).toBeTruthy();
    expect(screen.getByTestId("root-screen-TreatmentParameters")).toBeTruthy();
    expect(screen.getByTestId("root-screen-Communication")).toBeTruthy();
    expect(screen.getByTestId("root-screen-Appointments")).toBeTruthy();
  });
});
