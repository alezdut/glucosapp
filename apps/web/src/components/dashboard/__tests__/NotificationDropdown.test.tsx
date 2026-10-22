"use client";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NotificationDropdown } from "../NotificationDropdown";
import { useAcknowledgeBatch, useUnacknowledgedAlerts } from "@/hooks/useDashboard";
import { useConversations, useNewMessageNotifications } from "@/hooks/useMessages";
import { useAuth } from "@/contexts/auth-context";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateAlertQueries } from "@/lib/alert-utils";

const mockPathname = jest.fn(() => "/dashboard");
const mockSearchParamsGet = jest.fn(() => null);

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(() => mockPathname()),
  useSearchParams: jest.fn(() => ({ get: mockSearchParamsGet })),
}));

jest.mock("@/hooks/useDashboard", () => ({
  useUnacknowledgedAlerts: jest.fn(),
  useAcknowledgeBatch: jest.fn(),
}));

jest.mock("@/hooks/useMessages", () => ({
  useNewMessageNotifications: jest.fn(),
  useConversations: jest.fn(),
}));

jest.mock("@/contexts/auth-context", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@tanstack/react-query", () => ({
  ...jest.requireActual("@tanstack/react-query"),
  useQueryClient: jest.fn(),
}));

jest.mock("@/lib/alert-utils", () => ({
  invalidateAlertQueries: jest.fn(),
}));

jest.mock("../AlertCard", () => ({
  AlertCard: ({ alert, onAcknowledge }: { alert: { id: string }; onAcknowledge: () => void }) => (
    <div>
      <span>alert {alert.id}</span>
      <button onClick={onAcknowledge}>ack alert</button>
    </div>
  ),
}));

jest.mock("../MessageNotificationCard", () => ({
  MessageNotificationCard: ({
    patientName,
    onRead,
    onDismiss,
  }: {
    patientName: string;
    onRead: () => void;
    onDismiss: () => void;
  }) => (
    <div>
      <span>{patientName}</span>
      <button onClick={onRead}>read message</button>
      <button onClick={onDismiss}>dismiss message</button>
    </div>
  ),
}));

const mockUseUnacknowledgedAlerts = useUnacknowledgedAlerts as jest.MockedFunction<
  typeof useUnacknowledgedAlerts
>;
const mockUseAcknowledgeBatch = useAcknowledgeBatch as jest.MockedFunction<
  typeof useAcknowledgeBatch
>;
const mockUseNewMessageNotifications = useNewMessageNotifications as jest.MockedFunction<
  typeof useNewMessageNotifications
>;
const mockUseConversations = useConversations as jest.MockedFunction<typeof useConversations>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseQueryClient = useQueryClient as jest.MockedFunction<typeof useQueryClient>;
const mockInvalidateAlertQueries = invalidateAlertQueries as jest.MockedFunction<
  typeof invalidateAlertQueries
>;

