import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { render, screen } from "@testing-library/react";

jest.unmock("../BrandLogo");

jest.mock("react-native-svg", () => ({
  __esModule: true,
  default: ({ children, accessibilityLabel, accessibilityRole, ...props }: any) => (
    <svg
      data-testid="brand-svg"
      aria-label={accessibilityLabel}
      role={accessibilityRole === "image" ? "img" : undefined}
      {...props}
    >
      {children}
    </svg>
  ),
  G: ({ children, ...props }: any) => (
    <g data-testid="brand-group" {...props}>
      {children}
    </g>
  ),
  Path: (props: any) => <path data-testid="brand-path" {...props} />,
  Circle: (props: any) => <circle data-testid="brand-circle" {...props} />,
  Rect: (props: any) => <rect data-testid="brand-rect" {...props} />,
}));

const { BrandLogo } = require("../BrandLogo") as typeof import("../BrandLogo");

describe("BrandLogo", () => {
  it("renders default logo without background", () => {
    render(<BrandLogo />);

    expect(screen.getByTestId("brand-svg")).toBeTruthy();
    expect(screen.getByRole("img", { name: "GlucosApp logo" })).toBeTruthy();
    expect(screen.queryByTestId("brand-rect")).toBeNull();
    expect(screen.getAllByTestId("brand-circle").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("brand-path").length).toBeGreaterThan(1);
  });

  it("renders background and custom accessibility label", () => {
    render(<BrandLogo showBackground accessibilityLabel="logo personalizado" />);

    expect(screen.getByRole("img", { name: "logo personalizado" })).toBeTruthy();
    expect(screen.getByTestId("brand-rect")).toBeTruthy();
  });
});
