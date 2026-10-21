import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { screen } from "@testing-library/react";
import StatsScreen from "../StatsScreen";
import { renderMobile } from "../../../test/render-mobile";

describe("StatsScreen", () => {
  it("renders the stats copy", () => {
    renderMobile(<StatsScreen />);

    expect(screen.getByText("Estadísticas")).toBeTruthy();
    expect(screen.getByText("Gráficos y análisis de glucosa")).toBeTruthy();
  });
});
