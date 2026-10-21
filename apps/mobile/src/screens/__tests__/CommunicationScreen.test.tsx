import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import mockReact from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import CommunicationScreen from "../CommunicationScreen";
import { renderMobile } from "../../../test/render-mobile";
import * as messagesHooks from "../../hooks/useMessages";
import * as authContext from "../../contexts/AuthContext";
import * as utils from "@glucosapp/utils";

const mockNavigate = jest.fn();

jest.mock("react-native", () => {
  const actual = jest.requireActual("react-native");

  return {
    ...actual,
    FlatList: ({
      data,
      renderItem,
    }: {
      data?: Array<unknown>;
      renderItem?: (args: unknown) => React.ReactNode;
    }) => (
      <>
        {data?.map((item, index) => (
          <mockReact.Fragment key={(item as { id?: string })?.id ?? index}>
            {renderItem?.({ item, index } as never)}
          </mockReact.Fragment>
        ))}
      </>
    ),
  };
});

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useFocusEffect: (callback: () => void) => {
    mockReact.useEffect(() => {
      callback();
    }, [callback]);
  },
}));

jest.mock("../../contexts/AuthContext", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../../hooks/useMessages", () => ({
  useConversationWithDoctor: jest.fn(),
  useSendMessage: jest.fn(),
  useMarkAsReadBatch: jest.fn(),
  useAssignedDoctor: jest.fn(),
}));

jest.mock("../../components/ScreenHeader", () => ({
  __esModule: true,
  default: ({ title, onBack }: { title: string; onBack?: () => void }) => (
    <div>
      <span>{title}</span>
      <button type="button" onClick={onBack}>
        back
      </button>
    </div>
  ),
}));

jest.mock("@glucosapp/utils", () => ({
  formatTimeAgo: (value: string) => `ago:${value}`,
}));

const mockUseAuth = authContext.useAuth as jest.MockedFunction<typeof authContext.useAuth>;
const mockUseConversationWithDoctor =
  messagesHooks.useConversationWithDoctor as jest.MockedFunction<
    typeof messagesHooks.useConversationWithDoctor
  >;
const mockUseSendMessage = messagesHooks.useSendMessage as jest.MockedFunction<
  typeof messagesHooks.useSendMessage
>;
const mockUseMarkAsReadBatch = messagesHooks.useMarkAsReadBatch as jest.MockedFunction<
  typeof messagesHooks.useMarkAsReadBatch
>;
const mockUseAssignedDoctor = messagesHooks.useAssignedDoctor as jest.MockedFunction<
  typeof messagesHooks.useAssignedDoctor
>;

describe("CommunicationScreen", () => {
  const sendMessageMutateAsync = jest.fn();
  const markAsReadMutate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: "patient-1" },
      signOut: jest.fn(),
    } as never);
    mockUseConversationWithDoctor.mockReturnValue({
      data: [],
      isLoading: false,
    } as never);
    mockUseSendMessage.mockReturnValue({
      mutateAsync: sendMessageMutateAsync,
      isPending: false,
    } as never);
    mockUseMarkAsReadBatch.mockReturnValue({
      mutate: markAsReadMutate,
    } as never);
    mockUseAssignedDoctor.mockReturnValue({
      data: {
        doctor: {
          id: "doctor-1",
          email: "doctor@example.com",
          firstName: "Lucía",
          lastName: "Fernández",
        },
      },
    } as never);
    sendMessageMutateAsync.mockResolvedValue(undefined);
  });

  it("shows a loading state while the conversation is resolving", () => {
    mockUseConversationWithDoctor.mockReturnValue({
      data: [],
      isLoading: true,
    } as never);

    renderMobile(<CommunicationScreen />);

    expect(screen.getByText("Comunicación")).toBeTruthy();
    expect(screen.getByTestId("activity-indicator")).toBeTruthy();
  });

  it("renders the empty state and returns to the doctor tab from the header", () => {
    renderMobile(<CommunicationScreen />);

    expect(screen.getByText("No hay mensajes aún")).toBeTruthy();
    expect(screen.getByText("Comienza una conversación enviando un mensaje")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "back" }));

    expect(mockNavigate).toHaveBeenCalledWith("MainTabs", { screen: "Médico" });
  });

  it("marks unread messages as read and sends a message to the assigned doctor", async () => {
    mockUseConversationWithDoctor.mockReturnValue({
      data: [
        {
          id: "message-1",
          senderId: "doctor-1",
          receiverId: "patient-1",
          content: "Revisa tu glucosa",
          createdAt: "2026-04-10T10:00:00.000Z",
          read: false,
          sender: {
            id: "doctor-1",
            email: "doctor@example.com",
            firstName: "Lucía",
            lastName: "Fernández",
          },
        },
        {
          id: "message-2",
          senderId: "patient-1",
          receiverId: "doctor-1",
          content: "Ya la revisé",
          createdAt: "2026-04-10T11:00:00.000Z",
          read: true,
          sender: {
            id: "patient-1",
            email: "patient@example.com",
          },
        },
      ],
      isLoading: false,
    } as never);

    renderMobile(<CommunicationScreen />);

    expect(screen.getByText("Lucía Fernández")).toBeTruthy();
    expect(screen.getByText("Revisa tu glucosa")).toBeTruthy();
    expect(screen.getByText("Ya la revisé")).toBeTruthy();
    expect(screen.getByText("✓ Leído")).toBeTruthy();
    expect(markAsReadMutate).toHaveBeenCalledWith(["message-1"]);

    fireEvent.change(screen.getByPlaceholderText("Escribe un mensaje..."), {
      target: { value: "Gracias" },
    });

    fireEvent.click(screen.getAllByRole("button")[1]);

    await waitFor(() => {
      expect(sendMessageMutateAsync).toHaveBeenCalledWith({
        receiverId: "doctor-1",
        content: "Gracias",
      });
    });

    await waitFor(() => {
      expect((screen.getByPlaceholderText("Escribe un mensaje...") as HTMLInputElement).value).toBe(
        "",
      );
    });
  });
});
