"use client";

import { fireEvent, render, screen } from "@testing-library/react";
import { NotificationFrequency } from "@glucosapp/types";
import { IndividualAlertConfig } from "../IndividualAlertConfig";

describe("IndividualAlertConfig", () => {
  const baseProps = {
    enabled: true,
    onEnabledChange: jest.fn(),
    threshold: 80,
    onThresholdChange: jest.fn(),
    severity: "critical" as const,
    frequency: NotificationFrequency.IMMEDIATE,
    onFrequencyChange: jest.fn(),
    thresholdLabel: "Hipoglucemia",
    thresholdUnit: "mg/dL",
    thresholdError: "",
    showFrequency: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the enabled configuration and updates threshold/frequency", () => {
    render(<IndividualAlertConfig {...baseProps} />);

    expect(screen.getByText("Crítica")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: /hipoglucemia/i }));
    expect(baseProps.onEnabledChange).toHaveBeenCalledWith(false);

    fireEvent.change(screen.getAllByLabelText("Hipoglucemia")[1], {
      target: { value: "95" },
    });
    expect(baseProps.onThresholdChange).toHaveBeenCalledWith(95);

    fireEvent.mouseDown(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("option", { name: /diario/i }));
    expect(baseProps.onFrequencyChange).toHaveBeenCalledWith(NotificationFrequency.DAILY);
  });

  it("handles empty thresholds and hides frequency when disabled", () => {
    const { rerender } = render(
      <IndividualAlertConfig {...baseProps} thresholdError="Requerido" />,
    );

    fireEvent.change(screen.getAllByLabelText("Hipoglucemia")[1], {
      target: { value: "" },
    });
    expect(baseProps.onThresholdChange).toHaveBeenCalledWith(0);
    expect(screen.getByText("Requerido")).toBeInTheDocument();

    rerender(<IndividualAlertConfig {...baseProps} enabled={false} showFrequency={false} />);
    expect(
      screen.queryByRole("combobox", { name: /frecuencia de notificación/i }),
    ).not.toBeInTheDocument();
  });
});
