import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { fireEvent, screen } from "@testing-library/react";
import ScreenHeader from "../ScreenHeader";
import { renderMobile } from "../../../test/render-mobile";

describe("ScreenHeader", () => {
  it("renders title and subtitle", () => {
    renderMobile(<ScreenHeader title="Mi perfil" subtitle="Configura tus datos" />);

    expect(screen.getByText("Mi perfil")).toBeTruthy();
    expect(screen.getByText("Configura tus datos")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders back button and calls onBack", () => {
    const onBack = jest.fn();

    renderMobile(<ScreenHeader title="Historial" onBack={onBack} />);

    const backButton = screen.getByRole("button");
    fireEvent.click(backButton);

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Configura tus datos")).toBeNull();
  });
});
