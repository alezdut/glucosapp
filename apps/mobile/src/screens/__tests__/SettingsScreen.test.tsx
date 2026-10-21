import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { screen } from "@testing-library/react";
import SettingsScreen from "../SettingsScreen";
import { renderMobile } from "../../../test/render-mobile";

describe("SettingsScreen", () => {
  it("renders the settings copy", () => {
    renderMobile(<SettingsScreen />);

    expect(screen.getByText("Configuración")).toBeTruthy();
    expect(screen.getByText("Ajustes de la aplicación")).toBeTruthy();
  });
});
