const mockIo = jest.fn();

jest.mock("socket.io-client", () => ({
  io: (...args: unknown[]) => mockIo(...args),
}));

describe("web socket-client", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("reuses the same socket for the same token and recreates it when the token changes", async () => {
    const firstSocket = {
      connected: true,
      io: { opts: { query: { token: "token-1" }, reconnection: true } },
      on: jest.fn(),
      off: jest.fn(),
      removeAllListeners: jest.fn(),
      disconnect: jest.fn(),
      connect: jest.fn(),
    };
    const secondSocket = {
      connected: false,
      io: { opts: { query: { token: "token-2" }, reconnection: true } },
      on: jest.fn(),
      off: jest.fn(),
      removeAllListeners: jest.fn(),
      disconnect: jest.fn(),
      connect: jest.fn(),
    };
    mockIo.mockReturnValueOnce(firstSocket).mockReturnValueOnce(secondSocket);

    const socketClient = await import("../socket-client");

    expect(socketClient.getSocket("token-1")).toBe(firstSocket);
    expect(socketClient.getSocket("token-1")).toBe(firstSocket);
    expect(socketClient.getSocket("token-2")).toBe(secondSocket);
    expect(firstSocket.removeAllListeners).toHaveBeenCalled();
    expect(firstSocket.disconnect).toHaveBeenCalled();
  });

  it("disconnects and clears the singleton when requested", async () => {
    const socket = {
      connected: true,
      io: { opts: { query: { token: "token-1" }, reconnection: true } },
      on: jest.fn(),
      off: jest.fn(),
      removeAllListeners: jest.fn(),
      disconnect: jest.fn(),
      connect: jest.fn(),
    };
    mockIo.mockReturnValue(socket);
    const socketClient = await import("../socket-client");

    socketClient.getSocket("token-1");
    expect(socketClient.isSocketConnected()).toBe(true);

    socketClient.disconnectSocket();

    expect(socket.removeAllListeners).toHaveBeenCalled();
    expect(socket.disconnect).toHaveBeenCalled();
    expect(socketClient.isSocketConnected()).toBe(false);
  });

  it("disconnects an existing socket when called without a token", async () => {
    const socket = {
      connected: true,
      io: { opts: { query: { token: "token-1" }, reconnection: true } },
      on: jest.fn(),
      off: jest.fn(),
      removeAllListeners: jest.fn(),
      disconnect: jest.fn(),
      connect: jest.fn(),
    };
    mockIo.mockReturnValue(socket);
    const socketClient = await import("../socket-client");

    socketClient.getSocket("token-1");

    expect(socketClient.getSocket(null)).toBeNull();
    expect(socket.disconnect).toHaveBeenCalled();
  });

  it("disables reconnection when the server reports an auth-related connection error", async () => {
    const listeners: Record<string, (arg: unknown) => void> = {};
    const socket = {
      connected: true,
      io: { opts: { query: { token: "token-1" }, reconnection: true } },
      on: jest.fn((event: string, handler: (arg: unknown) => void) => {
        listeners[event] = handler;
      }),
      off: jest.fn(),
      removeAllListeners: jest.fn(),
      disconnect: jest.fn(),
      connect: jest.fn(),
    };
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    mockIo.mockReturnValue(socket);
    const socketClient = await import("../socket-client");

    socketClient.getSocket("token-1");
    listeners.connect_error({ message: "jwt expired" });

    expect(socket.io.opts.reconnection).toBe(false);
    expect(socket.disconnect).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith("Socket connection error:", "jwt expired");
  });
});
