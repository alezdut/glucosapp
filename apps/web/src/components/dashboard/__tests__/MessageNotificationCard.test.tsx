"use client";

import { fireEvent, render, screen } from "@testing-library/react";
import { createMockRouter } from "@/test/navigation";
import { useRouter } from "next/navigation";
import { MessageNotificationCard } from "../MessageNotificationCard";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

describe("MessageNotificationCard", () => {
  let router = createMockRouter();

  beforeEach(() => {
    jest.clearAllMocks();
    router = createMockRouter();
    mockUseRouter.mockReturnValue(router);
  });

  it("navigates to the conversation and calls onRead", () => {
    const onRead = jest.fn();
    render(
      <MessageNotificationCard
        patientId="patient-1"
        patientName="Ana Paz"
        onRead={onRead}
        message={
          {
            content: "Mensaje corto",
            createdAt: "2026-04-08T10:00:00.000Z",
          } as never
        }
      />,
    );

    fireEvent.click(screen.getByText(/ana paz:/i));
    expect(router.push).toHaveBeenCalledWith("/dashboard/communication?patientId=patient-1");
    expect(onRead).toHaveBeenCalled();
  });

  it("truncates long content and dismisses without navigating", () => {
    const onDismiss = jest.fn();
    render(
      <MessageNotificationCard
        patientId="patient-2"
        patientName="Luis Vega"
        messageCount={3}
        onDismiss={onDismiss}
        message={
          {
            content: "x".repeat(120),
            createdAt: "2026-04-08T10:00:00.000Z",
          } as never
        }
      />,
    );

    expect(screen.getByText(/3 mensajes nuevos/i)).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText(`${"x".repeat(100)}...`)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /cerrar notificación/i }));
    expect(onDismiss).toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });
});
