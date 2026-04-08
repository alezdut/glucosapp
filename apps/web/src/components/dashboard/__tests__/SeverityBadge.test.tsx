"use client";

import { render, screen } from "@testing-library/react";
import { SeverityBadge } from "../SeverityBadge";

describe("SeverityBadge", () => {
  it("renders the proper labels for each severity", () => {
    const { rerender } = render(<SeverityBadge severity="critical" />);
    expect(screen.getByText("Crítica")).toBeInTheDocument();

    rerender(<SeverityBadge severity="high" />);
    expect(screen.getByText("Alta")).toBeInTheDocument();

    rerender(<SeverityBadge severity="medium" />);
    expect(screen.getByText("Media")).toBeInTheDocument();

    rerender(<SeverityBadge severity="low" />);
    expect(screen.getByText("Baja")).toBeInTheDocument();
  });
});