describe("NotificationDropdown", () => {
  const queryClient = { invalidateQueries: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem("accessToken", "stored-access");
    mockPathname.mockReturnValue("/dashboard");
    mockSearchParamsGet.mockReturnValue(null);
    mockUseAuth.mockReturnValue({
      user: { id: "doctor-1" },
    } as never);
    mockUseQueryClient.mockReturnValue(queryClient as never);
    mockUseUnacknowledgedAlerts.mockReturnValue({
      data: [],
      isLoading: false,
    } as never);
    mockUseAcknowledgeBatch.mockReturnValue({
      mutateAsync: jest.fn().mockResolvedValue({}),
      isPending: false,
    } as never);
    mockUseNewMessageNotifications.mockReturnValue({
      notifications: [],
      clearNotification: jest.fn(),
    } as never);
    mockUseConversations.mockReturnValue({
      data: [],
    } as never);
  });

  it("shows an empty state when there are no notifications", () => {
    render(<NotificationDropdown />);

    fireEvent.click(screen.getByRole("button", { name: /notificaciones/i }));
    expect(screen.getByText(/no hay notificaciones nuevas/i)).toBeInTheDocument();
  });

  it("shows loading state and caps the badge count at 9+", () => {
    mockUseUnacknowledgedAlerts.mockReturnValue({
      data: new Array(10).fill(null).map((_, index) => ({ id: `alert-${index}` })),
      isLoading: true,
    } as never);

    render(<NotificationDropdown />);

    expect(screen.getByText("9+")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /notificaciones/i }));
    expect(screen.getByText(/cargando notificaciones/i)).toBeInTheDocument();
  });

  it("renders message and alert notifications and allows dismissing all alerts", async () => {
    const clearNotification = jest.fn();
    const mutateAsync = jest.fn().mockResolvedValue({});
    mockUseUnacknowledgedAlerts.mockReturnValue({
      data: [{ id: "alert-1" }],
      isLoading: false,
    } as never);
    mockUseAcknowledgeBatch.mockReturnValue({
      mutateAsync,
      isPending: false,
    } as never);
    mockUseNewMessageNotifications.mockReturnValue({
      notifications: [
        {
          patientId: "patient-1",
          patientName: "Ana Paz",
          messageCount: 1,
          latestMessage: {
            id: "m-1",
            createdAt: "2026-04-08T10:00:00.000Z",
            receiverId: "doctor-1",
          },
        },
      ],
      clearNotification,
    } as never);

    render(<NotificationDropdown />);

    fireEvent.click(screen.getByRole("button", { name: /notificaciones/i }));

    expect(screen.getByText("Ana Paz")).toBeInTheDocument();
    expect(screen.getByText("alert alert-1")).toBeInTheDocument();

    fireEvent.click(screen.getByText("read message"));
    expect(clearNotification).toHaveBeenCalledWith("patient-1");

    fireEvent.click(screen.getByText(/descartar todas \(1\)/i));
    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        token: "stored-access",
        acknowledgeAll: true,
      }),
    );
  });

  it("dismisses a message notification even when it comes from conversation unread state", () => {
    const clearNotification = jest.fn();
    mockUseNewMessageNotifications.mockReturnValue({
      notifications: [],
      clearNotification,
    } as never);
    mockUseConversations.mockReturnValue({
      data: [
        {
          participant: {
            id: "patient-3",
            email: "patient-3@example.com",
            firstName: "Leo",
            lastName: "Norte",
          },
          unreadCount: 2,
          messages: [
            {
              id: "m-10",
              read: false,
              receiverId: "doctor-1",
              createdAt: "2026-04-08T12:00:00.000Z",
            },
            {
              id: "m-11",
              read: false,
              receiverId: "doctor-1",
              createdAt: "2026-04-08T12:01:00.000Z",
            },
          ],
        },
      ],
    } as never);

    render(<NotificationDropdown />);

    fireEvent.click(screen.getByRole("button", { name: /notificaciones/i }));
    expect(screen.getByText("Leo Norte")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /dismiss message/i }));

    expect(screen.queryByText("Leo Norte")).not.toBeInTheDocument();
    expect(clearNotification).toHaveBeenCalledWith("patient-3");
  });

  it("closes when clicking outside and logs dismiss-all failures", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const mutateAsync = jest.fn().mockRejectedValue(new Error("dismiss failed"));
    mockUseUnacknowledgedAlerts.mockReturnValue({
      data: [{ id: "alert-1" }],
      isLoading: false,
    } as never);
    mockUseAcknowledgeBatch.mockReturnValue({
      mutateAsync,
      isPending: false,
    } as never);

    render(
      <div>
        <NotificationDropdown />
        <button>outside</button>
      </div>,
    );

    fireEvent.click(screen.getByRole("button", { name: /notificaciones/i }));
    expect(screen.getByText(/notificaciones \(1\)/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/descartar todas \(1\)/i));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to dismiss all alerts:",
      expect.any(Error),
    );

    fireEvent.mouseDown(screen.getByRole("button", { name: "outside" }));
    await waitFor(() =>
      expect(screen.queryByText(/notificaciones \(1\)/i)).not.toBeInTheDocument(),
    );
  });

  it("combines existing unread conversation messages and active communication context", () => {
    mockPathname.mockReturnValue("/dashboard/communication");
    mockSearchParamsGet.mockReturnValue("patient-2");
    mockUseConversations.mockReturnValue({
      data: [
        {
          participant: {
            id: "patient-1",
            email: "patient-1@example.com",
            firstName: "Ana",
            lastName: "Paz",
          },
          unreadCount: 1,
          messages: [
            {
              id: "m-1",
              read: false,
              receiverId: "doctor-1",
              createdAt: "2026-04-08T10:00:00.000Z",
            },
          ],
        },
        {
          participant: {
            id: "patient-2",
            email: "patient-2@example.com",
            firstName: "Eva",
            lastName: "Luz",
          },
          unreadCount: 1,
          messages: [
            {
              id: "m-2",
              read: false,
              receiverId: "doctor-1",
              createdAt: "2026-04-08T11:00:00.000Z",
            },
          ],
        },
      ],
    } as never);

    render(<NotificationDropdown />);

    fireEvent.click(screen.getByRole("button", { name: /notificaciones/i }));

    expect(screen.getByText("Ana Paz")).toBeInTheDocument();
    expect(screen.queryByText("Eva Luz")).not.toBeInTheDocument();
  });

  it("invalidates alert queries when an alert is acknowledged", () => {
    mockUseUnacknowledgedAlerts.mockReturnValue({
      data: [{ id: "alert-1" }],
      isLoading: false,
    } as never);

    render(<NotificationDropdown />);

    fireEvent.click(screen.getByRole("button", { name: /notificaciones/i }));
    fireEvent.click(screen.getByText("ack alert"));

    expect(mockInvalidateAlertQueries).toHaveBeenCalledWith(queryClient);
  });
});
