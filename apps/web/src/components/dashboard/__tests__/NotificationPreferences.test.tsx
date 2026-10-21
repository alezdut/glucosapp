"use client";

import { fireEvent, render, screen } from "@testing-library/react";
import { NotificationFrequency } from "@glucosapp/types";
import { NotificationPreferences } from "../NotificationPreferences";

describe("NotificationPreferences", () => {
  const baseProps = {
    channels: {
      dashboard: true,
      email: false,
    },
    onChannelsChange: jest.fn(),
    notificationFrequency: NotificationFrequency.IMMEDIATE,
    dailySummaryTime: "08:00",
    onDailySummaryTimeChange: jest.fn(),
    quietHoursEnabled: false,
    onQuietHoursChange: jest.fn(),
    quietHoursStart: "22:00",
    onQuietHoursStartChange: jest.fn(),
    quietHoursEnd: "07:00",
    onQuietHoursEndChange: jest.fn(),
    criticalAlertsIgnoreQuietHours: false,
    onCriticalAlertsIgnoreQuietHoursChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders channels and updates email", () => {
    render(<NotificationPreferences {...baseProps} />);

    expect(screen.getByText(/canales de notificación/i)).toBeInTheDocument();
    const dashboardCheckbox = screen.getByRole("checkbox", { name: /dashboard/i });
    const emailCheckbox = screen.getByRole("checkbox", { name: /email/i });

    expect(dashboardCheckbox).toBeDisabled();
    fireEvent.click(emailCheckbox);
    expect(baseProps.onChannelsChange).toHaveBeenCalledWith({
      dashboard: true,
      email: true,
    });
  });

  it("shows daily and weekly summary controls", () => {
    const { rerender } = render(
      <NotificationPreferences
        {...baseProps}
        notificationFrequency={NotificationFrequency.DAILY}
      />,
    );

    expect(screen.getByLabelText(/hora para resumen diario/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/hora para resumen diario/i), {
      target: { value: "09:30" },
    });
    expect(baseProps.onDailySummaryTimeChange).toHaveBeenCalledWith("09:30");

    rerender(
      <NotificationPreferences
        {...baseProps}
        notificationFrequency={NotificationFrequency.WEEKLY}
      />,
    );
    expect(screen.getByLabelText(/hora para resumen semanal/i)).toBeInTheDocument();
  });

  it("toggles quiet hours and critical override", () => {
    const { rerender } = render(<NotificationPreferences {...baseProps} />);

    fireEvent.click(screen.getByRole("checkbox", { name: /activar horario de silencio/i }));
    expect(baseProps.onQuietHoursChange).toHaveBeenCalledWith(true);

    rerender(
      <NotificationPreferences {...baseProps} quietHoursEnabled criticalAlertsIgnoreQuietHours />,
    );

    fireEvent.change(screen.getByLabelText(/^desde$/i), {
      target: { value: "23:00" },
    });
    fireEvent.change(screen.getByLabelText(/^hasta$/i), {
      target: { value: "06:30" },
    });
    expect(baseProps.onQuietHoursStartChange).toHaveBeenCalledWith("23:00");
    expect(baseProps.onQuietHoursEndChange).toHaveBeenCalledWith("06:30");

    fireEvent.click(
      screen.getByRole("checkbox", {
        name: /las alertas críticas ignoran el horario de silencio/i,
      }),
    );
    expect(baseProps.onCriticalAlertsIgnoreQuietHoursChange).toHaveBeenCalledWith(false);
  });
});
