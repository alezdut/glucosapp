import { useAuth } from "@/contexts/auth-context";
import { useConversation, useConversations } from "../useMessages";
import { useUnreadMessages } from "../useUnreadMessages";
import { renderHook } from "@testing-library/react";

jest.mock("@/contexts/auth-context", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../useMessages", () => ({
  useConversations: jest.fn(),
  useConversation: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseConversations = useConversations as jest.MockedFunction<typeof useConversations>;
const mockUseConversation = useConversation as jest.MockedFunction<typeof useConversation>;

describe("useUnreadMessages", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("aggregates unread doctor messages across conversations", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "doctor-1", role: "DOCTOR" },
    } as never);
    mockUseConversation.mockReturnValue({ data: [] } as never);
    mockUseConversations.mockReturnValue({
      data: [
        {
          unreadCount: 1,
          participant: {
            id: "patient-1",
            email: "patient@example.com",
            firstName: "Ana",
            lastName: "Paz",
          },
          messages: [
            {
              id: "m-1",
              read: false,
              receiverId: "doctor-1",
              senderId: "patient-1",
              createdAt: "2026-04-08T10:00:00.000Z",
            },
          ],
        },
      ],
    } as never);

    const { result } = renderHook(() => useUnreadMessages());

    expect(result.current.data).toEqual([
      expect.objectContaining({
        id: "m-1",
        participantId: "patient-1",
        participantName: "Ana Paz",
      }),
    ]);
  });

  it("returns unread patient messages from the active conversation", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "patient-1", role: "PATIENT" },
    } as never);
    mockUseConversations.mockReturnValue({ data: [] } as never);
    mockUseConversation.mockReturnValue({
      data: [
        {
          id: "m-2",
          read: false,
          receiverId: "patient-1",
          senderId: "doctor-1",
          createdAt: "2026-04-08T10:00:00.000Z",
          sender: {
            firstName: "Ada",
            lastName: "Lovelace",
            email: "doctor@example.com",
          },
        },
      ],
    } as never);

    const { result } = renderHook(() => useUnreadMessages(5));

    expect(result.current.data).toEqual([
      expect.objectContaining({
        id: "m-2",
        participantId: "doctor-1",
        participantName: "Ada Lovelace",
      }),
    ]);
  });
});
