"use client";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { act } from "@testing-library/react";
import { useAuth } from "@/contexts/auth-context";
import { usePatientDetails } from "@/hooks/usePatients";
import { useConversation, useMarkAsRead, useSendMessage } from "@/hooks/useMessages";
import { useSocket } from "@/hooks/useSocket";
import { PatientChat } from "../PatientChat";

jest.mock("@/contexts/auth-context", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/hooks/usePatients", () => ({
  usePatientDetails: jest.fn(),
}));

jest.mock("@/hooks/useMessages", () => ({
  useConversation: jest.fn(),
  useSendMessage: jest.fn(),
  useMarkAsRead: jest.fn(),
}));

jest.mock("@/hooks/useSocket", () => ({
  useSocket: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUsePatientDetails = usePatientDetails as jest.MockedFunction<typeof usePatientDetails>;
const mockUseConversation = useConversation as jest.MockedFunction<typeof useConversation>;
const mockUseSendMessage = useSendMessage as jest.MockedFunction<typeof useSendMessage>;
const mockUseMarkAsRead = useMarkAsRead as jest.MockedFunction<typeof useMarkAsRead>;
const mockUseSocket = useSocket as jest.MockedFunction<typeof useSocket>;

describe("PatientChat", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    Element.prototype.scrollIntoView = jest.fn();

    mockUseAuth.mockReturnValue({
      user: { id: "doctor-1" },
      isLoading: false,
      isAuthenticated: true,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      refreshUser: jest.fn(),
    } as never);
    mockUsePatientDetails.mockReturnValue({
      data: { firstName: "Ana", lastName: "Paz", email: "ana@example.com" },
    } as never);
    mockUseConversation.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as never);
    mockUseSendMessage.mockReturnValue({
      mutateAsync: jest.fn().mockResolvedValue({}),
      isPending: false,
    } as never);
    mockUseMarkAsRead.mockReturnValue({
      mutate: jest.fn(),
    } as never);
    mockUseSocket.mockReturnValue({
      connectionState: "connected",
    } as never);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("shows the empty state when no patient is selected", () => {
    render(<PatientChat />);

    expect(screen.getByText(/selecciona una conversación/i)).toBeInTheDocument();
    expect(screen.getByText(/elige un paciente de la lista/i)).toBeInTheDocument();
  });

  it("shows loading and error states", () => {
    mockUseConversation.mockReturnValueOnce({
      data: [],
      isLoading: true,
      error: null,
    } as never);

    const { rerender } = render(<PatientChat patientId="patient-1" />);
    expect(screen.getByRole("heading", { name: /mensajes/i })).toBeInTheDocument();

    mockUseConversation.mockReturnValueOnce({
      data: [],
      isLoading: false,
      error: new Error("403 Forbidden"),
    } as never);
    rerender(<PatientChat patientId="patient-1" />);
    expect(screen.getByText(/no tienes permiso para ver esta conversación/i)).toBeInTheDocument();

    mockUseConversation.mockReturnValueOnce({
      data: [],
      isLoading: false,
      error: new Error("404 Not found"),
    } as never);
    rerender(<PatientChat patientId="patient-1" />);
    expect(screen.getByText(/no se encontró la conversación/i)).toBeInTheDocument();

    mockUseConversation.mockReturnValueOnce({
      data: [],
      isLoading: false,
      error: new Error("backend down"),
    } as never);
    rerender(<PatientChat patientId="patient-1" />);
    expect(screen.getByText(/error al cargar mensajes/i)).toBeInTheDocument();
    expect(screen.getByText("backend down")).toBeInTheDocument();
  });

  it("renders messages, marks unread ones as read and sends new messages", async () => {
    const mutateAsync = jest.fn().mockResolvedValue({});
    const markAsRead = jest.fn();

    mockUseConversation.mockReturnValue({
      data: [
        {
          id: "msg-1",
          senderId: "patient-1",
          receiverId: "doctor-1",
          content: "Hola doctora",
          read: false,
          createdAt: "2026-04-08T10:00:00.000Z",
          sender: { email: "ana@example.com", firstName: "Ana", lastName: "Paz" },
          receiver: { email: "doctor@example.com" },
        },
        {
          id: "msg-2",
          senderId: "doctor-1",
          receiverId: "patient-1",
          content: "Todo bien",
          read: true,
          createdAt: "2026-04-08T10:05:00.000Z",
          sender: { email: "doctor@example.com" },
          receiver: { email: "ana@example.com" },
        },
      ],
      isLoading: false,
      error: null,
    } as never);
    mockUseSendMessage.mockReturnValue({
      mutateAsync,
      isPending: false,
    } as never);
    mockUseMarkAsRead.mockReturnValue({
      mutate: markAsRead,
    } as never);

    render(<PatientChat patientId="patient-1" />);
    act(() => {
      jest.advanceTimersByTime(250);
    });

    expect(screen.getByText(/mensajes - ana paz/i)).toBeInTheDocument();
    expect(screen.getByText("Hola doctora")).toBeInTheDocument();
    expect(screen.getByText("Todo bien")).toBeInTheDocument();
    expect(screen.getByText("Ana Paz")).toBeInTheDocument();
    expect(screen.getByText(/✓ leído/i)).toBeInTheDocument();

    await waitFor(() => expect(markAsRead).toHaveBeenCalledWith("msg-1"));

    const textarea = screen.getByPlaceholderText(/escribe un mensaje/i);
    fireEvent.change(textarea, { target: { value: " Nuevo mensaje " } });
    fireEvent.click(screen.getByRole("button", { name: /enviar/i }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        receiverId: "patient-1",
        content: "Nuevo mensaje",
      }),
    );
    await waitFor(() => expect((textarea as HTMLTextAreaElement).value).toBe(""));
  });

  it("supports enter-to-send, disables while pending and handles send failures", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const mutateAsync = jest.fn().mockRejectedValue(new Error("send failed"));

    mockUseConversation.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as never);
    mockUseSendMessage.mockReturnValue({
      mutateAsync,
      isPending: true,
    } as never);

    const { rerender } = render(<PatientChat patientId="patient-1" />);
    const disabledButton = screen.getByRole("button", { name: /enviar/i });
    expect(disabledButton).toBeDisabled();
    expect(screen.getByPlaceholderText(/escribe un mensaje/i)).toBeDisabled();

    mockUseSendMessage.mockReturnValue({
      mutateAsync,
      isPending: false,
    } as never);
    rerender(<PatientChat patientId="patient-1" />);

    const textarea = screen.getByPlaceholderText(/escribe un mensaje/i);
    fireEvent.change(textarea, { target: { value: "Hola por enter" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false, preventDefault: jest.fn() });

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    expect(consoleSpy).toHaveBeenCalledWith("Error sending message:", expect.any(Error));

    consoleSpy.mockRestore();
  });

  it("shows the no-messages state for an empty conversation", () => {
    render(<PatientChat patientId="patient-1" />);

    expect(screen.getByText(/no hay mensajes aún/i)).toBeInTheDocument();
    expect(screen.getByText(/comienza una conversación enviando un mensaje/i)).toBeInTheDocument();
  });
});
