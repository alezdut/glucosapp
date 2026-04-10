import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
const mockIo = jest.fn();

jest.mock("socket.io-client", () => ({
  io: (...args: unknown[]) => mockIo(...args),
}));

import * as socketClient from "../socket-client";

describe("mobile socket-client", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    socketClient.disconnectSocket();
  });

  it("returns null without a token and reuses sockets with the same token", async () => {
    const socket = {
      connected: true,
      io: { opts: { query: { token: "token-1" } } },
      on: jest.fn(),
      off: jest.fn(),
      removeAllListeners: jest.fn(),
      disconnect: jest.fn(),
    };
    mockIo.mockReturnValue(socket);

    expect(socketClient.getSocket(null)).toBeNull();
    expect(socketClient.getSocket("token-1")).toBe(socket);
    expect(socketClient.getSocket("token-1")).toBe(socket);
  });

  it("recreates and disconnects sockets when the token changes", async () => {
    const firstSocket = {
      connected: true,
      io: { opts: { query: { token: "token-1" } } },
      on: jest.fn(),
      off: jest.fn(),
      removeAllListeners: jest.fn(),
      disconnect: jest.fn(),
    };
    const secondSocket = {
      connected: false,
      io: { opts: { query: { token: "token-2" } } },
      on: jest.fn(),
      off: jest.fn(),
      removeAllListeners: jest.fn(),
      disconnect: jest.fn(),
    };
    mockIo.mockReturnValueOnce(firstSocket).mockReturnValueOnce(secondSocket);

    socketClient.getSocket("token-1");
    expect(socketClient.getSocket("token-2")).toBe(secondSocket);
    socketClient.disconnectSocket();

    expect(firstSocket.disconnect).toHaveBeenCalled();
    expect(firstSocket.removeAllListeners).toHaveBeenCalled();
    expect(secondSocket.disconnect).toHaveBeenCalled();
  });
});
