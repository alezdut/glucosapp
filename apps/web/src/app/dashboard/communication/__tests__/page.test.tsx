"use client";

import { fireEvent, render, screen } from "@testing-library/react";
import CommunicationPage from "../page";
import { useAuth } from "@/contexts/auth-context";
import { useConversations, useNewMessageNotifications } from "@/hooks/useMessages";

jest.mock("@/contexts/auth-context", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/hooks/useMessages", () => ({
  useConversations: jest.fn(),
  useNewMessageNotifications: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useSearchParams: jest.fn(() => ({
    get: jest.fn(() => null),
  })),
}));

jest.mock("next/image", () => ({
  __esModule: true,
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} alt={props.alt} />,
}));

jest.mock("@/components/protected-route", () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/components/dashboard/Sidebar", () => ({
  Sidebar: () => <div>Sidebar</div>,
}));

jest.mock("@/components/dashboard/Header", () => ({
  Header: () => <div>Header</div>,
}));

jest.mock("@/components/dashboard/PatientChat", () => ({
  PatientChat: ({ patientId }: { patientId?: string }) => <div>Chat {patientId ?? "doctor"}</div>,
}));

jest.mock("@/components/dashboard/MessageNotificationCard", () => ({
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
      <button onClick={onRead}>read notification</button>
      <button onClick={onDismiss}>dismiss notification</button>
    </div>
  ),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseConversations = useConversations as jest.MockedFunction<typeof useConversations>;
const mockUseNewMessageNotifications = useNewMessageNotifications as jest.MockedFunction<
  typeof useNewMessageNotifications
>;

describe("CommunicationPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: "doctor-1", email: "doctor@example.com" },
    } as never);
    mockUseNewMessageNotifications.mockReturnValue({
      notifications: [],
      clearNotification: jest.fn(),
    } as never);
  });

  it("renders loading and empty conversation states", () => {
    mockUseConversations.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
    } as never);

    const { rerender } = render(<CommunicationPage />);
    expect(screen.getByText(/cargando conversaciones/i)).toBeInTheDocument();

    mockUseConversations.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as never);
    rerender(<CommunicationPage />);

    expect(screen.getAllByText(/no hay pacientes asignados/i)[0]).toBeInTheDocument();
  });

  it("renders notifications, conversations and opens a selected chat", () => {
    const clearNotification = jest.fn();
    mockUseConversations.mockReturnValue({
      data: [
        {
          participant: {
            id: "patient-1",
            email: "patient@example.com",
            firstName: "Ana",
            lastName: "Paz",
          },
          unreadCount: 2,
          lastMessageAt: "2026-04-08T10:00:00.000Z",
        },
      ],
      isLoading: false,
      error: null,
    } as never);
    mockUseNewMessageNotifications.mockReturnValue({
      notifications: [
        {
          patientId: "patient-1",
          patientName: "Ana Paz",
          messageCount: 2,
          latestMessage: {
            id: "m-1",
            content: "Hola doctor",
            createdAt: "2026-04-08T10:00:00.000Z",
          },
        },
      ],
      clearNotification,
    } as never);

    render(<CommunicationPage />);

    expect(screen.getAllByText("Ana Paz")).toHaveLength(2);
    expect(screen.getByText("2")).toBeInTheDocument();

    fireEvent.click(screen.getByText("read notification"));
    expect(clearNotification).toHaveBeenCalledWith("patient-1");

    fireEvent.click(screen.getByRole("button", { name: /ana paz/i }));
    expect(screen.getByText("Chat patient-1")).toBeInTheDocument();
  });

  it("shows conversation errors", () => {
    mockUseConversations.mockReturnValue({
      data: [],
      isLoading: false,
      error: new Error("socket down"),
    } as never);

    render(<CommunicationPage />);

    expect(screen.getByText(/error al cargar conversaciones/i)).toBeInTheDocument();
    expect(screen.getByText(/socket down/i)).toBeInTheDocument();
  });
});
